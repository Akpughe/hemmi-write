"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Check,
  AlertCircle,
  X,
  Sparkles,
  ArrowUpRight,
  CircleDot,
  Layers,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PartialDeepResearchPaper,
  ResearchPhase,
} from "@/lib/types/deepResearch";

// =============================================================================
// Types
// =============================================================================

interface ResearchStreamViewProps {
  phase: ResearchPhase;
  phaseMessage: string;
  papersFound: PartialDeepResearchPaper[];
  papersEnriching: Map<
    string,
    { paper: PartialDeepResearchPaper; field: string }
  >;
  papersComplete: PartialDeepResearchPaper[];
  papersFailed: PartialDeepResearchPaper[];
  targetCount: number;
  completedCount: number;
  savedCount: number;
  tokensUsed: number;
  tokensRemaining?: number;
  tokenWarning?: boolean;
  tokenExhausted?: boolean;
  topic?: string;
  onCancel?: () => void;
  onUpgrade?: () => void;
}

// =============================================================================
// Thinking Indicator - Claude/ChatGPT style shimmer
// =============================================================================

function ThinkingShimmer() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1 h-1 rounded-full bg-foreground/40"
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.85, 1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Streaming Text - Typewriter effect
// =============================================================================

function StreamingText({
  text,
  isActive,
}: {
  text: string;
  isActive: boolean;
}) {
  const [displayed, setDisplayed] = useState("");
  const prevTextRef = useRef("");

  useEffect(() => {
    // If text changed, animate the new part
    if (text !== prevTextRef.current) {
      const prevLength = text.startsWith(prevTextRef.current)
        ? prevTextRef.current.length
        : 0;

      let index = prevLength;
      setDisplayed(text.slice(0, index));

      const interval = setInterval(() => {
        if (index <= text.length) {
          setDisplayed(text.slice(0, index));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 12);

      prevTextRef.current = text;
      return () => clearInterval(interval);
    }
  }, [text]);

  return (
    <span className="text-sm text-foreground/80">
      {displayed}
      {isActive && displayed.length < text.length && (
        <span className="inline-block w-0.5 h-4 bg-foreground/40 ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

// =============================================================================
// Activity Pulse - Subtle live indicator
// =============================================================================

function ActivityPulse({ active }: { active: boolean }) {
  if (!active) {
    return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
  }

  return (
    <div className="relative">
      <motion.div
        className="absolute inset-0 rounded-full bg-blue-500/50"
        animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
      />
      <div className="relative w-2 h-2 rounded-full bg-blue-500" />
    </div>
  );
}

// =============================================================================
// Paper Item - Minimal card design
// =============================================================================

interface PaperItemProps {
  paper: PartialDeepResearchPaper;
  status: "found" | "enriching" | "complete" | "failed";
  enrichmentField?: string;
  index: number;
}

function PaperItem({ paper, status, enrichmentField, index }: PaperItemProps) {
  const isActive = status === "enriching";
  const isComplete = status === "complete";
  const isFailed = status === "failed";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.2,
        delay: Math.min(index * 0.02, 0.1),
      }}
      className={cn(
        "group relative py-3 px-4 rounded-xl transition-all duration-300",
        isActive && "bg-foreground/[0.02]",
        isComplete && "hover:bg-foreground/[0.02]",
        isFailed && "opacity-50",
      )}>
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="mt-1.5 shrink-0">
          {isActive ? (
            <motion.div
              className="w-4 h-4 rounded-full border-2 border-blue-500/30 border-t-blue-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : isComplete ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}>
              <Check className="w-4 h-4 text-emerald-500" />
            </motion.div>
          ) : isFailed ? (
            <X className="w-4 h-4 text-foreground/30" />
          ) : (
            <CircleDot className="w-4 h-4 text-foreground/20" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h4
              className={cn(
                "text-sm font-medium leading-relaxed line-clamp-2 transition-colors",
                isComplete ? "text-foreground" : "text-foreground/70",
              )}>
              {paper.title}
            </h4>

            {isComplete && paper.url && (
              <motion.a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 p-1 -m-1 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-foreground/5"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}>
                <ArrowUpRight className="w-3.5 h-3.5 text-foreground/40" />
              </motion.a>
            )}
          </div>

          {/* Metadata - only for complete papers */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-foreground/40">
                {paper.authors && (
                  <span className="truncate max-w-[200px]">
                    {paper.authors.split(",")[0]}
                    {paper.authors.includes(",") && " et al."}
                  </span>
                )}
                {paper.year && (
                  <>
                    {paper.authors && (
                      <span className="text-foreground/20">·</span>
                    )}
                    <span>{paper.year}</span>
                  </>
                )}
                {paper.journalName && (
                  <>
                    <span className="text-foreground/20">·</span>
                    <span className="truncate max-w-[150px] italic">
                      {paper.journalName}
                    </span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enriching indicator */}
          {isActive && enrichmentField && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 flex items-center gap-2">
              <span className="text-xs text-blue-500/70">
                {enrichmentField}
              </span>
              <ThinkingShimmer />
            </motion.div>
          )}
        </div>
      </div>

      {/* Subtle bottom border for active items */}
      {isActive && (
        <motion.div
          className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"
          initial={{ opacity: 0, scaleX: 0.5 }}
          animate={{ opacity: 1, scaleX: 1 }}
        />
      )}
    </motion.div>
  );
}

// =============================================================================
// Progress Ring - Minimal circular progress
// =============================================================================

function ProgressRing({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const percentage = Math.min((completed / total) * 100, 100);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-12 h-12">
      {/* Background circle */}
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-foreground/5"
        />
        <motion.circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-emerald-500"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          style={{ strokeDasharray: circumference }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-foreground/60">
          {completed}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ResearchStreamView({
  phase,
  phaseMessage,
  papersFound,
  papersEnriching,
  papersComplete,
  papersFailed,
  targetCount,
  completedCount,
  savedCount,
  tokensUsed,
  tokensRemaining,
  tokenWarning,
  tokenExhausted,
  topic,
  onCancel,
  onUpgrade,
}: ResearchStreamViewProps) {
  // Merge papers into a single list for display
  const displayPapers = useMemo(() => {
    const papers: Array<{
      paper: PartialDeepResearchPaper;
      status: "found" | "enriching" | "complete" | "failed";
      field?: string;
    }> = [];

    // Add complete papers first
    for (const paper of papersComplete) {
      papers.push({ paper, status: "complete" });
    }

    // Add enriching papers
    for (const [, { paper, field }] of papersEnriching) {
      papers.push({ paper, status: "enriching", field });
    }

    // Add found papers (not yet enriching or complete)
    const enrichingIds = new Set(papersEnriching.keys());
    const completeIds = new Set(papersComplete.map((p) => p.id));
    const failedIds = new Set(papersFailed.map((p) => p.id));

    for (const paper of papersFound) {
      if (
        !enrichingIds.has(paper.id) &&
        !completeIds.has(paper.id) &&
        !failedIds.has(paper.id)
      ) {
        papers.push({ paper, status: "found" });
      }
    }

    // Add failed papers at the end
    for (const paper of papersFailed) {
      papers.push({ paper, status: "failed" });
    }

    return papers;
  }, [papersFound, papersEnriching, papersComplete, papersFailed]);

  const isComplete = phase === "complete";
  const isError = phase === "error";
  const isActive = !isComplete && !isError;

  // Get phase-specific display info
  const getPhaseInfo = () => {
    switch (phase) {
      case "idle":
        return { label: "Starting", icon: Sparkles };
      case "searching":
        return { label: "Discovering", icon: Search };
      case "found":
        return { label: "Papers found", icon: Layers };
      case "enriching":
        return { label: "Analyzing", icon: Sparkles };
      case "validating":
        return { label: "Validating", icon: Check };
      case "complete":
        return { label: "Complete", icon: Check };
      case "error":
        return { label: "Interrupted", icon: AlertCircle };
      default:
        return { label: "Working", icon: Sparkles };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-xl mx-auto flex flex-col">
      {/* Header - Minimal status bar */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <ActivityPulse active={isActive} />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground/70">
              {phaseInfo.label}
            </span>
            {isActive && <ThinkingShimmer />}
          </div>
        </div>

        {onCancel && isActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 px-2 text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Topic display */}
      {topic && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 px-4 py-3 rounded-xl bg-foreground/[0.02] border border-foreground/5 flex-shrink-0">
          <p className="text-xs text-foreground/40 mb-1">Researching</p>
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
            {topic}
          </p>
        </motion.div>
      )}

      {/* Status message - Conversational style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6 flex-shrink-0">
        <StreamingText text={phaseMessage} isActive={isActive} />
      </motion.div>

      {/* Token Exhausted Warning */}
      <AnimatePresence>
        {tokenExhausted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex-shrink-0">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/80">Tokens exhausted</p>
                <p className="text-xs text-foreground/50 mt-1">
                  Found {savedCount} papers before running out
                </p>
                {onUpgrade && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onUpgrade}
                    className="mt-2 h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10">
                    Top up tokens
                    <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Papers List - Scrollable Section */}
      <div className="overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2 pb-6 scrollbar-thin scrollbar-thumb-foreground/10 scrollbar-track-transparent hover:scrollbar-thumb-foreground/20">
          {displayPapers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16">
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}>
                <Search className="w-8 h-8 text-foreground/20" />
              </motion.div>
              <p className="mt-4 text-sm text-foreground/40">
                Searching databases...
              </p>
            </motion.div>
          ) : (
            <div className="space-y-1">
              {displayPapers.map(({ paper, status, field }, index) => (
                <PaperItem
                  key={paper.id}
                  paper={paper}
                  status={status}
                  enrichmentField={field}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Progress summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 pt-6 border-t border-foreground/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ProgressRing completed={completedCount} total={targetCount} />
            <div>
              <p className="text-sm text-foreground/70">
                {isComplete ? "Research complete" : "Finding papers"}
              </p>
              <p className="text-xs text-foreground/40 mt-0.5">
                {completedCount} of {targetCount} papers analyzed
              </p>
            </div>
          </div>

          {tokensUsed > 0 && (
            <div className="text-right">
              <p
                className={cn(
                  "text-xs",
                  tokenWarning ? "text-amber-500" : "text-foreground/30",
                )}>
                {tokensUsed.toLocaleString()} tokens
              </p>
              {tokensRemaining !== undefined && (
                <p className="text-xs text-foreground/20 mt-0.5">
                  {tokensRemaining.toLocaleString()} left
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ResearchStreamView;
