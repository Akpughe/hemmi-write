import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ImpactAnalysisResult {
  sectionId: string;
  sectionTitle: string;
  relevanceScore: number; // 0-1
  reasoning: string;
  recommended: boolean;
}

export interface AnalyzeSourceImpactRequest {
  projectId: string;
  sourceId: string;
  documentType: string;
  topic: string;
  currentStructure: {
    sections: Array<{
      id: string;
      title: string;
      description?: string;
      keyPoints: string[];
    }>;
  };
}

export interface AnalyzeSourceImpactResponse {
  sourceTitle: string;
  analysis: ImpactAnalysisResult[];
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeSourceImpactRequest = await request.json();
    const { projectId, sourceId, documentType, topic, currentStructure } = body;

    if (!projectId || !sourceId || !currentStructure) {
      return NextResponse.json(
        { error: "projectId, sourceId, and currentStructure are required" },
        { status: 400 }
      );
    }

    // Fetch source from database
    const supabase = await createServerSupabaseClient();
    const { data: source, error: sourceError } = await supabase
      .from("research_sources")
      .select("title, excerpt, full_content")
      .eq("id", sourceId)
      .eq("project_id", projectId)
      .single();

    if (sourceError || !source) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    // Use full_content if available, otherwise excerpt
    const sourceContent = source.full_content || source.excerpt || "";

    if (!sourceContent) {
      return NextResponse.json({
        sourceTitle: source.title,
        analysis: currentStructure.sections.map((section) => ({
          sectionId: section.id,
          sectionTitle: section.title,
          relevanceScore: 0.1,
          reasoning:
            "Limited analysis - source content unavailable. Manual review recommended.",
          recommended: false,
        })),
      });
    }

    // Build sections description for AI
    const sectionsDescription = currentStructure.sections
      .map(
        (s, i) =>
          `${i + 1}. ${s.title}
   Description: ${s.description || "N/A"}
   Key Points: ${s.keyPoints.join(", ")}`
      )
      .join("\n\n");

    // AI prompt for relevance analysis
    const analysisPrompt = `You are analyzing how relevant a new research source is to each section of a ${documentType} document.

NEW SOURCE:
Title: ${source.title}
Content: ${sourceContent.substring(0, 3000)} ${sourceContent.length > 3000 ? "..." : ""}

DOCUMENT TOPIC: ${topic}

DOCUMENT SECTIONS:
${sectionsDescription}

TASK:
For each section, determine:
1. Relevance score (0-1): How relevant is the new source to this section?
2. Reasoning: Brief explanation (1-2 sentences) of why it's relevant or not
3. Recommended: Should this section be regenerated to include the new source?

SCORING GUIDELINES:
- 0.8-1.0: Highly relevant, contains key information for this section
- 0.6-0.79: Moderately relevant, adds supporting details
- 0.4-0.59: Somewhat relevant, minor connection
- 0.0-0.39: Not relevant

Recommend regeneration (recommended: true) if score >= 0.6.

Return a valid JSON array with this exact structure:
[
  {
    "sectionId": "section-0",
    "sectionTitle": "Introduction",
    "relevanceScore": 0.85,
    "reasoning": "This source provides key background data on...",
    "recommended": true
  }
]

Return ONLY valid JSON array, no markdown code blocks, no additional text.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an expert at analyzing research source relevance. Return only valid JSON arrays without markdown formatting.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0.3,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    // Clean up response and parse JSON
    let analysis: ImpactAnalysisResult[];
    try {
      // Remove markdown code blocks if present
      const jsonText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      analysis = JSON.parse(jsonText);

      // Validate structure
      if (!Array.isArray(analysis)) {
        throw new Error("Response is not an array");
      }

      // Ensure all required fields exist
      analysis = analysis.map((item) => ({
        sectionId: item.sectionId || "",
        sectionTitle: item.sectionTitle || "",
        relevanceScore: Math.max(0, Math.min(1, item.relevanceScore || 0)),
        reasoning: item.reasoning || "No reasoning provided",
        recommended: item.recommended || false,
      }));
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText);
      // Fallback: return low relevance for all sections
      analysis = currentStructure.sections.map((section) => ({
        sectionId: section.id,
        sectionTitle: section.title,
        relevanceScore: 0.3,
        reasoning:
          "Analysis failed. Please manually review which sections to update.",
        recommended: false,
      }));
    }

    const response: AnalyzeSourceImpactResponse = {
      sourceTitle: source.title,
      analysis,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Source impact analysis error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to analyze source impact";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
