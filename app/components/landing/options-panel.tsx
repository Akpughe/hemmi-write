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

interface OptionsPanelProps {
  brief: Partial<WritingBrief>;
  onUpdate: (updates: Partial<WritingBrief>) => void;
}

export function OptionsPanel({ brief, onUpdate }: OptionsPanelProps) {
  const selectedLevel = academicLevels.find(
    (l) => l.id === brief.academicLevel
  );
  const selectedStyle = writingStyles.find((s) => s.id === brief.writingStyle);

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {/* Academic Level */}
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
          {writingStyles.map((style) => (
            <DropdownMenuItem
              key={style.id}
              onClick={() => onUpdate({ writingStyle: style.id })}
              className={brief.writingStyle === style.id ? "bg-accent/10" : ""}>
              {style.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Word Count */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 rounded-full border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/50">
            {brief.wordCount ? `${brief.wordCount} words` : "Word Count"}
            <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[140px]">
          {[1000, 2000, 3000, 5000, 8000, 10000].map((count) => (
            <DropdownMenuItem
              key={count}
              onClick={() => onUpdate({ wordCount: count })}
              className={brief.wordCount === count ? "bg-accent/10" : ""}>
              {count.toLocaleString()} words
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sources */}
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
    </div>
  );
}
