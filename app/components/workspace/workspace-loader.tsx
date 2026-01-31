"use client";

import { cn } from "@/lib/utils";

interface WorkspaceLoaderProps {
  message?: string;
  className?: string;
}

export function WorkspaceLoader({
  message = "Loading",
  className,
}: WorkspaceLoaderProps) {
  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center bg-background",
        className
      )}>
      {/* Minimal animated loader */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer ring - slow rotation */}
        <div className="absolute w-12 h-12 rounded-full border border-border/40 animate-[spin_3s_linear_infinite]" />

        {/* Inner ring - faster rotation, opposite direction */}
        <div className="absolute w-8 h-8 rounded-full border border-primary/30 animate-[spin_2s_linear_infinite_reverse]" />

        {/* Center dot - pulsing */}
        <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
      </div>

      {/* Message with subtle animation */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground/70 font-medium tracking-wide">
        <span>{message}</span>
        <span className="flex gap-[2px] ml-0.5">
          <span
            className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "1s" }}
          />
          <span
            className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: "150ms", animationDuration: "1s" }}
          />
          <span
            className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: "300ms", animationDuration: "1s" }}
          />
        </span>
      </div>
    </div>
  );
}
