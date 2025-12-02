"use client";

import { Button } from "@/app/components/ui/button";
import { Check, X, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";

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
          : "sticky bottom-4 left-0 right-0 mx-auto max-w-3xl px-4 slide-in-from-bottom-4"
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
      <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
          {mode === "improve" ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Suggested Improvement</span>
            </>
          ) : (
            <>
              <Info className="w-3.5 h-3.5 text-amber-500" />
              <span>Explanation</span>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-4 max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-foreground">
              {content}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-muted/20 border-t border-border">
          {mode === "improve" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
                className="gap-2 h-8">
                <X className="w-3.5 h-3.5" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={onApprove}
                className="gap-2 h-8 bg-indigo-600 hover:bg-indigo-700 text-white">
                <Check className="w-3.5 h-3.5" />
                Approve
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
