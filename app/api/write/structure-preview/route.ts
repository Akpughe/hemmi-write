import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { aiService, AIProvider, AIService } from "@/lib/services/aiService";
import { tokenService } from "@/lib/services/tokenService";
import { deductTokens } from "@/lib/middleware/tokenMiddleware";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { projectId, sections, sources, topic } = await request.json();

    if (!sections || !sources || !topic) {
      return NextResponse.json(
        { error: "sections, sources, and topic are required" },
        { status: 400 }
      );
    }

    // Determine provider
    const balance = await tokenService.getUserTokenBalance(user.id);
    const planType = balance.subscription?.planType || "free";
    const provider = AIService.getEffectiveProvider(
      AIProvider.OPENAI,
      planType,
      "source_analysis"
    );

    const sectionsText = sections
      .map(
        (s: any, i: number) =>
          `Section ${i + 1}: "${s.heading}"\nKey points: ${(s.keyPoints || []).join(", ")}\nDescription: ${s.description || "N/A"}\nTarget words: ${s.estimatedWordCount || "N/A"}`
      )
      .join("\n\n");

    const sourcesText = sources
      .map(
        (s: any, i: number) =>
          `Source ${i + 1}: "${s.title}" by ${s.author || "Unknown"}${s.publishedDate ? ` (${new Date(s.publishedDate).getFullYear()})` : ""}\nExcerpt: ${(s.excerpt || "").substring(0, 300)}`
      )
      .join("\n\n");

    const systemMessage =
      "You are an academic research planning assistant. Return ONLY valid JSON, no markdown fences or extra text.";

    const userMessage = `Generate a detailed section-by-section preview for a research paper on "${topic}".

For EACH section, provide:
1. A detailed description (2-3 sentences) of what will be covered
2. Subsections with brief descriptions of what each will argue/present
3. Which references (from the provided sources) will be used in this section, and WHY each reference is relevant

SECTIONS:
${sectionsText}

AVAILABLE SOURCES:
${sourcesText}

Return JSON array matching this schema:
[
  {
    "sectionHeading": "Chapter 1: Introduction",
    "detailedDescription": "This chapter will establish the research context by...",
    "subsections": [
      { "title": "1.1 Background of the Study", "description": "Provides historical context on..." }
    ],
    "references": [
      { "title": "Source title", "author": "Author Name", "year": "2024", "reason": "Provides foundational evidence for the research problem discussed in 1.1" }
    ]
  }
]

CRITICAL RULES:
- Use ONLY the sources listed above. Do NOT invent or hallucinate references that are not in the provided list.
- Every section MUST have at least 2-3 references mapped to it (except Abstract)
- Every reference MUST have a specific "reason" explaining WHY it belongs in that section
- Subsection descriptions should explain what argument/evidence will be presented, grounded in what the provided sources actually say
- Map sources across sections — a source can appear in multiple sections for different reasons
- Be specific in reasons — reference specific subsections (e.g., "supports the argument in 1.2 that...")
- The "title" and "author" in references MUST match exactly from the AVAILABLE SOURCES list above`;

    console.log("[StructurePreview API] Calling LLM with provider:", provider, "sections:", sections.length, "sources:", sources.length);

    const response = await aiService.getChatCompletion(
      provider,
      [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      0.4,
      8000 // Increased from 4000 — 7 sections with references needs more room
    );

    console.log("[StructurePreview API] LLM response length:", response.length);

    // Parse JSON — handle various LLM response quirks
    let jsonStr = response
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Try to fix truncated JSON (if the response was cut off)
    if (!jsonStr.endsWith("]")) {
      // Find the last complete object
      const lastCompleteObj = jsonStr.lastIndexOf("}");
      if (lastCompleteObj > 0) {
        jsonStr = jsonStr.substring(0, lastCompleteObj + 1) + "]";
        console.warn("[StructurePreview API] JSON appeared truncated, attempted repair");
      }
    }

    let sectionDetails;
    try {
      sectionDetails = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[StructurePreview API] JSON parse failed:", parseError);
      console.error("[StructurePreview API] Raw response (first 500 chars):", response.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse LLM response as JSON" },
        { status: 502 }
      );
    }

    console.log("[StructurePreview API] Parsed", sectionDetails.length, "section details");

    // Deduct tokens
    const tokensUsed = Math.ceil(response.length * 1.33) + 500;
    await deductTokens(user.id, tokensUsed, "source_analysis", {
      projectId,
      operation: "structure_preview",
    });

    return NextResponse.json({ sectionDetails });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[StructurePreview] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate preview" },
      { status: 500 }
    );
  }
}
