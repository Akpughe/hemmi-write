"use client";

import { ArrowLeft, Check, Circle, Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { Spinner } from "@/app/components/ui/spinner";
import { Switch } from "@/app/components/ui/switch";
import { TokenBalance } from "@/app/components/subscription/token-balance";
import type { WritingBrief, WorkflowStep } from "@/lib/types/ui";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

interface WorkspaceHeaderProps {
  brief: WritingBrief;
  currentStep: WorkflowStep;
  isFetching?: boolean;
  onUpgradeClick?: () => void;
  autoApprove?: boolean;
  onAutoApproveChange?: (enabled: boolean) => void;
}

const steps: { id: WorkflowStep; label: string }[] = [
  { id: "research", label: "Research" },
  { id: "planning", label: "Planning" },
  { id: "writing", label: "Writing" },
  { id: "complete", label: "Complete" },
];

export function WorkspaceHeader({
  brief,
  currentStep,
  isFetching = false,
  onUpgradeClick,
  autoApprove = false,
  onAutoApproveChange,
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <header className="h-14 border-b border-border px-4 flex items-center justify-between bg-card">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="sr-only">Back</span>
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent/20 flex items-center justify-center">
            <span className="text-accent text-xs font-bold">N</span>
          </div>
          <span className="font-medium text-sm truncate max-w-[200px]">
            {brief.topic}
          </span>
        </div>
      </div>
      {/* Progress steps */}
      <div className="flex items-center gap-1">
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = step.id === currentStep;
          const isPending = index > currentIndex;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  isComplete && "text-accent",
                  isCurrent && "bg-foreground text-background",
                  isPending && "text-muted-foreground"
                )}>
                {isComplete && <Check className="w-3 h-3" />}
                {isCurrent && step.id !== "complete" && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                {isCurrent && step.id === "complete" && (
                  <Check className="w-3 h-3" />
                )}
                {isPending && <Circle className="w-3 h-3" />}
                <span>{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-px mx-1",
                    index < currentIndex ? "bg-accent" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Auto-Approve Toggle - Only show during writing step */}
      {currentStep === "writing" && (
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Auto</span>
                  <Switch
                    checked={autoApprove}
                    onCheckedChange={onAutoApproveChange}
                    className="ml-1"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Automatically continue generating sections without manual approval</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div className="flex items-center gap-4">
        {isFetching && (
          <div
            className="flex items-center gap-2 text-muted-foreground"
            title="Syncing data...">
            <Spinner className="w-4 h-4" />
          </div>
        )}
        <div onClick={onUpgradeClick} className="cursor-pointer">
          <TokenBalance variant="compact" onLowBalance={onUpgradeClick} />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
