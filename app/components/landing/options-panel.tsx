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
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200",
                "text-sm font-medium",
                "bg-transparent text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
              )}>
              {selectedLevel?.label || "Academic Level"}
              <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[160px]">
            {academicLevels.map((level) => (
              <DropdownMenuItem
                key={level.id}
                onClick={() => onUpdate({ academicLevel: level.id })}
                className="focus:bg-black focus:text-white focus:ring-0 focus:outline-none dark:focus:bg-white dark:focus:text-black">
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
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200",
                "text-sm font-medium",
                "bg-transparent text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
              )}>
              {selectedStyle?.label || "Writing Style"}
              <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[160px]">
            {availableStyles.map((style) => (
              <DropdownMenuItem
                key={style.id}
                onClick={() => onUpdate({ writingStyle: style.id })}
                className="focus:bg-black focus:text-white focus:ring-0 focus:outline-none dark:focus:bg-white dark:focus:text-black">
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
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200",
                "text-sm font-medium",
                "bg-transparent text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
              )}>
              {selectedCitation?.label || "Citation Style"}
              <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[140px]">
            {citationStyles.map((style) => (
              <DropdownMenuItem
                key={style.id}
                onClick={() => onUpdate({ citationStyle: style.id })}
                className="focus:bg-black focus:text-white focus:ring-0 focus:outline-none dark:focus:bg-white dark:focus:text-black">
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
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200",
                "text-sm font-medium",
                "bg-transparent text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
              )}>
              {brief.chapters ? `${brief.chapters} Chapters` : "Chapters"}
              <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[120px]">
            {[1, 2, 3, 4, 5].map((count) => (
              <DropdownMenuItem
                key={count}
                onClick={() => onUpdate({ chapters: count })}
                className="focus:bg-black focus:text-white focus:ring-0 focus:outline-none dark:focus:bg-white dark:focus:text-black">
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
              "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200",
              "text-sm font-medium",
              "bg-transparent text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
            )}>
            {brief.wordCount
              ? `${brief.wordCount.toLocaleString()} words`
              : "Word Count"}
            <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[140px]">
          {wordCountOptions.map((count) => (
            <DropdownMenuItem
              key={count}
              onClick={() => onUpdate({ wordCount: count })}
              className="focus:bg-black focus:text-white focus:ring-0 focus:outline-none dark:focus:bg-white dark:focus:text-black">
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
            "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200",
            "text-sm font-medium",
            brief.includeSources
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
          )}>
          Include Sources
        </button>

        {brief.includeSources && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200",
                  "text-sm font-medium",
                  "bg-transparent text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
                )}>
                {brief.sourceCount ? `${brief.sourceCount} sources` : "Sources"}
                <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[120px]">
              {[5, 10, 15, 20, 30].map((count) => (
                <DropdownMenuItem
                  key={count}
                  onClick={() => onUpdate({ sourceCount: count })}
                  className="focus:bg-black focus:text-white focus:ring-0 focus:outline-none dark:focus:bg-white dark:focus:text-black">
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
