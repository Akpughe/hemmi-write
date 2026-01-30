// Deep Research Streaming API Endpoint
// POST /api/deep-research/stream - Execute deep research with SSE progress updates

import { NextRequest } from "next/server";
import {
  DeepResearchQuerySchema,
  ResearchProgressUpdate,
  ResearchStatus,
  PaperStreamEvent,
  PhaseEvent,
  PartialDeepResearchPaper,
  StreamingResearchEvent,
} from "@/lib/types/deepResearch";
import {
  executeClaudeResearch,
  ProgressCallback,
} from "@/lib/services/claudeResearchAgent";
import {
  createServerSupabaseClient,
  requireAuth,
} from "@/lib/supabase/server";
import {
  checkTokenBalance,
  deductTokens,
  MIN_TOKENS,
} from "@/lib/middleware/tokenMiddleware";
import { tokenService } from "@/lib/services/tokenService";

// =============================================================================
// Constants
// =============================================================================

const TOKENS_PER_PAPER = 800; // Token cost per paper
const LOW_TOKEN_THRESHOLD = 2000; // Warn when tokens get low

// =============================================================================
// SSE Helper Functions
// =============================================================================

function formatSSEMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function formatSSEEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// =============================================================================
// Helper: Save paper to database
// =============================================================================

async function savePaperToDatabase(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  projectId: string,
  paper: PartialDeepResearchPaper,
  position: number
): Promise<string | null> {
  try {
    // Map DeepResearchPaper to research_sources format
    // Only include columns that exist in the database schema
    const sourceToInsert = {
      project_id: projectId,
      title: paper.title,
      url: paper.url,
      author: paper.authors || null,
      published_date: paper.publishedDate || null,
      excerpt: paper.abstract || paper.excerpt || "No excerpt available",
      full_content: paper.fullContent || null,
      source_type: "academic",
      relevance_score: paper.relevanceScore || null,
      is_selected: true,
      position,
      // Academic metadata
      doi: paper.doi || null,
      journal_name: paper.journalName || null,
      volume: paper.volume || null,
      issue: paper.issue || null,
      pages: paper.pages || null,
      year: paper.year || null,
      publisher: paper.publisher || null,
      publication_type: paper.publicationType || "web",
      authors_structured: paper.authorsStructured
        ? JSON.stringify(paper.authorsStructured)
        : null,
    };

    const { data, error } = await supabase
      .from("research_sources")
      .insert(sourceToInsert)
      .select("id")
      .single();

    if (error) {
      console.error("[Deep Research Stream] Failed to save paper:", error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error("[Deep Research Stream] Error saving paper:", err);
    return null;
  }
}

// =============================================================================
// POST Handler - Execute Deep Research with Streaming
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATE USER
    const user = await requireAuth();

    const body = await request.json();

    // Extract projectId from body (not part of DeepResearchQuerySchema)
    const { projectId, ...queryBody } = body;

    // Validate input
    const parseResult = DeepResearchQuerySchema.safeParse(queryBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request body",
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const query = parseResult.data;
    const maxPapers = query.maxPapers || 20;

    // 2. ESTIMATE TOKEN USAGE
    const estimatedTokens = maxPapers * TOKENS_PER_PAPER;

    console.log(
      `[Deep Research Stream] User ${user.id.substring(0, 8)}... starting research for: "${query.query}"`,
    );
    console.log(`[Deep Research Stream] Estimated tokens: ${estimatedTokens}`);

    // 3. CHECK TOKEN BALANCE (minimum required, not full estimate)
    // Research uses incremental deduction, so we only need enough to start
    const tokenCheckError = await checkTokenBalance(user.id, estimatedTokens, MIN_TOKENS.RESEARCH);
    if (tokenCheckError) {
      console.log(`[Deep Research Stream] BLOCKED - Below minimum tokens (${MIN_TOKENS.RESEARCH})`);
      return tokenCheckError;
    }

    // Get current token balance for tracking
    const supabase = await createServerSupabaseClient();
    const tokenBalance = await tokenService.getUserTokenBalance(user.id);
    let tokensRemaining = tokenBalance.tokens || 0;
    let tokensUsed = 0;
    let papersSaved = 0;
    let currentPosition = 0;
    const savedPaperIds = new Set<string>();

    // If projectId provided, get current position
    if (projectId) {
      const { count } = await supabase
        .from("research_sources")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);
      currentPosition = count || 0;
    }

    // Create encoder for SSE
    const encoder = new TextEncoder();

    // Create ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        controller.enqueue(
          encoder.encode(
            formatSSEEvent("connected", {
              message: "Connected to deep research stream",
              query: query.query,
              config: {
                maxPapers: maxPapers,
                maxIterations: query.maxIterations || 3,
                targetCompleteness: query.targetCompleteness || 0.85,
              },
              projectId,
            }),
          ),
        );

        // Helper to send token events
        const checkAndSendTokenEvent = () => {
          if (tokensRemaining < LOW_TOKEN_THRESHOLD && tokensRemaining > 0) {
            controller.enqueue(
              encoder.encode(
                formatSSEEvent("tokens_low", {
                  type: "tokens_low",
                  tokensRemaining,
                  tokensUsed,
                  papersSaved,
                }),
              ),
            );
          }
        };

        // Progress callback to stream updates to client
        const progressCallback: ProgressCallback = async (
          update: ResearchProgressUpdate | PaperStreamEvent | PhaseEvent | StreamingResearchEvent,
        ) => {
          try {
            // Handle new phase events
            if ("phase" in update && update.type === "phase") {
              const phaseEvent = update as PhaseEvent;
              controller.enqueue(
                encoder.encode(
                  formatSSEEvent("phase", {
                    phase: phaseEvent.phase,
                    message: phaseEvent.message,
                    count: phaseEvent.count,
                    topic: phaseEvent.topic,
                  }),
                ),
              );
              return;
            }

            // Handle paper-level events
            if ("paperId" in update) {
              const paperEvent = update as PaperStreamEvent;

              // Send paper event to client
              controller.enqueue(
                encoder.encode(
                  formatSSEEvent(paperEvent.type, {
                    paperId: paperEvent.paperId,
                    paper: paperEvent.paper,
                    enrichmentField: paperEvent.enrichmentField,
                    message: paperEvent.message,
                  }),
                ),
              );

              // On paper_complete, save to database and deduct tokens
              if (
                paperEvent.type === "paper_complete" &&
                projectId &&
                paperEvent.paper &&
                !savedPaperIds.has(paperEvent.paperId)
              ) {
                // Check if we have enough tokens
                if (tokensRemaining < TOKENS_PER_PAPER) {
                  // Token exhaustion
                  controller.enqueue(
                    encoder.encode(
                      formatSSEEvent("tokens_exhausted", {
                        type: "tokens_exhausted",
                        tokensRemaining,
                        tokensUsed,
                        papersSaved,
                      }),
                    ),
                  );
                  return;
                }

                // Save paper to database
                const savedId = await savePaperToDatabase(
                  supabase,
                  projectId,
                  paperEvent.paper,
                  currentPosition++,
                );

                if (savedId) {
                  savedPaperIds.add(paperEvent.paperId);
                  papersSaved++;

                  // Deduct tokens for this paper
                  await deductTokens(user.id, TOKENS_PER_PAPER, "research", {
                    paperId: savedId,
                    projectId,
                    paperTitle: paperEvent.paper.title,
                  });

                  tokensUsed += TOKENS_PER_PAPER;
                  tokensRemaining -= TOKENS_PER_PAPER;

                  // Check for low tokens
                  checkAndSendTokenEvent();

                  console.log(
                    `[Deep Research Stream] Saved paper: ${paperEvent.paper.title} (${papersSaved} total, ${tokensRemaining} tokens remaining)`,
                  );
                }
              }

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
                    maxIterations: progressUpdate.maxIterations,
                    papersFound: progressUpdate.papersFound,
                    papersEnriched: progressUpdate.papersEnriched,
                    papers: progressUpdate.papers,
                    currentQuality: progressUpdate.currentQuality,
                    targetQuality: progressUpdate.targetQuality,
                    timestamp: progressUpdate.timestamp,
                    // Add streaming-specific data
                    papersSaved,
                    tokensUsed,
                    tokensRemaining,
                  }),
                ),
              );
            } else if (progressUpdate.type === "result") {
              controller.enqueue(
                encoder.encode(
                  formatSSEEvent("result", {
                    success: true,
                    data: progressUpdate.result,
                    papersSaved,
                    tokensUsed,
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
                    timestamp: progressUpdate.timestamp,
                  }),
                ),
              );
            }
          } catch (e) {
            // Stream might be closed, ignore
            console.warn(
              "[Deep Research Stream] Failed to send progress update:",
              e,
            );
          }
        };

        try {
          // Execute deep research with progress streaming
          const result = await executeClaudeResearch(query, progressCallback);

          // Send final result if not already sent via callback
          if (result.status !== ResearchStatus.COMPLETE) {
            controller.enqueue(
              encoder.encode(
                formatSSEEvent("result", {
                  success: result.success,
                  data: result,
                  papersSaved,
                  tokensUsed,
                }),
              ),
            );
          }

          // Send completion event
          controller.enqueue(
            encoder.encode(
              formatSSEEvent("done", {
                message: "Research complete",
                success: result.success,
                totalPapers: result.totalReturned,
                quality: result.qualityReport.averageCompleteness,
                iterations: result.totalIterations,
                durationMs: result.totalDurationMs,
                papersSaved,
                tokensUsed,
                tokensRemaining,
              }),
            ),
          );

          console.log(`[Deep Research Stream] Complete:`, {
            success: result.success,
            totalPapers: result.totalReturned,
            papersSaved,
            tokensUsed,
            quality: result.qualityReport.averageCompleteness,
            iterations: result.totalIterations,
            duration: `${result.totalDurationMs}ms`,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Research failed";
          console.error("[Deep Research Stream] Error:", error);

          controller.enqueue(
            encoder.encode(
              formatSSEEvent("error", {
                code: "RESEARCH_FAILED",
                message: errorMessage,
                retryable: true,
                papersSaved,
                tokensUsed,
              }),
            ),
          );
        } finally {
          // Close the stream
          controller.close();
        }
      },
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error: unknown) {
    // Handle authentication errors
    if (error instanceof Error && error.message === "Unauthorized") {
      console.log("[Deep Research Stream] Unauthorized access attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("[Deep Research Stream] Setup error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// =============================================================================
// GET Handler - API Info
// =============================================================================

export async function GET() {
  return new Response(
    JSON.stringify({
      name: "Deep Research Streaming API",
      version: "2.0.0",
      description:
        "Academic paper discovery with real-time SSE progress updates, progressive saves, and token tracking",
      endpoint: "POST /api/deep-research/stream",
      contentType: "text/event-stream",
      events: {
        connected: {
          description: "Initial connection established",
          data: { message: "string", query: "string", config: "object", projectId: "string?" },
        },
        phase: {
          description: "Research phase transition",
          data: {
            phase: "searching | found | enriching | validating | complete",
            message: "string",
            count: "number?",
            topic: "string?",
          },
        },
        paper_found: {
          description: "Paper discovered (partial data)",
          data: { paperId: "string", paper: "object", message: "string?" },
        },
        paper_enriching: {
          description: "Paper being enriched",
          data: { paperId: "string", paper: "object", enrichmentField: "string?", message: "string?" },
        },
        paper_complete: {
          description: "Paper fully processed and saved",
          data: { paperId: "string", paper: "object", message: "string?" },
        },
        paper_failed: {
          description: "Paper failed validation",
          data: { paperId: "string", paper: "object", message: "string?" },
        },
        tokens_low: {
          description: "Token balance getting low",
          data: { tokensRemaining: "number", tokensUsed: "number", papersSaved: "number" },
        },
        tokens_exhausted: {
          description: "Token balance exhausted",
          data: { tokensRemaining: "number", tokensUsed: "number", papersSaved: "number" },
        },
        progress: {
          description: "Progress update during research",
          data: {
            stage: "searching | enriching | analyzing | validating",
            message: "string",
            iteration: "number",
            maxIterations: "number",
            papersFound: "number",
            papersEnriched: "number",
            currentQuality: "number (0-1)",
            targetQuality: "number (0-1)",
            timestamp: "ISO string",
            papersSaved: "number",
            tokensUsed: "number",
            tokensRemaining: "number",
          },
        },
        result: {
          description: "Final research result",
          data: { success: "boolean", data: "DeepResearchResult", papersSaved: "number", tokensUsed: "number" },
        },
        error: {
          description: "Error occurred",
          data: { code: "string", message: "string", retryable: "boolean" },
        },
        done: {
          description: "Stream complete",
          data: {
            message: "string",
            success: "boolean",
            totalPapers: "number",
            quality: "number",
            iterations: "number",
            durationMs: "number",
            papersSaved: "number",
            tokensUsed: "number",
            tokensRemaining: "number",
          },
        },
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}
