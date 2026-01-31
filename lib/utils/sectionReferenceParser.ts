/**
 * Section Reference Parser
 * Parses AI responses for explicit "Section: X" syntax and converts to structured data
 */

export interface SectionReference {
  /** The full text matched including "Section: " prefix */
  fullMatch: string;
  /** The extracted section name/number without the prefix */
  sectionName: string;
  /** Starting index in the original text */
  startIndex: number;
  /** Ending index in the original text */
  endIndex: number;
  /** Normalized section ID for DOM lookups */
  sectionId: string;
}

/**
 * Regex to match section references
 * Matches patterns like:
 * - "Section: Introduction"
 * - "Section: 3.2 Methods"
 * - "Section: Abstract"
 * - "Section: Background and Related Work"
 */
const SECTION_REFERENCE_REGEX = /Section:\s*([^\n\r]+?)(?=\s*(?:\n|$|(?=Section:)|[.!?](?:\s|$)))/gi;

/**
 * Parse text content and extract section references
 * @param text - The text content to parse
 * @returns Array of SectionReference objects with position info
 */
export function parseSectionReferences(text: string): SectionReference[] {
  const references: SectionReference[] = [];
  const regex = new RegExp(SECTION_REFERENCE_REGEX.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const sectionName = match[1].trim();
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;
    
    references.push({
      fullMatch,
      sectionName,
      startIndex,
      endIndex,
      sectionId: generateSectionId(sectionName),
    });
  }

  return references;
}

/**
 * Generate a section ID from a section name
 * Used for DOM element lookups and scroll targets
 */
export function generateSectionId(sectionName: string): string {
  // Remove leading numbers and dots (e.g., "3.2 Methods" -> "methods")
  const withoutNumbers = sectionName.replace(/^\d+(?:\.\d+)*\s*/, '');
  
  // Convert to lowercase and replace non-alphanumeric with hyphens
  return withoutNumbers
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse text with section references and split into segments
 * Returns segments that are either plain text or section references
 */
export interface TextSegment {
  type: 'text' | 'section';
  content: string;
  reference?: SectionReference;
}

export function parseTextWithSections(text: string): TextSegment[] {
  const references = parseSectionReferences(text);
  
  if (references.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const ref of references) {
    // Add text before this reference
    if (ref.startIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, ref.startIndex),
      });
    }

    // Add the section reference segment
    segments.push({
      type: 'section',
      content: ref.fullMatch,
      reference: ref,
    });

    lastIndex = ref.endIndex;
  }

  // Add remaining text after last reference
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Check if text contains any section references
 */
export function hasSectionReferences(text: string): boolean {
  return SECTION_REFERENCE_REGEX.test(text);
}

/**
 * Extract all unique section names from text
 */
export function extractSectionNames(text: string): string[] {
  const references = parseSectionReferences(text);
  const names = references.map(ref => ref.sectionName);
  return [...new Set(names)]; // Remove duplicates
}