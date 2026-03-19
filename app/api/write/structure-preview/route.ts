import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { aiService, AIProvider, AIService } from "@/lib/services/aiService";
import { tokenService } from "@/lib/services/tokenService";
import { deductTokens } from "@/lib/middleware/tokenMiddleware";

/**
 * Extract JSON array from LLM response that may contain markdown fences,
 * preamble text, thinking blocks, or other non-JSON content.
 */
function extractJSON(raw: string): any {
  // Strategy 1: Direct parse (clean response)
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try { return JSON.parse(trimmed); } catch {}
  }

  // Strategy 2: Strip markdown fences
  const fenceStripped = raw
    .replace(/```json?\s*\n?/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  if (fenceStripped.startsWith("[")) {
    try { return JSON.parse(fenceStripped); } catch {}
  }

  // Strategy 3: Find the JSON array in the response (between first [ and last ])
  const firstBracket = raw.indexOf("[");
  const lastBracket = raw.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const extracted = raw.substring(firstBracket, lastBracket + 1);
    try { return JSON.parse(extracted); } catch {}

    // Strategy 4: Truncated JSON — find last complete object before the end
    const lastCloseBrace = extracted.lastIndexOf("}");
    if (lastCloseBrace > 0) {
      const repaired = extracted.substring(0, lastCloseBrace + 1) + "]";
      try {
        console.warn("[extractJSON] Used truncation repair");
        return JSON.parse(repaired);
      } catch {}
    }
  }

  throw new Error("Could not extract valid JSON array from LLM response");
}

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
      1, // GPT-5-mini only supports default temperature (1)
      8000
    );

    console.log("[StructurePreview API] LLM response length:", response.length);
    console.log("[StructurePreview API] Raw response (first 300 chars):", response.substring(0, 300));

    // Extract JSON from response — handle markdown fences, thinking blocks, preamble text
    let sectionDetails;
    try {
      sectionDetails = extractJSON(response);
    } catch (parseError) {
      console.error("[StructurePreview API] JSON extraction failed:", parseError);
      console.error("[StructurePreview API] Full raw response:", response.substring(0, 1000));
      return NextResponse.json(
        { error: "Failed to parse LLM response as JSON", rawPreview: response.substring(0, 200) },
        { status: 502 }
      );
    }

    if (!Array.isArray(sectionDetails) || sectionDetails.length === 0) {
      console.error("[StructurePreview API] Parsed result is not a non-empty array");
      return NextResponse.json(
        { error: "LLM returned empty or invalid structure", rawPreview: response.substring(0, 200) },
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
