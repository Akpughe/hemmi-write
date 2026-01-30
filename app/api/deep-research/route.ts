// Deep Research API Endpoint
// POST /api/deep-research - Execute deep research with iterative quality loop

import { NextRequest, NextResponse } from "next/server";
import {
  DeepResearchQuerySchema,
  DeepResearchResult,
  ResearchProgressUpdate,
} from "@/lib/types/deepResearch";
import { executeDeepResearch } from "@/lib/services/deepResearchAgent";

// =============================================================================
// POST Handler - Execute Deep Research
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parseResult = DeepResearchQuerySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const query = parseResult.data;

    console.log(`[Deep Research] Starting research for: "${query.query}"`);
    console.log(`[Deep Research] Config:`, {
      maxPapers: query.maxPapers,
      maxIterations: query.maxIterations,
      targetCompleteness: query.targetCompleteness,
      requireDOI: query.requireDOI,
    });

    // Execute deep research
    const result = await executeDeepResearch(query);

    console.log(`[Deep Research] Complete:`, {
      success: result.success,
      totalPapers: result.totalReturned,
      quality: result.qualityReport.averageCompleteness,
      iterations: result.totalIterations,
      duration: `${result.totalDurationMs}ms`,
    });

    // Return result
    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error("[Deep Research] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - API Info
// =============================================================================

export async function GET() {
  return NextResponse.json({
    name: "Deep Research API",
    version: "1.0.0",
    description: "Academic paper discovery with iterative quality enhancement",
    endpoints: {
      POST: {
        description: "Execute deep research",
        body: {
          query: "string (required) - Research query",
          maxPapers: "number (optional, default: 20) - Maximum papers to return",
          maxIterations: "number (optional, default: 3) - Max quality iterations",
          targetCompleteness: "number (optional, default: 0.85) - Quality threshold",
          yearRange: {
            start: "number (optional) - Start year",
            end: "number (optional) - End year",
          },
          minRelevance: "number (optional, default: 0.5) - Minimum relevance score",
          minCompleteness: "number (optional, default: 0.7) - Minimum completeness",
          requireDOI: "boolean (optional) - Only return papers with DOI",
          requireAbstract: "boolean (optional) - Only return papers with abstract",
          preferOpenAccess: "boolean (optional) - Prioritize open access papers",
          expandQuery: "boolean (optional, default: true) - Use query expansion",
          publicationTypes: "array (optional) - Filter by publication type",
        },
        response: {
          success: "boolean",
          data: {
            status: "ResearchStatus",
            papers: "DeepResearchPaper[]",
            qualityReport: "QualityReport",
            iterations: "IterationResult[]",
            totalDurationMs: "number",
          },
        },
      },
    },
    qualityThresholds: {
      excellent: "95%",
      good: "85%",
      acceptable: "75%",
      minimum: "70%",
    },
    iterationStrategies: {
      standard: "Single query search (Iteration 1)",
      refined: "Expanded query with synonyms (Iteration 2)",
      aggressive: "Multiple query variants (Iteration 3)",
    },
  });
}
