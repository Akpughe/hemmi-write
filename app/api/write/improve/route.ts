import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { AcademicLevel } from "@/lib/types/document";
import { getMinimalHumanizationHint } from "@/lib/utils/humanizationPrompt";
import { requireAuth } from "@/lib/supabase/server";
import { checkTokenBalance, deductTokens, MIN_TOKENS } from "@/lib/middleware/tokenMiddleware";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // AUTHENTICATE USER
    const user = await requireAuth();

    const { text, context, brief, fullContent, sources } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // ESTIMATE TOKEN USAGE - text improvement is lightweight
    const estimatedTokens = 800; // Small fixed cost for text improvement
    
    console.log(`[Improve] Estimated tokens: ${estimatedTokens}`);

    // CHECK TOKEN BALANCE (minimum required to start, not full estimate)
    const tokenCheckError = await checkTokenBalance(user.id, estimatedTokens, MIN_TOKENS.CHAT);
    if (tokenCheckError) {
      console.log(`[Improve] ❌ BLOCKED - Below minimum tokens (${MIN_TOKENS.CHAT})`);
      return tokenCheckError;
    }

    console.log(`[Improve] ✅ Token check passed`);

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
    
    ${getMinimalHumanizationHint()}
    `;

    const result = await generateText({
      model: groq("openai/gpt-oss-120b"),
      system: systemPrompt,
      prompt: `Original Text: "${text}"`,
    });

    // DEDUCT TOKENS after successful improvement
    const actualTokens = Math.ceil(result.text.length / 4); // Rough estimate from character count
    const deductSuccess = await deductTokens(user.id, estimatedTokens, 'generate', {
      operation: 'improve_text',
      textLength: text.length,
      improvementLength: result.text.length,
      estimatedTokens,
      actualTokens,
    });

    if (!deductSuccess) {
      console.error(`[Improve] ⚠️  Failed to deduct tokens (${estimatedTokens}), but text was improved`);
    } else {
      console.log(`[Improve] ✅ Deducted ${estimatedTokens} tokens`);
    }

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
