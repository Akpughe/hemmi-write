import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { getCompactHumanizationGuidance } from "@/lib/config/humanizationGuidelines";
import { AcademicLevel } from "@/lib/types/document";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";
import {
  needsResearch,
  researchChatQuestion,
  formatCitationsForPrompt,
} from "@/lib/services/chatResearch";
import { ChatCitation } from "@/lib/types/chat";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

interface ChatSource {
  title: string;
  snippet: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, brief, sources, currentContent, projectId } = await req.json();

    // Get last user message (the one we're responding to)
    const userMessages = messages.filter((m: ChatMessage) => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    const userQuestion = lastUserMessage?.content || "";

    // Save user message to database if projectId provided
    if (projectId && lastUserMessage) {
      try {
        const user = await getCurrentUser();
        if (user) {
          const supabase = await createServerSupabaseClient();
          await supabase
            .from('chat_messages')
            .insert({
              project_id: projectId,
              role: 'user',
              content: lastUserMessage.content,
              context: { brief, hasCurrentContent: !!currentContent },
            });
        }
      } catch (dbError) {
        console.error('Failed to save user message:', dbError);
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

    // Build system prompt with optional research context
    const citationInstructions = citations.length > 0
      ? `\n\nCITATION INSTRUCTIONS:
- Use inline citations like [1], [2] when referencing information from the research sources.
- Only cite when you're using specific facts or claims from a source.
- Place citations immediately after the relevant statement.
- You don't need to cite every sentence - only when referencing external information.`
      : "";

    const systemPrompt = `You are Hemmi, an intelligent writing assistant for the Write Nuton platform.

CONTEXT:
- Topic: ${brief.topic}
- Document Type: ${brief.documentType}
- Academic Level: ${brief.academicLevel}
- Writing Style: ${brief.writingStyle}

EXISTING SOURCES (from document research):
${sources.map((s: ChatSource) => `- ${s.title}: ${s.snippet}`).join("\n")}
${researchContext}
${citationInstructions}

INSTRUCTIONS:
- Answer the user's questions based on the provided sources and context.
- Keep responses concise and helpful.
- You can help with research, planning, and writing.
- If asked to write a section, use the specified writing style.

${getCompactHumanizationGuidance(brief.academicLevel || AcademicLevel.UNDERGRADUATE)}
`;

    const result = await generateText({
      model: groq("openai/gpt-oss-120b"),
      system: systemPrompt,
      messages,
    });

    // Save assistant response to database if projectId provided
    if (projectId && result.text) {
      try {
        const user = await getCurrentUser();
        if (user) {
          const supabase = await createServerSupabaseClient();
          await supabase
            .from('chat_messages')
            .insert({
              project_id: projectId,
              role: 'assistant',
              content: result.text,
              context: citations.length > 0 ? { citations: JSON.parse(JSON.stringify(citations)) } : null,
            });
        }
      } catch (dbError) {
        console.error('Failed to save assistant message:', dbError);
      }
    }

    return NextResponse.json({
      role: "assistant",
      content: result.text,
      citations: citations.length > 0 ? citations : undefined,
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
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load chat history:', error);
      return NextResponse.json(
        { error: 'Failed to load chat history' },
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
