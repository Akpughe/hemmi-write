import { NextRequest, NextResponse } from "next/server";
import { aiService, AIProvider, AIService } from "@/lib/services/aiService";
import { tokenService } from "@/lib/services/tokenService";
import {
  createServerSupabaseClient,
  getCurrentUser,
  requireAuth,
} from "@/lib/supabase/server";
import {
  needsResearch,
  researchChatQuestion,
  formatCitationsForPrompt,
} from "@/lib/services/chatResearch";
import { ChatCitation } from "@/lib/types/chat";
import { checkTokenBalance, deductTokens, estimateChatTokens, MIN_TOKENS } from "@/lib/middleware/tokenMiddleware";
import { getSmartContext } from "@/lib/utils/contextSelector";

interface ChatSource {
  title: string;
  snippet: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// SSE helper function
function formatSSEEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    // AUTHENTICATE USER
    const user = await requireAuth();

    const { messages, brief, sources, currentContent, projectId } =
      await req.json();

    // Determine user plan for model routing
    const balance = await tokenService.getUserTokenBalance(user.id);
    const planType = balance.subscription?.planType || 'free';
    const chatProvider = AIService.getEffectiveProvider(AIProvider.ANTHROPIC, planType, 'chat');

    // Get last user message (the one we're responding to)
    const userMessages = messages.filter((m: ChatMessage) => m.role === "user");
    const lastUserMessage = userMessages[userMessages.length - 1];
    const userQuestion = lastUserMessage?.content || "";

    // ESTIMATE TOKEN USAGE
    const willNeedResearch = needsResearch(userQuestion);
    const estimatedTokens = estimateChatTokens({
      messageLength: userQuestion.length,
      historyLength: messages.length,
      hasResearch: willNeedResearch,
    });

    console.log(`[Chat] Estimated tokens: ${estimatedTokens}, Research needed: ${willNeedResearch}`);

    // CHECK TOKEN BALANCE (minimum required to start, not full estimate)
    const tokenCheckError = await checkTokenBalance(user.id, estimatedTokens, MIN_TOKENS.CHAT);
    if (tokenCheckError) {
      console.log(`[Chat] ❌ BLOCKED - Below minimum tokens (${MIN_TOKENS.CHAT})`);
      return tokenCheckError;
    }

    console.log(`[Chat] ✅ Token check passed`);

