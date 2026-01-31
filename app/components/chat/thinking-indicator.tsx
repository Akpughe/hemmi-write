"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  isThinking: boolean;
  thinkingText?: string;
  className?: string;
}

/**
 * Thinking Indicator Component
 * Shows Claude-style thinking animation with optional expandable reasoning
 */
export function ThinkingIndicator({
  isThinking,
  thinkingText,
  className,
}: ThinkingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isThinking) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3",
        className
      )}
    >
      {/* Main thinking indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Animated dots */}
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-foreground/40"
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

          {/* Text */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-sm text-muted-foreground">
              Hemmi is thinking
            </span>
          </div>
        </div>

        {/* Expand button (if thinking text provided) */}
        {thinkingText && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{isExpanded ? "Hide" : "Show"} reasoning</span>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Expandable thinking content */}
      <AnimatePresence>
        {isExpanded && thinkingText && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {thinkingText}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Simple thinking shimmer for minimal UI
 */
export function ThinkingShimmer({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-foreground/40"
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

/**
 * Streaming text with cursor
 * Shows text being typed out with a blinking cursor
 */
interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingText({
  text,
  isStreaming,
  className,
}: StreamingTextProps) {
  return (
    <span className={className}>
      {text}
      {isStreaming && (
        <motion.span
          className="inline-block w-0.5 h-4 bg-foreground/60 ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </span>
  );
}
