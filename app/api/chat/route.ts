import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, brief, sources, currentContent } = await req.json();

    const systemPrompt = `You are Hemmi, an intelligent writing assistant for the Write Nuton platform.
    
    CONTEXT:
    - Topic: ${brief.topic}
    - Document Type: ${brief.documentType}
    - Academic Level: ${brief.academicLevel}
    - Writing Style: ${brief.writingStyle}
    
    SOURCES:
    ${sources.map((s: any) => `- ${s.title}: ${s.snippet}`).join("\n")}
    
    INSTRUCTIONS:
    - Answer the user's questions based on the provided sources and context.
    - If the user asks for specific information from a source, cite it.
    - Keep responses concise and helpful.
    - You can help with research, planning, and writing.
    - If asked to write a section, use the specified writing style.
    `;

    const result = await generateText({
      model: groq("openai/gpt-oss-120b"),
      system: systemPrompt,
      messages,
    });

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
