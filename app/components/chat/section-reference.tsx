"use client";

import * as React from "react";
import { FileText, ArrowRight, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SectionReference } from "@/lib/utils/sectionReferenceParser";

interface SectionLinkProps {
  /** The section reference data */
  reference: SectionReference;
  /** Click handler for navigation */
  onClick?: (reference: SectionReference) => void;
  /** Additional CSS classes */
  className?: string;
  /** Optional display text override */
  displayText?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * SectionLink Component
 * Shows a section name as a clickable pill/badge with navigation
 * Premium AI-style design
 */
export function SectionLink({
  reference,
  onClick,
  className,
  displayText,
  size = "sm",
}: SectionLinkProps) {
  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClick?.(reference);
    },
    [onClick, reference]
  );

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3 py-1.5 text-sm gap-2",
    lg: "px-4 py-2 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              "group inline-flex items-center",
              "font-medium rounded-lg",
              "bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10",
              "dark:from-violet-500/20 dark:via-purple-500/15 dark:to-fuchsia-500/20",
              "text-violet-700 dark:text-violet-300",
              "hover:from-violet-500/20 hover:via-purple-500/20 hover:to-fuchsia-500/20",
              "dark:hover:from-violet-500/30 dark:hover:via-purple-500/25 dark:hover:to-fuchsia-500/30",
              "active:scale-[0.98]",
              "transition-all duration-200 ease-out",
              "cursor-pointer",
              "align-baseline",
              "border border-violet-200/60 dark:border-violet-500/30",
              "hover:border-violet-300 dark:hover:border-violet-400/40",
              "shadow-sm hover:shadow-md hover:shadow-violet-500/10",
              "backdrop-blur-sm",
              sizeClasses[size],
              className
            )}
            aria-label={`Navigate to ${reference.sectionName}`}
          >
            <FileText className={cn(iconSizes[size], "opacity-60 group-hover:opacity-80 transition-opacity")} />
            <span className="truncate max-w-[200px]">
              {displayText || reference.sectionName}
            </span>
            <ArrowRight className={cn(
              iconSizes[size],
              "opacity-0 -ml-1 group-hover:opacity-60 group-hover:ml-0",
              "transition-all duration-200"
            )} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          sideOffset={8}
          className={cn(
            "z-50 overflow-hidden",
            "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
            "dark:from-slate-800 dark:via-slate-750 dark:to-slate-800",
            "border border-slate-700/50 dark:border-slate-600/50",
            "shadow-xl shadow-black/20",
            "rounded-xl",
            "px-4 py-3",
            "backdrop-blur-xl",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-md bg-violet-500/20">
                <Sparkles className="w-3 h-3 text-violet-400" />
              </div>
              <span className="text-xs font-semibold text-white">Jump to Section</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-[200px]">
              Click to scroll and highlight this section in your document
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-violet-500/5 to-transparent pointer-events-none" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * SectionLink Badge - Compact inline version
 * Used for inline section references in chat messages
 * Premium AI-style design
 */
interface SectionLinkBadgeProps {
  reference: SectionReference;
  onClick?: (reference: SectionReference) => void;
  className?: string;
}

export function SectionLinkBadge({
  reference,
  onClick,
  className,
}: SectionLinkBadgeProps) {
  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClick?.(reference);
    },
    [onClick, reference]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              "group inline-flex items-center gap-1",
              "px-2 py-0.5 mx-0.5",
              "text-xs font-medium",
              "bg-gradient-to-r from-violet-500/10 to-purple-500/10",
              "dark:from-violet-500/15 dark:to-purple-500/15",
              "text-violet-700 dark:text-violet-300",
              "rounded-md",
              "hover:from-violet-500/20 hover:to-purple-500/20",
              "dark:hover:from-violet-500/25 dark:hover:to-purple-500/25",
              "border border-violet-200/50 dark:border-violet-500/25",
              "hover:border-violet-300/70 dark:hover:border-violet-400/40",
              "shadow-sm hover:shadow-md hover:shadow-violet-500/10",
              "transition-all duration-200 ease-out",
              "active:scale-[0.97]",
              "cursor-pointer",
              "align-baseline",
              "backdrop-blur-sm",
              className
            )}
            aria-label={`Navigate to ${reference.sectionName}`}
          >
            <span className="text-violet-500/70 dark:text-violet-400/70 font-semibold">§</span>
            <span className="truncate max-w-[180px]">{reference.sectionName}</span>
            <ArrowRight className="w-2.5 h-2.5 opacity-0 -ml-0.5 group-hover:opacity-50 group-hover:ml-0 transition-all duration-200" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          sideOffset={6}
          className={cn(
            "z-50 overflow-hidden",
            "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
            "dark:from-slate-800 dark:via-slate-750 dark:to-slate-800",
            "border border-slate-700/50 dark:border-slate-600/50",
            "shadow-xl shadow-black/20",
            "rounded-xl",
            "px-4 py-3",
            "backdrop-blur-xl",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-md bg-violet-500/20">
                <Sparkles className="w-3 h-3 text-violet-400" />
              </div>
              <span className="text-xs font-semibold text-white">Jump to Section</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-[200px]">
              Click to scroll and highlight this section in your document
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-violet-500/5 to-transparent pointer-events-none" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * SectionLink Group
 * Displays multiple section links in a row
 * Premium AI-style design
 */
interface SectionLinkGroupProps {
  references: SectionReference[];
  onClick?: (reference: SectionReference) => void;
  className?: string;
}

export function SectionLinkGroup({
  references,
  onClick,
  className,
}: SectionLinkGroupProps) {
  if (references.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        "mt-3 pt-3",
        "border-t border-gradient-to-r from-violet-200/30 via-purple-200/30 to-transparent",
        "dark:border-violet-500/20",
        className
      )}
    >
      <span className="text-xs font-medium text-muted-foreground/70 mr-1 flex items-center gap-1.5">
        <FileText className="w-3 h-3" />
        Sections
      </span>
      {references.map((ref, index) => (
        <SectionLinkBadge
          key={`${ref.sectionId}-${index}`}
          reference={ref}
          onClick={onClick}
        />
      ))}
    </div>
  );
}
