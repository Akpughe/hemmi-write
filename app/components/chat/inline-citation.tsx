"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { ChatCitation } from "@/lib/types/chat";
import { cn } from "@/lib/utils";

interface InlineCitationProps {
  citation: ChatCitation;
  className?: string;
}

/**
 * Inline citation pill component
 * Shows a clickable [1] marker that reveals source details on click/hover
 */
export function InlineCitation({ citation, className }: InlineCitationProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center",
            "px-1.5 py-0.5 mx-0.5",
            "text-xs font-medium",
            "bg-blue-100 dark:bg-blue-900/30",
            "text-blue-700 dark:text-blue-300",
            "rounded-md",
            "hover:bg-blue-200 dark:hover:bg-blue-800/40",
            "transition-colors duration-150",
            "cursor-pointer",
            "align-baseline",
            className
          )}
          aria-label={`Citation ${citation.number}: ${citation.title}`}
        >
          [{citation.number}]
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        side="top"
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col">
          {/* Header with hostname badge */}
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
            <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 bg-background rounded">
              {citation.hostname}
            </span>
          </div>

          {/* Content */}
          <div className="p-3 space-y-2">
            {/* Title */}
            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {citation.title}
            </h4>

            {/* Snippet */}
            {citation.snippet && (
              <p className="text-xs text-muted-foreground line-clamp-3">
                {citation.snippet}
              </p>
            )}

            {/* Link */}
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
            >
              <ExternalLink className="h-3 w-3" />
              View source
            </a>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Citation badge showing multiple sources
 * Used at the end of a response to show all citations
 */
interface CitationBadgeProps {
  citations: ChatCitation[];
  className?: string;
}

export function CitationBadge({ citations, className }: CitationBadgeProps) {
  if (citations.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 mt-2 pt-2 border-t border-border/50",
        className
      )}
    >
      <span className="text-xs text-muted-foreground mr-1">Sources:</span>
      {citations.map((citation) => (
        <InlineCitation key={citation.number} citation={citation} />
      ))}
    </div>
  );
}
