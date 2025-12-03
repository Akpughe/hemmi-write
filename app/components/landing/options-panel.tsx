"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Button } from "@/app/components/ui/button";
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
  const selectedCitation = citationStyles.find((c) => c.id === brief.citationStyle);

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
    : writingStyles.filter((s) => !["narrative", "descriptive"].includes(s.id));

  const wordCountOptions = isResearchPaper
    ? [2000, 3000, 5000, 8000, 10000, 15000, 20000, 30000]
    : [500, 1000, 1500, 2000, 3000, 5000];

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {/* Academic Level - Only for Research Paper & Report */}
      {!isEssay && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-full border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/50">
              {selectedLevel?.label || "Academic Level"}
              <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[160px]">
            {academicLevels.map((level) => (
              <DropdownMenuItem
                key={level.id}
                onClick={() => onUpdate({ academicLevel: level.id })}
                className={
                  brief.academicLevel === level.id ? "bg-accent/10" : ""
                }>
                {level.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Writing Style */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 rounded-full border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/50">
            {selectedStyle?.label || "Writing Style"}
            <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[160px]">
          {availableStyles.map((style) => (
            <DropdownMenuItem
              key={style.id}
              onClick={() => onUpdate({ writingStyle: style.id })}
              className={brief.writingStyle === style.id ? "bg-accent/10" : ""}>
              {style.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Citation Style */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 rounded-full border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/50">
            {selectedCitation?.label || "Citation Style"}
            <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[140px]">
          {citationStyles.map((style) => (
            <DropdownMenuItem
              key={style.id}
              onClick={() => onUpdate({ citationStyle: style.id })}
              className={brief.citationStyle === style.id ? "bg-accent/10" : ""}>
              {style.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Chapters - Only for Research Paper */}
      {isResearchPaper && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-full border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/50">
              {brief.chapters ? `${brief.chapters} Chapters` : "Chapters"}
              <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[120px]">
            {[1, 2, 3, 4, 5].map((count) => (
              <DropdownMenuItem
                key={count}
                onClick={() => onUpdate({ chapters: count })}
                className={brief.chapters === count ? "bg-accent/10" : ""}>
                {count} {count === 1 ? "Chapter" : "Chapters"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Word Count */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 rounded-full border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/50">
            {brief.wordCount
              ? `${brief.wordCount.toLocaleString()} words`
              : "Word Count"}
            <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[140px]">
          {wordCountOptions.map((count) => (
            <DropdownMenuItem
              key={count}
              onClick={() => onUpdate({ wordCount: count })}
              className={brief.wordCount === count ? "bg-accent/10" : ""}>
              {count.toLocaleString()} words
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sources Toggle & Count */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdate({ includeSources: !brief.includeSources })}
          className={`h-9 px-4 rounded-full border-border transition-colors ${
            brief.includeSources
              ? "bg-accent/10 text-accent border-accent/50"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}>
          Include Sources
        </Button>

        {brief.includeSources && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-full border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/50">
                {brief.sourceCount ? `${brief.sourceCount} sources` : "Sources"}
                <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[120px]">
              {[5, 10, 15, 20, 30].map((count) => (
                <DropdownMenuItem
                  key={count}
                  onClick={() => onUpdate({ sourceCount: count })}
                  className={brief.sourceCount === count ? "bg-accent/10" : ""}>
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
