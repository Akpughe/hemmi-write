"use client";

import * as React from "react";
import { ChatCitation } from "@/lib/types/chat";
import { InlineCitation } from "@/app/components/chat/inline-citation";

/**
 * Parse inline markdown formatting (bold, italic, code, links)
 * Returns React nodes with proper formatting
 */
function parseInlineMarkdown(text: string, keyPrefix: string = ""): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let remaining = text;
  let keyCounter = 0;

  // Pattern to match markdown inline elements
  // Order matters: longer patterns first to avoid partial matches
  const patterns = [
    // Bold + Italic: ***text*** or ___text___
    { regex: /\*\*\*(.+?)\*\*\*|___(.+?)___/, render: (match: string) => <strong key={`${keyPrefix}-bi-${keyCounter++}`}><em>{match}</em></strong> },
    // Bold: **text** or __text__
    { regex: /\*\*(.+?)\*\*|__(.+?)__/, render: (match: string) => <strong key={`${keyPrefix}-b-${keyCounter++}`}>{match}</strong> },
    // Italic: *text* or _text_
    { regex: /\*(.+?)\*|_(.+?)_/, render: (match: string) => <em key={`${keyPrefix}-i-${keyCounter++}`}>{match}</em> },
    // Inline code: `code`
    { regex: /`([^`]+)`/, render: (match: string) => <code key={`${keyPrefix}-c-${keyCounter++}`} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 rounded text-sm font-mono">{match}</code> },
    // Links: [text](url)
    { regex: /\[([^\]]+)\]\(([^)]+)\)/, render: (text: string, url: string) => <a key={`${keyPrefix}-a-${keyCounter++}`} href={url} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline">{text}</a> },
  ];

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; node: React.ReactNode } | null = null;

    // Find the earliest match among all patterns
    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match && match.index !== undefined) {
        const matchIndex = match.index;
        if (earliestMatch === null || matchIndex < earliestMatch.index) {
          let node: React.ReactNode;

          // Handle link pattern specially (has two capture groups)
          if (pattern.regex.source.includes('\\]\\(')) {
            node = (pattern.render as (text: string, url: string) => React.ReactNode)(match[1], match[2]);
          } else {
            // For other patterns, use the first non-undefined capture group
            const capturedText = match[1] || match[2];
            node = (pattern.render as (match: string) => React.ReactNode)(capturedText);
          }

          earliestMatch = {
            index: matchIndex,
            length: match[0].length,
            node,
          };
        }
      }
    }

    if (earliestMatch) {
      // Add text before the match
      if (earliestMatch.index > 0) {
        result.push(remaining.slice(0, earliestMatch.index));
      }
      // Add the formatted node
      result.push(earliestMatch.node);
      // Continue with remaining text
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      // No more matches, add remaining text
      result.push(remaining);
      break;
    }
  }

  return result;
}

/**
 * Parse text content and replace [1], [2], etc. with InlineCitation components
 * Also handles inline markdown formatting
 */
export function parseCitationsInText(
  text: string,
  citations: ChatCitation[]
): React.ReactNode[] {
  if (!citations || citations.length === 0) {
    // No citations, just parse markdown
    return parseInlineMarkdown(text);
  }

  // Create a map of citation numbers to citations for quick lookup
  const citationMap = new Map<number, ChatCitation>();
  citations.forEach((c) => citationMap.set(c.number, c));

  // Regex to match citation markers like [1], [2], [1,2], [1-3], etc.
  const citationRegex = /\[(\d+(?:[-,]\d+)*)\]/g;

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before the citation (with markdown parsing)
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      const parsedBefore = parseInlineMarkdown(beforeText, `pre-${keyCounter}`);
      result.push(...parsedBefore);
    }

    // Parse the citation numbers (handles [1], [1,2], [1-3])
    const citationStr = match[1];
    const citationNumbers = parseCitationNumbers(citationStr);

    // Add citation components
    citationNumbers.forEach((num) => {
      const citation = citationMap.get(num);
      if (citation) {
        result.push(
          <InlineCitation
            key={`citation-${keyCounter++}`}
            citation={citation}
            variant="compact"
          />
        );
      } else {
        // If citation not found, keep the original text
        result.push(`[${num}]`);
      }
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last citation (with markdown parsing)
  if (lastIndex < text.length) {
    const afterText = text.slice(lastIndex);
    const parsedAfter = parseInlineMarkdown(afterText, `post-${keyCounter}`);
    result.push(...parsedAfter);
  }

  return result;
}

/**
 * Parse citation number string like "1", "1,2", "1-3" into array of numbers
 */
function parseCitationNumbers(str: string): number[] {
  const numbers: number[] = [];

  // Split by comma first
  const parts = str.split(",");

  parts.forEach((part) => {
    part = part.trim();

    // Check if it's a range like "1-3"
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((n) => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          numbers.push(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }
  });

  return numbers;
}

/**
 * Component that renders text with inline citations and markdown formatting
 */
interface CitedTextProps {
  text: string;
  citations: ChatCitation[];
  className?: string;
}

export function CitedText({ text, citations, className }: Readonly<CitedTextProps>) {
  const parsed = React.useMemo(
    () => parseCitationsInText(text, citations),
    [text, citations]
  );

  return <span className={className}>{parsed}</span>;
}
