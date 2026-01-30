// Claude-Orchestrated Deep Research API Endpoint
// POST /api/deep-research/claude - Execute research with Claude tool use

import { NextRequest, NextResponse } from "next/server";
import {
  DeepResearchQuerySchema,
  ResearchProgressUpdate,
  StreamingResearchEvent,
} from "@/lib/types/deepResearch";
import {
  executeClaudeResearch,
  ProgressCallback,
} from "@/lib/services/claudeResearchAgent";

// =============================================================================
// SSE Helper
// =============================================================================

function formatSSEEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// =============================================================================
// POST Handler - Execute with Claude (Streaming)
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
        { status: 400 },
      );
    }

    // Check for Anthropic API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "ANTHROPIC_API_KEY not configured",
          message: "Add ANTHROPIC_API_KEY to your .env.local file",
        },
        { status: 500 },
      );
    }

    const query = parseResult.data;

    console.log(`[Claude Research] Starting for: "${query.query}"`);

    // Check if streaming is requested
    const acceptHeader = request.headers.get("accept") || "";
    const wantsStream = acceptHeader.includes("text/event-stream");

    if (wantsStream) {
      // Streaming response
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode(
              formatSSEEvent("connected", {
                message: "Connected to Claude research stream",
                query: query.query,
                model: "claude-haiku-4-5-20251001",
              }),
            ),
          );

          const progressCallback: ProgressCallback = (
            update: StreamingResearchEvent,
          ) => {
            try {
              // Handle paper-level events (new streaming events)
              if ("paperId" in update) {
                controller.enqueue(
                  encoder.encode(
                    formatSSEEvent(update.type, {
                      paperId: update.paperId,
                      paper: update.paper,
                      enrichmentField: update.enrichmentField,
                      message: update.message,
                    }),
                  ),
                );
                return;
              }

              // Handle phase events
              if ("phase" in update && update.type === "phase") {
                controller.enqueue(
                  encoder.encode(
                    formatSSEEvent("phase", {
                      phase: update.phase,
                      message: update.message,
                      count: update.count,
                      topic: update.topic,
                    }),
                  ),
                );
                return;
              }

              // Handle legacy progress events
              const progressUpdate = update as ResearchProgressUpdate;
              if (progressUpdate.type === "progress") {
                controller.enqueue(
                  encoder.encode(
                    formatSSEEvent("progress", {
                      stage: progressUpdate.stage,
                      message: progressUpdate.message,
                      iteration: progressUpdate.currentIteration,
                      papersFound: progressUpdate.papersFound,
                      papersEnriched: progressUpdate.papersEnriched,
                      papers: progressUpdate.papers,
                      currentQuality: progressUpdate.currentQuality,
                      targetQuality: progressUpdate.targetQuality,
                      timestamp: progressUpdate.timestamp,
                    }),
                  ),
                );
              } else if (progressUpdate.type === "result") {
                controller.enqueue(
                  encoder.encode(
                    formatSSEEvent("result", {
                      success: true,
                      data: progressUpdate.result,
                    }),
                  ),
                );
              } else if (progressUpdate.type === "error") {
                controller.enqueue(
                  encoder.encode(
                    formatSSEEvent("error", {
                      code: progressUpdate.error?.code,
                      message: progressUpdate.error?.message,
                      retryable: progressUpdate.error?.retryable,
                    }),
                  ),
                );
              }
            } catch (e) {
              console.warn("[Claude Research] Stream write error:", e);
            }
          };

          try {
            const result = await executeClaudeResearch(query, progressCallback);

            controller.enqueue(
              encoder.encode(
                formatSSEEvent("done", {
                  success: result.success,
                  totalPapers: result.totalReturned,
                  quality: result.qualityReport.averageCompleteness,
                  durationMs: result.totalDurationMs,
                }),
              ),
            );

            console.log(`[Claude Research] Complete:`, {
              success: result.success,
              papers: result.totalReturned,
              quality: result.qualityReport.averageCompleteness,
              duration: `${result.totalDurationMs}ms`,
            });
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            controller.enqueue(
              encoder.encode(
                formatSSEEvent("error", {
                  code: "RESEARCH_FAILED",
                  message: errorMessage,
                  retryable: true,
                }),
              ),
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    } else {
      // Non-streaming response
      const result = await executeClaudeResearch(query);

      console.log(`[Claude Research] Complete:`, {
        success: result.success,
        papers: result.totalReturned,
        quality: result.qualityReport.averageCompleteness,
        duration: `${result.totalDurationMs}ms`,
      });

      return NextResponse.json({
        success: result.success,
        data: result,
      });
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[Claude Research] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}

// =============================================================================
// GET Handler - API Info
// =============================================================================

export async function GET() {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasPerplexityKey = !!process.env.PERPLEXITY_API_KEY;

  return NextResponse.json({
    name: "Claude-Orchestrated Deep Research API",
    version: "2.0.0",
    description:
      "Academic paper discovery using Perplexity search + Claude intelligence for metadata enrichment",
    status: hasAnthropicKey && hasPerplexityKey ? "ready" : "missing_api_keys",
    model: "claude-haiku-4-5-20251001",
    requiredEnvVars: ["ANTHROPIC_API_KEY", "PERPLEXITY_API_KEY"],
    endpoint: "POST /api/deep-research/claude",
    features: [
      "Perplexity for paper discovery",
      "Claude for intelligent metadata research",
      "Dynamic enrichment - only researches missing fields",
      "Target 80%+ completeness per paper",
      "Automatic iteration until quality threshold met",
    ],
    tools: [
      "search_papers - Find academic papers via Perplexity",
      "enrich_missing_authors - Token-optimized batch author enrichment (title + URL only)",
      "research_paper_metadata - Use Claude to find missing metadata (authors, DOI, year, etc.)",
      "extract_identifiers - Extract DOI/arXiv from URLs",
      "validate_papers - Check completeness scores",
      "generate_insights - Create highlights and relevance scores",
    ],
    streaming: {
      description: "Add Accept: text/event-stream header for SSE streaming",
      events: ["connected", "progress", "result", "error", "done"],
    },
    setup:
      hasAnthropicKey && hasPerplexityKey
        ? "Ready to use"
        : `Missing: ${!hasAnthropicKey ? "ANTHROPIC_API_KEY " : ""}${!hasPerplexityKey ? "PERPLEXITY_API_KEY" : ""}`.trim(),
  });
}
