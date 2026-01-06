"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { cn } from "@/lib/utils";

export function ImprovementsPopover({
  trigger,
  title = "Improvements",
  contentClassName,
  children,
}: {
  trigger: React.ReactNode;
  title?: string;
  contentClassName?: string;
  children: (opts: { close: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className={cn(
          // Constrain popover height and allow internal scrolling for large content
          "w-[440px] p-0 overflow-hidden shadow-lg",
          "max-h-[80vh] h-[80vh] border-border bg-card",
          contentClassName
        )}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
            aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Make content area flexible so children with `h-full` / `flex-1` can scroll */}
        <div className="p-4 flex flex-col h-full min-h-0">
          {children({ close: () => setOpen(false) })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
