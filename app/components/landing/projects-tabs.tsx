"use client";

import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

type TabValue = "recent" | "my-projects" | "archived";

interface ProjectsTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  onBrowseAll?: () => void;
}

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
        className="inline-flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 sm:gap-6">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "recent"}
          onClick={() => onTabChange("recent")}
          className={cn(
            "relative inline-flex flex-1 sm:flex-none items-center justify-center rounded-full px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-[0.18em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            activeTab === "recent"
              ? "bg-accent/15 text-foreground shadow-sm shadow-accent/15 ring-1 ring-accent/25"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}>
          <span>Recently viewed</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "my-projects"}
          onClick={() => onTabChange("my-projects")}
          className={cn(
            "relative inline-flex flex-1 sm:flex-none items-center justify-center rounded-full px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-[0.18em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            activeTab === "my-projects"
              ? "bg-accent/15 text-foreground shadow-sm shadow-accent/15 ring-1 ring-accent/25"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}>
          <span>My projects</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "archived"}
          onClick={() => onTabChange("archived")}
          className={cn(
            "relative inline-flex flex-1 sm:flex-none items-center justify-center rounded-full px-6 py-3 text-xs sm:text-sm font-medium uppercase tracking-[0.18em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            activeTab === "archived"
              ? "bg-accent/15 text-foreground shadow-sm shadow-accent/15 ring-1 ring-accent/25"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}>
          <span>Archived</span>
        </button>
      </div>

      {/* Browse all link */}
      {onBrowseAll && (
        <button
          type="button"
          onClick={onBrowseAll}
          className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group">
          <span>Browse all</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}
