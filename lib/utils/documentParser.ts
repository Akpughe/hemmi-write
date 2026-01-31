/**
 * Document Parser Utility
 * Parses HTML content into structured sections for intelligent context selection
 */

export interface DocumentSection {
  id: string;
  heading: string;
  level: number; // 1-6 for H1-H6
  content: string;
  wordCount: number;
  charCount: number;
  startPosition: number; // Character position in full document
  endPosition: number;
}

export interface ParsedDocument {
  sections: DocumentSection[];
  totalWordCount: number;
  totalCharCount: number;
  outline: string; // Brief outline for AI context
}

/**
 * Parse HTML content into structured sections
 */
export function parseDocumentContent(htmlContent: string): ParsedDocument {
  if (!htmlContent || htmlContent.trim() === '') {
    return {
      sections: [],
      totalWordCount: 0,
      totalCharCount: 0,
      outline: '',
    };
  }

  // Create a DOM parser (works in both browser and Node.js with jsdom if needed)
  const sections: DocumentSection[] = [];
  
  // Simple regex-based parsing for headings and content
  // Pattern matches h1-h6 tags with their content
  const headingPattern = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
  const matches = Array.from(htmlContent.matchAll(headingPattern));
  
  if (matches.length === 0) {
    // No headings found - treat entire content as one section
    const textContent = stripHtml(htmlContent);
    const wordCount = countWords(textContent);
    
    return {
      sections: [{
        id: 'section-1',
        heading: 'Document',
        level: 1,
        content: textContent.substring(0, 2000), // Limit content length
        wordCount,
        charCount: textContent.length,
        startPosition: 0,
        endPosition: htmlContent.length,
      }],
      totalWordCount: wordCount,
      totalCharCount: textContent.length,
      outline: 'Document (no sections)',
    };
  }

  // Extract sections based on headings
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const level = parseInt(match[1], 10);
    const headingHtml = match[2];
    const headingText = stripHtml(headingHtml);
    const headingStart = match.index || 0;
    
    // Find the content for this section (until next heading or end)
    const nextMatch = matches[i + 1];
    const sectionEnd = nextMatch ? (nextMatch.index || htmlContent.length) : htmlContent.length;
    
    // Extract content between this heading and the next
    const sectionHtml = htmlContent.substring(headingStart, sectionEnd);
    const sectionText = stripHtml(sectionHtml);
    
    // Create section ID from heading (slugify)
    const sectionId = `section-${i + 1}-${slugify(headingText)}`;
    
    sections.push({
      id: sectionId,
      heading: headingText,
      level,
      content: sectionText.substring(0, 2000), // Limit to prevent token overflow
      wordCount: countWords(sectionText),
      charCount: sectionText.length,
      startPosition: headingStart,
      endPosition: sectionEnd,
    });
  }

  // Generate document outline
  const outline = generateOutline(sections);
  
  // Calculate totals
  const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);
  const totalCharCount = sections.reduce((sum, s) => sum + s.charCount, 0);

  return {
    sections,
    totalWordCount,
    totalCharCount,
    outline,
  };
}

/**
 * Select relevant sections based on user query
 * Uses simple keyword matching to find relevant sections
 */
export function selectRelevantSections(
  parsedDoc: ParsedDocument,
  query: string,
  maxSections: number = 3,
  maxTokens: number = 8000
): DocumentSection[] {
  if (!parsedDoc.sections.length) return [];
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
  
  // Score each section based on relevance
  const scoredSections = parsedDoc.sections.map(section => {
    let score = 0;
    const sectionTextLower = (section.heading + ' ' + section.content).toLowerCase();
    
    // Check for exact heading match (high priority)
    if (section.heading.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    // Check for keyword matches
    for (const word of queryWords) {
      if (sectionTextLower.includes(word)) {
        score += 2;
      }
    }
    
    // Boost recent sections slightly (user often asks about what they just wrote)
    const recencyBoost = parsedDoc.sections.length > 0 
      ? (parsedDoc.sections.indexOf(section) / parsedDoc.sections.length) * 0.5
      : 0;
    score += recencyBoost;
    
    return { section, score };
  });
  
  // Sort by score descending
  scoredSections.sort((a, b) => b.score - a.score);
  
  // Select top sections until we hit token limit
  const selected: DocumentSection[] = [];
  let currentTokens = 0;
  const approxTokensPerChar = 0.25; // Rough estimate
  
  for (const { section } of scoredSections) {
    const sectionTokens = section.content.length * approxTokensPerChar;
    
    if (selected.length < maxSections && currentTokens + sectionTokens < maxTokens) {
      selected.push(section);
      currentTokens += sectionTokens;
    } else if (selected.length === 0) {
      // Always include at least one section (the highest scored)
      selected.push(section);
      break;
    } else {
      break;
    }
  }
  
  // Sort back by original position for logical flow
  selected.sort((a, b) => a.startPosition - b.startPosition);
  
  return selected;
}

/**
 * Format selected sections for AI context
 */
export function formatSectionsForAI(
  sections: DocumentSection[],
  includeFullOutline: boolean = true,
  fullOutline?: string
): string {
  if (sections.length === 0) {
    return '';
  }
  
  let context = '';
  
  if (includeFullOutline && fullOutline) {
    context += `DOCUMENT OUTLINE:\n${fullOutline}\n\n`;
  }
  
  context += 'RELEVANT SECTIONS:\n\n';
  
  for (const section of sections) {
    const headingMarker = '#'.repeat(section.level);
    context += `${headingMarker} ${section.heading}\n`;
    context += `[ID: ${section.id}]\n`;
    context += `${section.content.substring(0, 1500)}\n\n`; // Limit content per section
  }
  
  return context;
}

/**
 * Helper: Strip HTML tags
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Helper: Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Helper: Slugify text for IDs
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Helper: Generate document outline from sections
 */
function generateOutline(sections: DocumentSection[]): string {
  return sections.map(s => {
    const indent = '  '.repeat(s.level - 1);
    return `${indent}- ${s.heading} (${s.wordCount} words)`;
  }).join('\n');
}
