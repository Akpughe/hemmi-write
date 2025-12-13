"use client";

import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

type TabValue = "recent" | "my-projects";

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
    <div className="flex items-center justify-between">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => onTabChange("recent")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "recent"
              ? "bg-accent/20 text-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}>
          Recently viewed
        </button>
        <button
          onClick={() => onTabChange("my-projects")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "my-projects"
              ? "bg-accent/20 text-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}>
          My projects
        </button>
      </div>

      {/* Browse all link */}
      {onBrowseAll && (
        <button
          onClick={onBrowseAll}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          Browse all
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}
