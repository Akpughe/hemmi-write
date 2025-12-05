import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { getCompactHumanizationGuidance } from "@/lib/config/humanizationGuidelines";
import { AcademicLevel } from "@/lib/types/document";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { text, context, brief, fullContent, sources } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert writing assistant.
    
    TASK:
    Rewrite the provided text to improve its clarity, flow, and impact, while maintaining the original meaning.
    
    CONTEXT:
    - Academic Level: ${brief?.academicLevel || "Undergraduate"}
    - Writing Style: ${brief?.writingStyle || "Academic"}
    - Immediate Context: ${context || "No specific context provided"}
    
    DOCUMENT CONTEXT:
    The user is writing a document. Here is the full content for context on flow and tone:
    """
    ${fullContent ? fullContent.substring(0, 5000) : "No full content provided"}
    """
    
    AVAILABLE SOURCES:
    Use these sources to ensure factual accuracy and add depth if relevant:
    ${sources ? sources.map((s: any) => `- ${s.title}: ${s.snippet}`).join("\n") : "No sources provided"}
    
    INSTRUCTIONS:
    - Return ONLY the improved text. Do not include explanations or conversational filler.
    - Ensure the tone matches the specified academic level and writing style.
    - Correct any grammar or spelling errors.
    - Ensure the improvement fits seamlessly into the surrounding document flow.
    - If the text makes factual claims, verify them against the provided sources if possible.
    
    ${getCompactHumanizationGuidance(brief?.academicLevel || AcademicLevel.UNDERGRADUATE)}
    `;

    const result = await generateText({
      model: groq("openai/gpt-oss-120b"),
      system: systemPrompt,
      prompt: `Original Text: "${text}"`,
    });

    return NextResponse.json({
      content: result.text,
    });
  } catch (error) {
    console.error("Improve writing error:", error);
    return NextResponse.json(
      { error: "Failed to improve text" },
      { status: 500 }
    );
  }
}
