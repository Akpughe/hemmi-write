"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { ResearchStreamView } from "./research-stream-view";
import { useDeepResearch } from "@/lib/hooks/useDeepResearch";
import type { Source } from "@/lib/types/ui";
import { Check, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface ResearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  existingSources: Source[];
  topic: string;
  targetCount?: number;
  onComplete: (newSources: Source[]) => void;
  onUpgrade?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function ResearchModal({
  open,
  onOpenChange,
  projectId,
  existingSources,
  topic,
  targetCount = 5,
  onComplete,
  onUpgrade,
}: ResearchModalProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const {
    executeWithStream,
    cancel,
    reset,
    phase,
    phaseMessage,
    papersFound,
    papersEnriching,
    papersComplete,
    papersFailed,
    completedCount,
    savedCount,
    tokensUsed,
    tokensRemaining,
    tokenWarning,
    tokenExhausted,
    isStreaming,
    error,
  } = useDeepResearch();

  // Start research when modal opens
  const startResearch = useCallback(async () => {
    if (hasStarted) return;

    setHasStarted(true);
    setIsComplete(false);

    // Get existing URLs to exclude
    const existingUrls = existingSources.map((s) => s.url);

    await executeWithStream(
      {
        query: topic,
        maxPapers: targetCount,
        targetCompleteness: 0.8,
        excludeDomains: [],
      },
      projectId
    );

    setIsComplete(true);
  }, [hasStarted, existingSources, topic, targetCount, projectId, executeWithStream]);

  // Start research automatically when modal opens
  useEffect(() => {
    if (open && !hasStarted && !isStreaming) {
      startResearch();
    }
  }, [open, hasStarted, isStreaming, startResearch]);

  // Reset state when modal closes
  const handleClose = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        cancel();
        reset();
        setHasStarted(false);
        setIsComplete(false);
      }
      onOpenChange(newOpen);
    },
    [cancel, reset, onOpenChange]
  );

  // Add completed papers to project
  const handleAddToProject = useCallback(() => {
    const newSources: Source[] = papersComplete.map((paper) => ({
      id: paper.id,
      title: paper.title,
      url: paper.url,
      snippet: paper.abstract || paper.excerpt || "",
      author: paper.authors,
      publishedDate: paper.publishedDate,
      selected: true,
    }));

    onComplete(newSources);
    handleClose(false);
  }, [papersComplete, onComplete, handleClose]);

  // Cancel and close
  const handleCancel = useCallback(() => {
    cancel();
    handleClose(false);
  }, [cancel, handleClose]);

  const showFooter = (isComplete && papersComplete.length > 0 && !tokenExhausted) ||
    (tokenExhausted && savedCount > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-foreground/5 bg-background/95 backdrop-blur-xl">
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <X className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-sm text-foreground/70 mb-1">Something went wrong</p>
              <p className="text-xs text-foreground/40 mb-6 max-w-[300px] text-center">
                {error.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  reset();
                  setHasStarted(false);
                  startResearch();
                }}
                className="h-8 px-4 text-sm"
              >
                Try again
              </Button>
            </div>
          ) : (
            <ResearchStreamView
              phase={phase}
              phaseMessage={phaseMessage}
              papersFound={papersFound}
              papersEnriching={papersEnriching}
              papersComplete={papersComplete}
              papersFailed={papersFailed}
              targetCount={targetCount}
              completedCount={completedCount}
              savedCount={savedCount}
              tokensUsed={tokensUsed}
              tokensRemaining={tokensRemaining}
              tokenWarning={tokenWarning}
              tokenExhausted={tokenExhausted}
              topic={topic}
              onCancel={handleCancel}
              onUpgrade={onUpgrade}
            />
          )}
        </div>

        {/* Footer actions */}
        <AnimatePresence>
          {showFooter && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "px-8 py-5 border-t flex items-center justify-between",
                tokenExhausted
                  ? "bg-amber-500/5 border-amber-500/10"
                  : "bg-foreground/[0.01] border-foreground/5"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  tokenExhausted ? "bg-amber-500/10" : "bg-emerald-500/10"
                )}>
                  <Check className={cn(
                    "w-4 h-4",
                    tokenExhausted ? "text-amber-500" : "text-emerald-500"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-foreground/80">
                    {tokenExhausted
                      ? `${savedCount} sources found`
                      : `${papersComplete.length} sources ready`
                    }
                  </p>
                  {tokenExhausted && (
                    <p className="text-xs text-foreground/40">
                      Stopped due to token limit
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8 px-3 text-foreground/50 hover:text-foreground/70"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddToProject}
                  className="h-8 px-4 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to project
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default ResearchModal;
