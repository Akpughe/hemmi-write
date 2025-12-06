import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { getCompactHumanizationGuidance } from "@/lib/config/humanizationGuidelines";
import { AcademicLevel } from "@/lib/types/document";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

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

    const systemPrompt = `You are Hemmi, an intelligent writing assistant for the Write Nuton platform.
    
    CONTEXT:
    - Topic: ${brief.topic}
    - Document Type: ${brief.documentType}
    - Academic Level: ${brief.academicLevel}
    - Writing Style: ${brief.writingStyle}
    
    SOURCES:
    ${sources.map((s: ChatSource) => `- ${s.title}: ${s.snippet}`).join("\n")}
    
    INSTRUCTIONS:
    - Answer the user's questions based on the provided sources and context.
    - If the user asks for specific information from a source, cite it.
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
              context: null,
            });
        }
      } catch (dbError) {
        console.error('Failed to save assistant message:', dbError);
      }
    }

    return NextResponse.json({
      role: "assistant",
      content: result.text,
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
