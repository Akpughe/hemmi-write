"use client";

import { X, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { WorkflowStep } from "@/lib/types/ui";

interface SourceAdditionBannerProps {
  sourceName: string;
  workflowStep: WorkflowStep;
  onRegenerateStructure: () => void;
  onAnalyzeImpact: () => void;
  onDismiss: () => void;
  isProcessing: boolean;
}

export function SourceAdditionBanner({
  sourceName,
  workflowStep,
  onRegenerateStructure,
  onAnalyzeImpact,
  onDismiss,
  isProcessing,
}: SourceAdditionBannerProps) {
  // Don't show banner in research step
  if (workflowStep === "research") {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-sm text-foreground">
            New source added: {sourceName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {workflowStep === "planning"
              ? "Regenerate structure to incorporate this source?"
              : "Analyze which sections would benefit from this source?"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            disabled={isProcessing}
            className="h-8">
            Later
          </Button>
          {workflowStep === "planning" ? (
            <Button
              onClick={onRegenerateStructure}
              disabled={isProcessing}
              size="sm"
              className="gap-2 h-8 bg-blue-600 hover:bg-blue-700 text-white">
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate Structure
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={onAnalyzeImpact}
              disabled={isProcessing}
              size="sm"
              className="gap-2 h-8 bg-blue-600 hover:bg-blue-700 text-white">
              {isProcessing ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Analyze Impact
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
