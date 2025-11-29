"use client";

import type React from "react";

import { useState } from "react";
import { ArrowUp, Settings2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  topic: string;
  setTopic: (value: string) => void;
  instructions: string;
  setInstructions: (value: string) => void;
  onSubmit: () => void;
}

export function PromptInput({
  topic,
  setTopic,
  instructions,
  setInstructions,
  onSubmit,
}: PromptInputProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
      {/* Main topic input */}
      <div className="relative">
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your topic or research question..."
          className="w-full bg-transparent px-5 py-4 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[60px] text-base"
          rows={2}
        />
      </div>

      {/* Instructions collapse */}
      {showInstructions && (
        <div className="border-t border-border">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Add specific instructions, requirements, or context..."
            className="w-full bg-transparent px-5 py-3 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none text-sm"
            rows={3}
          />
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstructions(!showInstructions)}
            className={cn(
              "h-8 px-3 text-muted-foreground hover:text-foreground gap-2",
              showInstructions && "text-accent"
            )}>
            <Settings2 className="w-4 h-4" />
            <span className="text-sm">Instructions</span>
          </Button>
        </div>

        <Button
          onClick={onSubmit}
          disabled={!topic.trim()}
          size="icon"
          className="h-8 w-8 rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30">
          <ArrowUp className="w-4 h-4" />
          <span className="sr-only">Submit</span>
        </Button>
      </div>
    </div>
  );
}
