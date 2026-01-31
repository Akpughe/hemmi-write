"use client";

import * as React from "react";
import { ExternalLink, Copy, Globe, FileText, BookOpen, Newspaper, Video, Check, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { ChatCitation, SourceType } from "@/lib/types/chat";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface InlineCitationProps {
  citation: ChatCitation;
  className?: string;
  variant?: "pill" | "compact";
}

/**
 * Get the appropriate icon for a source type
 */
function getSourceIcon(sourceType?: SourceType) {
  const iconClass = "w-3 h-3";
  switch (sourceType) {
    case "pdf":
      return <FileText className={iconClass} />;
    case "journal":
      return <BookOpen className={iconClass} />;
    case "news":
      return <Newspaper className={iconClass} />;
    case "video":
      return <Video className={iconClass} />;
    case "book":
      return <BookOpen className={iconClass} />;
    case "web":
    default:
      return <Globe className={iconClass} />;
  }
}

/**
 * Get the display label for a source type
 */
function getSourceTypeLabel(sourceType?: SourceType): string {
  switch (sourceType) {
    case "pdf":
      return "PDF Document";
    case "journal":
      return "Journal Article";
    case "news":
      return "News Article";
    case "video":
      return "Video";
    case "book":
      return "Book";
    case "web":
      return "Web Source";
    default:
      return "Source";
  }
}

/**
 * Get premium gradient color scheme based on source type
 */
function getSourceColors(sourceType?: SourceType) {
  switch (sourceType) {
    case "pdf":
      return {
        gradient: "from-rose-500/15 to-red-500/15",
        hoverGradient: "hover:from-rose-500/25 hover:to-red-500/25",
        text: "text-rose-600 dark:text-rose-400",
        border: "border-rose-300/50 dark:border-rose-500/30",
        icon: "text-rose-500 dark:text-rose-400",
        badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      };
    case "journal":
      return {
        gradient: "from-amber-500/15 to-orange-500/15",
        hoverGradient: "hover:from-amber-500/25 hover:to-orange-500/25",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-300/50 dark:border-amber-500/30",
        icon: "text-amber-500 dark:text-amber-400",
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      };
    case "news":
      return {
        gradient: "from-sky-500/15 to-blue-500/15",
        hoverGradient: "hover:from-sky-500/25 hover:to-blue-500/25",
        text: "text-sky-600 dark:text-sky-400",
        border: "border-sky-300/50 dark:border-sky-500/30",
        icon: "text-sky-500 dark:text-sky-400",
        badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      };
    case "video":
      return {
        gradient: "from-purple-500/15 to-violet-500/15",
        hoverGradient: "hover:from-purple-500/25 hover:to-violet-500/25",
        text: "text-purple-600 dark:text-purple-400",
        border: "border-purple-300/50 dark:border-purple-500/30",
        icon: "text-purple-500 dark:text-purple-400",
        badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      };
    case "book":
      return {
        gradient: "from-emerald-500/15 to-teal-500/15",
        hoverGradient: "hover:from-emerald-500/25 hover:to-teal-500/25",
        text: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-300/50 dark:border-emerald-500/30",
        icon: "text-emerald-500 dark:text-emerald-400",
        badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      };
    case "web":
    default:
      return {
        gradient: "from-slate-500/15 to-gray-500/15",
        hoverGradient: "hover:from-slate-500/25 hover:to-gray-500/25",
        text: "text-slate-600 dark:text-slate-400",
        border: "border-slate-300/50 dark:border-slate-500/30",
        icon: "text-slate-500 dark:text-slate-400",
        badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
      };
  }
}

/**
 * Premium inline citation pill with source type icon
 */
export function InlineCitation({ citation, className, variant = "pill" }: Readonly<InlineCitationProps>) {
  const colors = getSourceColors(citation.sourceType);
  const [copied, setCopied] = React.useState(false);

  const handleCopyCitation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const citationText = `${citation.title} - ${citation.url}`;
    navigator.clipboard.writeText(citationText);
    setCopied(true);
    toast.success("Citation copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const buttonClasses = cn(
    "group inline-flex items-center gap-1.5",
    "font-medium",
    "rounded-lg",
    "bg-gradient-to-r",
    colors.gradient,
    colors.hoverGradient,
    colors.text,
    "border",
    colors.border,
    "shadow-sm hover:shadow-md",
    "transition-all duration-200 ease-out",
    "active:scale-[0.97]",
    "cursor-pointer",
    "align-middle",
    "backdrop-blur-sm",
    variant === "compact" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
    className
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={buttonClasses} aria-label={`Citation ${citation.number}: ${citation.title}`}>
          <span className={cn("transition-transform group-hover:scale-110", colors.icon)}>
            {getSourceIcon(citation.sourceType)}
          </span>
          <span className="font-semibold">[{citation.number}]</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-80 p-0 overflow-hidden",
          "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
          "border border-slate-700/50",
          "shadow-2xl shadow-black/30",
          "rounded-xl",
          "backdrop-blur-xl",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        side="top"
        align="start"
        sideOffset={8}
      >
        <CitationPopoverContent citation={citation} onCopy={handleCopyCitation} copied={copied} />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Premium popover content for citation details
 */
interface CitationPopoverContentProps {
  citation: ChatCitation;
  onCopy?: (e: React.MouseEvent) => void;
  copied?: boolean;
}

function CitationPopoverContent({ citation, onCopy, copied }: Readonly<CitationPopoverContentProps>) {
  const colors = getSourceColors(citation.sourceType);
  const typeLabel = getSourceTypeLabel(citation.sourceType);

  return (
    <div className="flex flex-col relative">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-violet-500/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <span className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg",
          colors.badge
        )}>
          {getSourceIcon(citation.sourceType)}
          {typeLabel}
        </span>
        <span className="text-xs text-slate-400 truncate flex-1">
          {citation.hostname}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h4 className="font-semibold text-sm leading-snug text-white line-clamp-2">
          {citation.title}
        </h4>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium",
              "bg-violet-500/20 hover:bg-violet-500/30",
              "text-violet-300 hover:text-violet-200",
              "rounded-lg",
              "transition-all duration-200",
              "active:scale-[0.97]"
            )}
          >
            <ExternalLink className="h-3 w-3" />
            View source
          </a>
          <button
            onClick={onCopy}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium",
              "bg-white/5 hover:bg-white/10",
              "text-slate-400 hover:text-slate-300",
              "rounded-lg",
              "transition-all duration-200",
              "active:scale-[0.97]"
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Premium citation badge showing multiple sources
 */
interface CitationBadgeProps {
  citations: ChatCitation[];
  className?: string;
  variant?: "compact" | "full";
}

export function CitationBadge({ citations, className, variant = "compact" }: Readonly<CitationBadgeProps>) {
  if (citations.length === 0) return null;

  return (
    <div className={cn(
      "flex flex-col gap-2.5 mt-4 pt-3",
      "border-t border-slate-200/10 dark:border-slate-700/30",
      className
    )}>
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-violet-500/20">
          <Sparkles className="w-3 h-3 text-violet-400" />
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {citations.length} {citations.length === 1 ? "Source" : "Sources"} Referenced
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {citations.map((citation) => (
          <InlineCitation
            key={citation.number}
            citation={citation}
            variant={variant === "compact" ? "compact" : "pill"}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Premium sources panel - Shows all citations in an expandable format
 */
interface SourcesPanelProps {
  citations: ChatCitation[];
  className?: string;
}

export function SourcesPanel({ citations, className }: Readonly<SourcesPanelProps>) {
  if (citations.length === 0) return null;

  return (
    <div className={cn("mt-4 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-violet-500/20">
          <Sparkles className="w-3 h-3 text-violet-400" />
        </div>
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Sources ({citations.length})
        </h4>
      </div>
      <div className="grid gap-2">
        {citations.map((citation) => {
          const colors = getSourceColors(citation.sourceType);
          return (
            <a
              key={citation.number}
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group flex items-start gap-3 p-3 rounded-xl",
                "bg-gradient-to-r from-slate-100/50 to-slate-50/50",
                "dark:from-slate-800/50 dark:to-slate-900/50",
                "border border-slate-200/50 dark:border-slate-700/30",
                "hover:border-violet-300/50 dark:hover:border-violet-500/30",
                "hover:shadow-md hover:shadow-violet-500/5",
                "transition-all duration-200"
              )}
            >
              <span className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                "bg-gradient-to-br",
                colors.gradient,
                colors.text
              )}>
                {getSourceIcon(citation.sourceType)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-xs font-semibold px-1.5 py-0.5 rounded",
                    colors.badge
                  )}>
                    [{citation.number}]
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {citation.hostname}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {citation.title}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-violet-500 transition-colors shrink-0 mt-1" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
