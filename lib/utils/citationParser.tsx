"use client";

import * as React from "react";
import { ChatCitation } from "@/lib/types/chat";
import { InlineCitation } from "@/app/components/chat/inline-citation";

/**
 * Parse text content and replace [1], [2], etc. with InlineCitation components
 */
export function parseCitationsInText(
  text: string,
  citations: ChatCitation[]
): React.ReactNode[] {
  if (!citations || citations.length === 0) {
    return [text];
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
    // Add text before the citation
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    // Parse the citation numbers (handles [1], [1,2], [1-3])
    const citationStr = match[1];
    const citationNumbers = parseCitationNumbers(citationStr);

    // Add citation components
    citationNumbers.forEach((num, idx) => {
      const citation = citationMap.get(num);
      if (citation) {
        result.push(
          <InlineCitation
            key={`citation-${keyCounter++}`}
            citation={citation}
          />
        );
      } else {
        // If citation not found, keep the original text
        result.push(`[${num}]`);
      }
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last citation
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
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
 * Component that renders text with inline citations
 */
interface CitedTextProps {
  text: string;
  citations: ChatCitation[];
  className?: string;
}

export function CitedText({ text, citations, className }: CitedTextProps) {
  const parsed = parseCitationsInText(text, citations);

  return <span className={className}>{parsed}</span>;
}