    // Save user message to database if projectId provided
    if (projectId && lastUserMessage) {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const supabase = await createServerSupabaseClient();
          await supabase.from("chat_messages").insert({
            project_id: projectId,
            role: "user",
            content: lastUserMessage.content,
            context: { brief, hasCurrentContent: !!currentContent },
          });
        }
      } catch (dbError) {
        console.error("Failed to save user message:", dbError);
      }
    }

    // Smart research: Only search Perplexity if question needs factual info
    let citations: ChatCitation[] = [];
    let researchContext = "";

    if (needsResearch(userQuestion)) {
      console.log("Chat question needs research, searching Perplexity...");

      citations = await researchChatQuestion(userQuestion, {
        topic: brief.topic,
        documentType: brief.documentType,
        academicLevel: brief.academicLevel,
        writingStyle: brief.writingStyle,
      });

      if (citations.length > 0) {
        researchContext = formatCitationsForPrompt(citations);
        console.log(`Found ${citations.length} citations for response`);
      }
    } else {
      console.log("Chat question does not need research");
    }

    // Get smart context from document content
    let documentContext = "";
    let selectedSectionsInfo = "";
    if (currentContent && currentContent.length > 100) {
      const smartContext = getSmartContext(currentContent, userQuestion, 6000);
      documentContext = smartContext.context;
      selectedSectionsInfo = smartContext.selectionReason;
      console.log(`[Chat] ${selectedSectionsInfo}`);
    }

    // Build system prompt with optional research context
    const citationInstructions =
      citations.length > 0
        ? `\n\nCITATION INSTRUCTIONS:
- Use inline citations like [1], [2] when referencing information from the research sources.
- Only cite when you're using specific facts or claims from a source.
- Place citations immediately after the relevant statement.
- You don't need to cite every sentence - only when referencing external information.`
        : "";

    const systemPrompt = `You are Hemmi, an intelligent writing assistant for the Hemmi platform.

CONTEXT:
- Topic: ${brief.topic}
- Document Type: ${brief.documentType}
- Academic Level: ${brief.academicLevel}
- Writing Style: ${brief.writingStyle}

EXISTING SOURCES (from document research):
${sources.map((s: ChatSource) => `- ${s.title}: ${s.snippet}`).join("\n")}
${researchContext}
${citationInstructions}

${documentContext}

INSTRUCTIONS:
- Answer the user's questions based on the provided sources and context.
- Keep responses concise and helpful.
- You can help with research, planning, and writing.
- If asked to write a section, use the specified writing style.

SECTION REFERENCE INSTRUCTIONS:
When referring to specific parts of the user's document, use this exact format:
"Section: Section Name" (e.g., "Section: Introduction" or "Section: 3.2 Methods")
This helps the user navigate to that part of their document.

`;

    // Prepare messages for AI service
    const aiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m: ChatMessage) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    // Create streaming response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Send citations first if they exist
        if (citations.length > 0) {
          controller.enqueue(
            encoder.encode(formatSSEEvent("citations", { citations }))
          );
        }

        let fullContent = "";
        let tokensUsed = 0;

        try {
          // Stream from AI service (free users get GPT-5-mini, paid users get Claude)
          const streamGenerator = aiService.streamChatCompletion(
            chatProvider,
            aiMessages,
            0.7,
            4000
          );

          for await (const chunk of streamGenerator) {
            if (chunk.content) {
              fullContent += chunk.content;
              controller.enqueue(
                encoder.encode(formatSSEEvent("token", { content: chunk.content }))
              );
            }

            if (chunk.done) {
              tokensUsed = chunk.tokensUsed || Math.ceil(fullContent.length / 4);
              controller.enqueue(
                encoder.encode(formatSSEEvent("done", { 
                  tokensUsed,
                  truncated: chunk.truncated 
                }))
              );
            }
          }

          // DEDUCT TOKENS after successful chat response
          const deductSuccess = await deductTokens(user.id, estimatedTokens, 'chat', {
            projectId,
            messageLength: userQuestion.length,
            responseLength: fullContent.length,
            historyLength: messages.length,
            hasCitations: citations.length > 0,
            estimatedTokens,
            actualTokens: tokensUsed,
          });

          if (!deductSuccess) {
            console.error(`[Chat] ⚠️  Failed to deduct tokens (${estimatedTokens}), but response was generated`);
          } else {
            console.log(`[Chat] ✅ Deducted ${estimatedTokens} tokens`);
          }

          // Save assistant response to database if projectId provided
          if (projectId && fullContent) {
            try {
              const currentUser = await getCurrentUser();
              if (currentUser) {
                const supabase = await createServerSupabaseClient();
                await supabase.from("chat_messages").insert({
                  project_id: projectId,
                  role: "assistant",
                  content: fullContent,
                  context:
                    citations.length > 0
                      ? { citations: JSON.parse(JSON.stringify(citations)) }
                      : null,
                });
              }
            } catch (dbError) {
              console.error("Failed to save assistant message:", dbError);
            }
          }

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(formatSSEEvent("error", { 
              message: error instanceof Error ? error.message : "Streaming failed" 
            }))
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat
 * Load chat history for a project
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load chat history:", error);
      return NextResponse.json(
        { error: "Failed to load chat history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        citations: (m.context as any)?.citations || undefined,
      })),
    });
  } catch (error) {
    console.error("Chat GET error:", error);
    return NextResponse.json(
      { error: "Failed to load chat history" },
      { status: 500 }
    );
  }
}
