"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { WritingBrief } from "@/lib/types/ui";

const academicLevels = [
  { id: "high-school", label: "High School" },
  { id: "undergraduate", label: "Undergraduate" },
  { id: "graduate", label: "Graduate" },
  { id: "doctoral", label: "Doctoral" },
  { id: "professional", label: "Professional" },
] as const;

const writingStyles = [
  { id: "analytical", label: "Analytical" },
  { id: "argumentative", label: "Argumentative" },
  { id: "descriptive", label: "Descriptive" },
  { id: "expository", label: "Expository" },
  { id: "narrative", label: "Narrative" },
] as const;

const citationStyles = [
  { id: "APA", label: "APA" },
  { id: "MLA", label: "MLA" },
  { id: "HARVARD", label: "Harvard" },
  { id: "CHICAGO", label: "Chicago" },
  { id: "IEEE", label: "IEEE" },
] as const;

interface OptionsPanelProps {
  brief: Partial<WritingBrief>;
  onUpdate: (updates: Partial<WritingBrief>) => void;
}

export function OptionsPanel({ brief, onUpdate }: OptionsPanelProps) {
  const selectedLevel = academicLevels.find(
    (l) => l.id === brief.academicLevel
  );
  const selectedStyle = writingStyles.find((s) => s.id === brief.writingStyle);
  const selectedCitation = citationStyles.find(
    (c) => c.id === brief.citationStyle
  );

  // Dynamic options based on document type
  const isResearchPaper = brief.documentType === "research-paper";
  const isEssay = brief.documentType === "essay";

  // Filter styles based on document type
  const availableStyles = isEssay
    ? writingStyles.filter((s) =>
        [
          "analytical",
          "argumentative",
          "descriptive",
          "expository",
          "narrative",
        ].includes(s.id)
      )
    : writingStyles;

  const wordCountOptions = isResearchPaper
    ? [2000, 3000, 5000, 8000, 10000, 15000, 20000, 30000]
    : [500, 1000, 1500, 2000, 3000, 5000];

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {/* Academic Level - Only for Research Paper & Report */}
      {!isEssay && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border border-border transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                "text-xs font-semibold uppercase tracking-[0.12em]",
                "bg-background text-foreground/60 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                "active:scale-[0.98]"
              )}>
              {selectedLevel?.label || "Academic Level"}
              <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="p-1.5 min-w-[160px] rounded-xl border-muted/20">
            {academicLevels.map((level) => (
              <DropdownMenuItem
                key={level.id}
                onClick={() => onUpdate({ academicLevel: level.id })}
                className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors focus:bg-muted/50 focus:text-foreground cursor-pointer outline-none">
                {level.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Writing Style - Only for Essay */}
      {isEssay && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border border-border transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                "text-xs font-semibold uppercase tracking-[0.12em]",
                "bg-background text-foreground/60 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                "active:scale-[0.98]"
              )}>
              {selectedStyle?.label || "Writing Style"}
              <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="p-1.5 min-w-[160px] rounded-xl border-muted/20">
            {availableStyles.map((style) => (
              <DropdownMenuItem
                key={style.id}
                onClick={() => onUpdate({ writingStyle: style.id })}
                className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors focus:bg-muted/50 focus:text-foreground cursor-pointer outline-none">
                {style.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Citation Style - Only for Research Paper & Report */}
      {!isEssay && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border border-border transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                "text-xs font-semibold uppercase tracking-[0.12em]",
                "bg-background text-foreground/60 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                "active:scale-[0.98]"
              )}>
              {selectedCitation?.label || "Citation Style"}
              <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="p-1.5 min-w-[140px] rounded-xl border-muted/20">
            {citationStyles.map((style) => (
              <DropdownMenuItem
                key={style.id}
                onClick={() => onUpdate({ citationStyle: style.id })}
                className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors focus:bg-muted/50 focus:text-foreground cursor-pointer outline-none">
                {style.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Chapters - Only for Research Paper */}
      {isResearchPaper && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border border-border transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                "text-xs font-semibold uppercase tracking-[0.12em]",
                "bg-background text-foreground/60 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                "active:scale-[0.98]"
              )}>
              {brief.chapters ? `${brief.chapters} Chapters` : "Chapters"}
              <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="p-1.5 min-w-[120px] rounded-xl border-muted/20">
            {[1, 2, 3, 4, 5].map((count) => (
              <DropdownMenuItem
                key={count}
                onClick={() => onUpdate({ chapters: count })}
                className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors focus:bg-muted/50 focus:text-foreground cursor-pointer outline-none">
                {count} {count === 1 ? "Chapter" : "Chapters"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Word Count */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border border-border transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
              "text-xs font-semibold uppercase tracking-[0.12em]",
              "bg-background text-foreground/60 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
              "active:scale-[0.98]"
            )}>
            {brief.wordCount
              ? `${brief.wordCount.toLocaleString()} words`
              : "Word Count"}
            <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="p-1.5 min-w-[140px] rounded-xl border-muted/20">
          {wordCountOptions.map((count) => (
            <DropdownMenuItem
              key={count}
              onClick={() => onUpdate({ wordCount: count })}
              className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors focus:bg-muted/50 focus:text-foreground cursor-pointer outline-none">
              {count.toLocaleString()} words
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sources Toggle & Count */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdate({ includeSources: !brief.includeSources })}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
            "text-xs font-semibold uppercase tracking-[0.12em]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "active:scale-[0.98]",
            brief.includeSources
              ? "bg-foreground text-background shadow-sm shadow-foreground/10"
              : "border border-border text-foreground/60 hover:bg-muted hover:text-foreground"
          )}>
          Include Sources
        </button>

        {brief.includeSources && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border border-border transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                  "text-xs font-semibold uppercase tracking-[0.12em]",
                  "bg-background text-foreground/60 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                  "active:scale-[0.98]"
                )}>
                {brief.sourceCount ? `${brief.sourceCount} sources` : "Sources"}
                <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="p-1.5 min-w-[120px] rounded-xl border-muted/20">
              {[5, 10, 15, 20, 30].map((count) => (
                <DropdownMenuItem
                  key={count}
                  onClick={() => onUpdate({ sourceCount: count })}
                  className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors focus:bg-muted/50 focus:text-foreground cursor-pointer outline-none">
                  {count} sources
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
