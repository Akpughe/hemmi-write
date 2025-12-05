import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { text, context, fullContent, sources } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a knowledgeable tutor and research assistant.
    
    TASK:
    Explain the provided text or concept clearly and concisely.
    
    CONTEXT:
    - Selected Text: "${text}"
    - Surrounding Context: ${context || "No specific context provided"}
    
    DOCUMENT CONTEXT:
    The user is writing a document. Here is the full content to help you understand the specific usage/context of the term:
    """
    ${fullContent ? fullContent.substring(0, 5000) : "No full content provided"}
    """
    
    AVAILABLE SOURCES:
    Use these sources to provide accurate definitions or context specific to the user's research:
    ${sources ? sources.map((s: any) => `- ${s.title}: ${s.snippet}`).join("\n") : "No sources provided"}
    
    INSTRUCTIONS:
    - Provide a clear, accurate explanation.
    - Explain the concept WITHIN THE CONTEXT of the user's document and topic.
    - If it's a complex term, define it.
    - If it's a concept, explain its significance.
    - Reference the provided sources if they contain relevant information.
    - Keep the explanation concise (under 150 words) unless the topic requires more depth.
    - Do not be conversational, just provide the explanation.
    `;

    const result = await generateText({
      model: groq("openai/gpt-oss-120b"),
      system: systemPrompt,
      prompt: `Explain this: "${text}"`,
    });

    return NextResponse.json({
      content: result.text,
    });
  } catch (error) {
    console.error("Explain error:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}
