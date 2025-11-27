import { CitationStyle, ResearchSource } from '@/lib/types/document';

// Format a single in-text citation based on style
export function formatInTextCitation(source: ResearchSource, style: CitationStyle, index: number): string {
  const author = source.author || 'Anonymous';
  const year = source.publishedDate ? new Date(source.publishedDate).getFullYear() : 'n.d.';

  switch (style) {
    case CitationStyle.APA:
      return `(${author}, ${year})`;

    case CitationStyle.MLA:
      // MLA typically uses author and page number, but for web sources without pages, just author
      return `(${author})`;

    case CitationStyle.HARVARD:
      return `(${author} ${year})`;

    case CitationStyle.CHICAGO:
      return `(${author} ${year})`;

    default:
      return `[${index + 1}]`;
  }
}

// Format a single reference/bibliography entry based on style
export function formatReference(source: ResearchSource, style: CitationStyle): string {
  const author = source.author || 'Anonymous';
  const title = source.title;
  const url = source.url;
  const date = source.publishedDate;
  const year = date ? new Date(date).getFullYear() : 'n.d.';
  const fullDate = date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'n.d.';

  switch (style) {
    case CitationStyle.APA:
      // APA 7th edition format
      return `${author}. (${year}). ${title}. Retrieved from ${url}`;

    case CitationStyle.MLA:
      // MLA 9th edition format
      return `${author}. "${title}." Web. ${fullDate}. ${url}`;

    case CitationStyle.HARVARD:
      // Harvard format
      return `${author} (${year}) ${title}. Available at: ${url} (Accessed: ${fullDate}).`;

    case CitationStyle.CHICAGO:
      // Chicago 17th edition format (author-date)
      return `${author}. ${year}. "${title}." ${url}.`;

    default:
      return `${author}. ${title}. ${url}`;
  }
}

// Generate the full reference list/bibliography section
export function generateReferenceList(sources: ResearchSource[], style: CitationStyle): string {
  if (sources.length === 0) return '';

  // Get the appropriate heading based on citation style
  const heading = getReferenceListHeading(style);

  // Sort sources alphabetically by author for most styles
  const sortedSources = [...sources].sort((a, b) => {
    const authorA = a.author || 'Anonymous';
    const authorB = b.author || 'Anonymous';
    return authorA.localeCompare(authorB);
  });

  // Format each reference
  const references = sortedSources.map(source => formatReference(source, style));

  // Build the reference list with proper formatting
  return `\n\n## ${heading}\n\n${references.map(ref => `- ${ref}`).join('\n\n')}`;
}

// Get the appropriate heading for the reference list based on citation style
function getReferenceListHeading(style: CitationStyle): string {
  switch (style) {
    case CitationStyle.APA:
      return 'References';
    case CitationStyle.MLA:
      return 'Works Cited';
    case CitationStyle.HARVARD:
      return 'Reference List';
    case CitationStyle.CHICAGO:
      return 'Bibliography';
    default:
      return 'References';
  }
}

// Process content and replace citation markers with formatted citations
export function processCitations(content: string, sources: ResearchSource[], style: CitationStyle): string {
  let processedContent = content;

  // Replace each citation marker [1], [2], etc. with formatted citation
  sources.forEach((source, index) => {
    const marker = `\\[${index + 1}\\]`;
    const regex = new RegExp(marker, 'g');
    const formattedCitation = formatInTextCitation(source, style, index);
    processedContent = processedContent.replace(regex, formattedCitation);
  });

  return processedContent;
}

// Complete citation formatting: process in-text citations and add reference list
export function formatWithCitations(content: string, sources: ResearchSource[], style: CitationStyle): string {
  // First, process all in-text citation markers
  const processedContent = processCitations(content, sources, style);

  // Then, append the reference list at the end
  const referenceList = generateReferenceList(sources, style);

  return processedContent + referenceList;
}

// Validate that all citation markers have corresponding sources
export function validateCitations(content: string, sources: ResearchSource[]): { valid: boolean; missingMarkers: number[] } {
  const missingMarkers: number[] = [];

  // Check for citation markers [1], [2], etc. in the content
  for (let i = 1; i <= sources.length; i++) {
    const marker = `[${i}]`;
    if (!content.includes(marker)) {
      missingMarkers.push(i);
    }
  }

  return {
    valid: missingMarkers.length === 0,
    missingMarkers,
  };
}

// Extract all citation markers from content
export function extractCitationMarkers(content: string): number[] {
  const markerRegex = /\[(\d+)\]/g;
  const markers: number[] = [];
  let match;

  while ((match = markerRegex.exec(content)) !== null) {
    const markerNumber = parseInt(match[1], 10);
    if (!markers.includes(markerNumber)) {
      markers.push(markerNumber);
    }
  }

  return markers.sort((a, b) => a - b);
}
