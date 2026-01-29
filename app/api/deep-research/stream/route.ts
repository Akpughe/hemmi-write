// Deep Research Streaming API Endpoint
// POST /api/deep-research/stream - Execute deep research with SSE progress updates

import { NextRequest } from "next/server";
import {
  DeepResearchQuerySchema,
  ResearchProgressUpdate,
  ResearchStatus,
} from "@/lib/types/deepResearch";
import { executeDeepResearch, ProgressCallback } from "@/lib/services/deepResearchAgent";

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
// POST Handler - Execute Deep Research with Streaming
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parseResult = DeepResearchQuerySchema.safeParse(body);
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
        }
      );
    }

    const query = parseResult.data;

    console.log(`[Deep Research Stream] Starting research for: "${query.query}"`);

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
                maxPapers: query.maxPapers || 20,
                maxIterations: query.maxIterations || 3,
                targetCompleteness: query.targetCompleteness || 0.85,
              },
            })
          )
        );

        // Progress callback to stream updates to client
        const progressCallback: ProgressCallback = (update: ResearchProgressUpdate) => {
          try {
            if (update.type === "progress") {
              controller.enqueue(
                encoder.encode(
                  formatSSEEvent("progress", {
                    stage: update.stage,
                    message: update.message,
                    iteration: update.currentIteration,
                    maxIterations: update.maxIterations,
                    papersFound: update.papersFound,
                    papersEnriched: update.papersEnriched,
                    currentQuality: update.currentQuality,
                    targetQuality: update.targetQuality,
                    timestamp: update.timestamp,
                  })
                )
              );
            } else if (update.type === "result") {
              controller.enqueue(
                encoder.encode(
                  formatSSEEvent("result", {
                    success: true,
                    data: update.result,
                  })
                )
              );
            } else if (update.type === "error") {
              controller.enqueue(
                encoder.encode(
                  formatSSEEvent("error", {
                    code: update.error?.code,
                    message: update.error?.message,
                    retryable: update.error?.retryable,
                    timestamp: update.timestamp,
                  })
                )
              );
            }
          } catch (e) {
            // Stream might be closed, ignore
            console.warn("[Deep Research Stream] Failed to send progress update:", e);
          }
        };

        try {
          // Execute deep research with progress streaming
          const result = await executeDeepResearch(query, progressCallback);

          // Send final result if not already sent via callback
          if (result.status !== ResearchStatus.COMPLETE) {
            controller.enqueue(
              encoder.encode(
                formatSSEEvent("result", {
                  success: result.success,
                  data: result,
                })
              )
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
              })
            )
          );

          console.log(`[Deep Research Stream] Complete:`, {
            success: result.success,
            totalPapers: result.totalReturned,
            quality: result.qualityReport.averageCompleteness,
            iterations: result.totalIterations,
            duration: `${result.totalDurationMs}ms`,
          });
        } catch (error: any) {
          console.error("[Deep Research Stream] Error:", error);

          controller.enqueue(
            encoder.encode(
              formatSSEEvent("error", {
                code: "RESEARCH_FAILED",
                message: error.message || "Research failed",
                retryable: true,
              })
            )
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
  } catch (error: any) {
    console.error("[Deep Research Stream] Setup error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
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
      version: "1.0.0",
      description: "Academic paper discovery with real-time SSE progress updates",
      endpoint: "POST /api/deep-research/stream",
      contentType: "text/event-stream",
      events: {
        connected: {
          description: "Initial connection established",
          data: { message: "string", query: "string", config: "object" },
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
          },
        },
        result: {
          description: "Final research result",
          data: { success: "boolean", data: "DeepResearchResult" },
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
          },
        },
      },
      example: {
        clientCode: `
const eventSource = new EventSource('/api/deep-research/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'machine learning' })
});

// Note: EventSource only supports GET. For POST, use fetch:
fetch('/api/deep-research/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'machine learning' })
}).then(response => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  function read() {
    reader.read().then(({ done, value }) => {
      if (done) return;
      const text = decoder.decode(value);
      // Parse SSE events from text
      console.log(text);
      read();
    });
  }
  read();
});
        `.trim(),
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
