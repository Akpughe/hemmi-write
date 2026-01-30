"use client";

import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

type TabValue = "recent" | "my-projects" | "archived";

interface ProjectsTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  onBrowseAll?: () => void;
}

// Shared tab button styles - extracted for consistency
const tabBaseStyles = cn(
  // Layout
  "relative inline-flex flex-1 sm:flex-none items-center justify-center",
  // Sizing
  "px-5 py-2.5 sm:px-6 sm:py-3",
  // Typography - slightly refined
  "text-xs sm:text-sm font-semibold uppercase tracking-[0.12em]",
  // Shape
  "rounded-full",
  // Transitions - cubic-bezier for Apple-like feel
  "transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  // Focus state - clean, accessible
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
);

// Active state - confident, not whispered
const tabActiveStyles = cn(
  "bg-foreground text-background",
  "shadow-sm shadow-foreground/10"
);

// Inactive state - good contrast, inviting hover
const tabInactiveStyles = cn(
  // Default: strong enough contrast (foreground/60 is ~0.58 lightness in dark, clear hierarchy)
  "text-foreground/60",
  // Hover: solid muted background, full foreground text
  "hover:bg-muted hover:text-foreground",
  // Active (pressed) state
  "active:scale-[0.98]"
);

export function ProjectsTabs({
  activeTab,
  onTabChange,
  onBrowseAll,
}: ProjectsTabsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Projects"
        className="inline-flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1.5 sm:gap-2 p-1 rounded-full bg-muted/50">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "recent"}
          onClick={() => onTabChange("recent")}
          className={cn(
            tabBaseStyles,
            activeTab === "recent" ? tabActiveStyles : tabInactiveStyles
          )}>
          <span>Recently viewed</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "my-projects"}
          onClick={() => onTabChange("my-projects")}
          className={cn(
            tabBaseStyles,
            activeTab === "my-projects" ? tabActiveStyles : tabInactiveStyles
          )}>
          <span>My projects</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "archived"}
          onClick={() => onTabChange("archived")}
          className={cn(
            tabBaseStyles,
            activeTab === "archived" ? tabActiveStyles : tabInactiveStyles
          )}>
          <span>Archived</span>
        </button>
      </div>

      {/* Browse all link */}
      {onBrowseAll && (
        <button
          type="button"
          onClick={onBrowseAll}
          className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] text-foreground/60 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-muted hover:text-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background group">
          <span>Browse all</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}
