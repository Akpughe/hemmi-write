"use client";

import { Button } from "@/app/components/ui/button";
import { Sparkles, MessageSquare, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onImprove: () => void;
  onAskAI: () => void;
  onExplain: () => void;
}

export function FloatingToolbar({
  isVisible,
  position,
  onImprove,
  onAskAI,
  onExplain,
}: FloatingToolbarProps) {
  return (
    <div
      className={cn(
        "fixed z-50 flex items-center gap-1 p-1 bg-background border border-border rounded-lg shadow-lg transition-all duration-200 ease-in-out",
        isVisible
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-2 scale-95 pointer-events-none"
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -100%) ${
          !isVisible ? "translateY(8px) scale(0.95)" : ""
        }`,
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing focus from editor
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onImprove}
        className="h-8 gap-2 text-xs font-medium hover:bg-muted">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        Improve
      </Button>

      <div className="w-px h-4 bg-border mx-0.5" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onAskAI}
        className="h-8 gap-2 text-xs font-medium hover:bg-muted">
        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
        Ask A.I.
      </Button>

      <div className="w-px h-4 bg-border mx-0.5" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onExplain}
        className="h-8 gap-2 text-xs font-medium hover:bg-muted">
        <Info className="w-3.5 h-3.5 text-amber-500" />
        Explain
      </Button>
    </div>
  );
}
