// React Hook for Deep Research with SSE Streaming
// Provides real-time progress updates during research with paper-level granularity

import { useState, useCallback, useRef } from "react";
import {
  DeepResearchQuery,
  DeepResearchResult,
  ResearchStatus,
  ResearchProgressUpdate,
  PartialDeepResearchPaper,
  ResearchPhase,
} from "@/lib/types/deepResearch";

// =============================================================================
// Types
// =============================================================================

export interface DeepResearchProgress {
  stage: ResearchStatus;
  message: string;
  iteration: number;
  maxIterations: number;
  papersFound: number;
  papersEnriched: number;
  currentQuality: number;
  targetQuality: number;
}

export interface DeepResearchState {
  isLoading: boolean;
  isStreaming: boolean;
  progress: DeepResearchProgress | null;
  result: DeepResearchResult | null;
  error: { code: string; message: string; retryable: boolean } | null;

  // New granular state
  phase: ResearchPhase;
  phaseMessage: string;

  // Papers in different states
  papersFound: PartialDeepResearchPaper[];
  papersEnriching: Map<string, { paper: PartialDeepResearchPaper; field: string }>;
  papersComplete: PartialDeepResearchPaper[];
  papersFailed: PartialDeepResearchPaper[];

  // Token tracking
  tokensUsed: number;
  tokensRemaining: number;
  tokenWarning: boolean;
  tokenExhausted: boolean;

  // Stats
  targetCount: number;
  foundCount: number;
  completedCount: number;
  savedCount: number;
}

export interface UseDeepResearchReturn extends DeepResearchState {
  execute: (query: DeepResearchQuery) => Promise<DeepResearchResult | null>;
  executeWithStream: (query: DeepResearchQuery, projectId?: string) => Promise<DeepResearchResult | null>;
  cancel: () => void;
  reset: () => void;
}

// =============================================================================
// SSE Parser
// =============================================================================

interface SSEEvent {
  event?: string;
  data: string;
}

