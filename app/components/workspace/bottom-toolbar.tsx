"use client";

import { Button } from "@/app/components/ui/button";
import { Check, X, Sparkles, Info } from "lucide-react";
import Markdown from "marked-react";
import { cn } from "@/lib/utils";
import { ThinkingLoader } from "@/app/components/ui/thinking-loader";

interface BottomToolbarProps {
  mode: "improve" | "explain" | null;
  content: string;
  position?: { x: number; y: number };
  isLoading?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onClose?: () => void;
}

export function BottomToolbar({
  mode,
  content,
  position,
  isLoading = false,
  onApprove,
  onReject,
  onClose,
}: BottomToolbarProps) {
  if (!mode) return null;

  return (
    <div
      className={cn(
        "z-40 animate-in fade-in zoom-in-95 duration-200",
        position
          ? "fixed w-[500px] max-w-[90vw]"
          : "sticky bottom-6 left-0 right-0 mx-auto max-w-2xl px-4 slide-in-from-bottom-4"
      )}
      style={
        position
          ? {
              top: position.y,
              left: position.x,
              transform: "translateX(-50%)",
            }
          : undefined
      }>
      <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          {mode === "improve" ? (
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>Suggested Improvement</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Info className="w-3.5 h-3.5" />
              </div>
              <span>Explanation</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <ThinkingLoader />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed">
              <Markdown>{content}</Markdown>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-3 py-2.5 bg-muted/30 border-t border-border/50">
          {mode === "improve" ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReject}
                className="gap-2 h-8 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                <X className="w-3.5 h-3.5" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={onApprove}
                className="gap-2 h-8 bg-foreground text-background hover:bg-foreground/90 shadow-sm">
                <Check className="w-3.5 h-3.5" />
                Replace Selection
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="h-8 px-4">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
