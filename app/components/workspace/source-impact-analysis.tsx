"use client";

import { useState } from "react";
import { X, Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ImpactAnalysisResult {
  sectionId: string;
  sectionTitle: string;
  relevanceScore: number;
  reasoning: string;
  recommended: boolean;
}

interface SourceImpactAnalysisProps {
  sourceName: string;
  results: ImpactAnalysisResult[];
  onRegenerateSections: (sectionIds: string[]) => void;
  onDismiss: () => void;
  isRegenerating: boolean;
}

export function SourceImpactAnalysis({
  sourceName,
  results,
  onRegenerateSections,
  onDismiss,
  isRegenerating,
}: SourceImpactAnalysisProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>(
    // Pre-select recommended sections
    results.filter((r) => r.recommended).map((r) => r.sectionId)
  );

  const toggleSection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 dark:text-green-400";
    if (score >= 0.6) return "text-blue-600 dark:text-blue-400";
    if (score >= 0.4) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-500 dark:text-gray-400";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
    if (score >= 0.6) return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
    if (score >= 0.4) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
    return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
  };

  // Sort by relevance score (highest first)
  const sortedResults = [...results].sort(
    (a, b) => b.relevanceScore - a.relevanceScore
  );

  return (
    <div className="border rounded-lg bg-card shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-base">Source Impact Analysis</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              "{sourceName}" is most relevant to:
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            disabled={isRegenerating}
            className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {sortedResults.map((result) => {
          const isSelected = selectedSections.includes(result.sectionId);

          return (
            <div
              key={result.sectionId}
              className={cn(
                "p-3 rounded-lg border transition-all cursor-pointer",
                result.recommended &&
                  "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20",
                isSelected && "ring-2 ring-blue-500 ring-offset-2"
              )}
              onClick={() => !isRegenerating && toggleSection(result.sectionId)}>
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSection(result.sectionId)}
                  disabled={isRegenerating}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {result.sectionTitle}
                    </span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        getScoreBadgeColor(result.relevanceScore)
                      )}>
                      {Math.round(result.relevanceScore * 100)}% match
                    </span>
                    {result.recommended && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {result.reasoning}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {selectedSections.length} section
            {selectedSections.length !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              disabled={isRegenerating}>
              Cancel
            </Button>
            <Button
              onClick={() => onRegenerateSections(selectedSections)}
              disabled={selectedSections.length === 0 || isRegenerating}
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              {isRegenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Regenerate {selectedSections.length} Section
                  {selectedSections.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