function parseSSEEvents(text: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const lines = text.split("\n");

  let currentEvent: Partial<SSEEvent> = {};

  for (const line of lines) {
    if (line.startsWith("event:")) {
      currentEvent.event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      currentEvent.data = line.slice(5).trim();
    } else if (line === "" && currentEvent.data) {
      events.push(currentEvent as SSEEvent);
      currentEvent = {};
    }
  }

  // Handle case where last event doesn't have trailing newline
  if (currentEvent.data) {
    events.push(currentEvent as SSEEvent);
  }

  return events;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: DeepResearchState = {
  isLoading: false,
  isStreaming: false,
  progress: null,
  result: null,
  error: null,
  phase: "idle",
  phaseMessage: "",
  papersFound: [],
  papersEnriching: new Map(),
  papersComplete: [],
  papersFailed: [],
  tokensUsed: 0,
  tokensRemaining: 0,
  tokenWarning: false,
  tokenExhausted: false,
  targetCount: 0,
  foundCount: 0,
  completedCount: 0,
  savedCount: 0,
};

// =============================================================================
// Hook Implementation
// =============================================================================

export function useDeepResearch(): UseDeepResearchReturn {
  const [state, setState] = useState<DeepResearchState>(initialState);

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Cancel ongoing request
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isStreaming: false,
    }));
  }, []);

  /**
   * Execute deep research without streaming (simple POST)
   */
  const execute = useCallback(
    async (query: DeepResearchQuery): Promise<DeepResearchResult | null> => {
      // Cancel any existing request
      cancel();

      setState({
        ...initialState,
        isLoading: true,
        targetCount: query.maxPapers || 20,
      });

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/deep-research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query),
          signal: abortControllerRef.current.signal,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          const error = {
            code: "REQUEST_FAILED",
            message: data.error || "Request failed",
            retryable: response.status >= 500,
          };
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error,
          }));
          return null;
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          result: data.data,
          phase: "complete",
          papersComplete: data.data.papers || [],
          completedCount: data.data.papers?.length || 0,
        }));

        return data.data;
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return null;
        }

        const err = {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error",
          retryable: true,
        };
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err,
          phase: "error",
        }));
        return null;
      }
    },
    [cancel]
  );

  /**
   * Execute deep research with SSE streaming
   */
  const executeWithStream = useCallback(
    async (query: DeepResearchQuery, projectId?: string): Promise<DeepResearchResult | null> => {
      // Cancel any existing request
      cancel();

      const targetCount = query.maxPapers || 20;

      setState({
        ...initialState,
        isLoading: true,
        isStreaming: true,
        phase: "searching",
        phaseMessage: "Connecting...",
        targetCount,
        progress: {
          stage: ResearchStatus.PENDING,
          message: "Connecting...",
          iteration: 0,
          maxIterations: query.maxIterations || 3,
          papersFound: 0,
          papersEnriched: 0,
          currentQuality: 0,
          targetQuality: query.targetCompleteness || 0.85,
        },
      });

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/deep-research/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...query, projectId }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = {
            code: "REQUEST_FAILED",
            message: errorData.error || `HTTP ${response.status}`,
            retryable: response.status >= 500,
          };
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            error,
            phase: "error",
          }));
          return null;
        }

        if (!response.body) {
          const error = {
            code: "NO_STREAM",
            message: "No response body",
            retryable: true,
          };
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            error,
            phase: "error",
          }));
          return null;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalResult: DeepResearchResult | null = null;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const events = parseSSEEvents(buffer);

          // Keep any incomplete event in the buffer
          const lastNewline = buffer.lastIndexOf("\n\n");
          if (lastNewline !== -1) {
            buffer = buffer.slice(lastNewline + 2);
          }

          // Process events
          for (const event of events) {
            try {
              const data = JSON.parse(event.data);

              switch (event.event) {
                case "connected":
                  setState((prev) => ({
                    ...prev,
                    phaseMessage: "Connected, starting research...",
                    progress: prev.progress
                      ? { ...prev.progress, message: "Connected, starting research..." }
                      : null,
                  }));
                  break;

                case "phase":
                  setState((prev) => ({
                    ...prev,
                    phase: data.phase || prev.phase,
                    phaseMessage: data.message || "",
                    foundCount: data.count ?? prev.foundCount,
                  }));
                  break;

                case "paper_found":
                  setState((prev) => ({
                    ...prev,
                    papersFound: [...prev.papersFound, data.paper],
                    foundCount: prev.foundCount + 1,
                  }));
                  break;

                case "paper_enriching":
                  setState((prev) => {
                    const newEnriching = new Map(prev.papersEnriching);
                    newEnriching.set(data.paperId, {
                      paper: data.paper,
                      field: data.enrichmentField || "metadata",
                    });
                    return {
                      ...prev,
                      papersEnriching: newEnriching,
                    };
                  });
                  break;

                case "paper_complete":
                  setState((prev) => {
                    const newEnriching = new Map(prev.papersEnriching);
                    newEnriching.delete(data.paperId);
                    return {
                      ...prev,
                      papersEnriching: newEnriching,
                      papersComplete: [...prev.papersComplete, data.paper],
                      completedCount: prev.completedCount + 1,
                    };
                  });
                  break;

                case "paper_failed":
                  setState((prev) => {
                    const newEnriching = new Map(prev.papersEnriching);
                    newEnriching.delete(data.paperId);
                    return {
                      ...prev,
                      papersEnriching: newEnriching,
                      papersFailed: [...prev.papersFailed, data.paper],
                    };
                  });
                  break;

                case "tokens_low":
                  setState((prev) => ({
                    ...prev,
                    tokenWarning: true,
                    tokensRemaining: data.tokensRemaining,
                    tokensUsed: data.tokensUsed,
                    savedCount: data.papersSaved,
                  }));
                  break;

                case "tokens_exhausted":
                  setState((prev) => ({
                    ...prev,
                    tokenExhausted: true,
                    tokensRemaining: data.tokensRemaining,
                    tokensUsed: data.tokensUsed,
                    savedCount: data.papersSaved,
                  }));
                  break;

                case "progress":
                  setState((prev) => ({
                    ...prev,
                    progress: {
                      stage: data.stage || ResearchStatus.SEARCHING,
                      message: data.message || "",
                      iteration: data.iteration || 0,
                      maxIterations: data.maxIterations || 3,
                      papersFound: data.papersFound || 0,
                      papersEnriched: data.papersEnriched || 0,
                      currentQuality: data.currentQuality || 0,
                      targetQuality: data.targetQuality || 0.85,
                    },
                    tokensUsed: data.tokensUsed ?? prev.tokensUsed,
                    tokensRemaining: data.tokensRemaining ?? prev.tokensRemaining,
                    savedCount: data.papersSaved ?? prev.savedCount,
                  }));
                  break;

                case "result":
                  if (data.data) {
                    finalResult = data.data;
                    setState((prev) => ({
                      ...prev,
                      result: data.data,
                      savedCount: data.papersSaved ?? prev.savedCount,
                      tokensUsed: data.tokensUsed ?? prev.tokensUsed,
                    }));
                  }
                  break;

                case "error":
                  setState((prev) => ({
                    ...prev,
                    error: {
                      code: data.code || "UNKNOWN",
                      message: data.message || "Unknown error",
                      retryable: data.retryable ?? true,
                    },
                    phase: "error",
                  }));
                  break;

                case "done":
                  setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    isStreaming: false,
                    phase: "complete",
                    phaseMessage: data.message || "Complete",
                    savedCount: data.papersSaved ?? prev.savedCount,
                    tokensUsed: data.tokensUsed ?? prev.tokensUsed,
                    tokensRemaining: data.tokensRemaining ?? prev.tokensRemaining,
                    progress: prev.progress
                      ? {
                          ...prev.progress,
                          stage: ResearchStatus.COMPLETE,
                          message: data.message || "Complete",
                        }
                      : null,
                  }));
                  break;
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete events
              console.warn("Failed to parse SSE event:", event, parseError);
            }
          }
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
        }));

        return finalResult;
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return null;
        }

        const err = {
          code: "STREAM_ERROR",
          message: error instanceof Error ? error.message : "Stream error",
          retryable: true,
        };
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          error: err,
          phase: "error",
        }));
        return null;
      }
    },
    [cancel]
  );

  return {
    ...state,
    execute,
    executeWithStream,
    cancel,
    reset,
  };
}

export default useDeepResearch;
