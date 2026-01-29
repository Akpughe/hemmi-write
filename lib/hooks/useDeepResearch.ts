// React Hook for Deep Research with SSE Streaming
// Provides real-time progress updates during research

import { useState, useCallback, useRef } from "react";
import {
  DeepResearchQuery,
  DeepResearchResult,
  ResearchStatus,
  ResearchProgressUpdate,
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
}

export interface UseDeepResearchReturn extends DeepResearchState {
  execute: (query: DeepResearchQuery) => Promise<DeepResearchResult | null>;
  executeWithStream: (query: DeepResearchQuery) => Promise<DeepResearchResult | null>;
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
// Hook Implementation
// =============================================================================

export function useDeepResearch(): UseDeepResearchReturn {
  const [state, setState] = useState<DeepResearchState>({
    isLoading: false,
    isStreaming: false,
    progress: null,
    result: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isStreaming: false,
      progress: null,
      result: null,
      error: null,
    });
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
        isLoading: true,
        isStreaming: false,
        progress: null,
        result: null,
        error: null,
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
        }));

        return data.data;
      } catch (error: any) {
        if (error.name === "AbortError") {
          return null;
        }

        const err = {
          code: "NETWORK_ERROR",
          message: error.message || "Network error",
          retryable: true,
        };
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err,
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
    async (query: DeepResearchQuery): Promise<DeepResearchResult | null> => {
      // Cancel any existing request
      cancel();

      setState({
        isLoading: true,
        isStreaming: true,
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
        result: null,
        error: null,
      });

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/deep-research/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query),
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
                    progress: {
                      ...prev.progress!,
                      message: "Connected, starting research...",
                    },
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
                  }));
                  break;

                case "result":
                  if (data.data) {
                    finalResult = data.data;
                    setState((prev) => ({
                      ...prev,
                      result: data.data,
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
                  }));
                  break;

                case "done":
                  setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    isStreaming: false,
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
      } catch (error: any) {
        if (error.name === "AbortError") {
          return null;
        }

        const err = {
          code: "STREAM_ERROR",
          message: error.message || "Stream error",
          retryable: true,
        };
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          error: err,
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
