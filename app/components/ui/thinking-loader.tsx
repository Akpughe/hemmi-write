"use client";

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface ThinkingLoaderProps {
  className?: string;
}

export function ThinkingLoader({ className }: ThinkingLoaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className
      )}>
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 animate-pulse text-indigo-500" />
        <span className="font-medium">Thinking</span>
        <span className="flex gap-0.5">
          <span className="animate-bounce delay-0">.</span>
          <span className="animate-bounce delay-150">.</span>
          <span className="animate-bounce delay-300">.</span>
        </span>
      </div>
    </div>
  );
}
