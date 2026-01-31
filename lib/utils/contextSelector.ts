/**
 * Smart Context Selector
 * Intelligently selects relevant document sections based on user queries
 */

import { parseDocumentContent, selectRelevantSections, formatSectionsForAI, ParsedDocument, DocumentSection } from './documentParser';

// Cache for parsed documents to avoid re-parsing
const documentCache = new Map<string, { parsed: ParsedDocument; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ContextSelectionResult {
  context: string;
  selectedSections: DocumentSection[];
  outline: string;
  totalSections: number;
  selectionReason: string;
}

/**
 * Get smart context for chat based on user query and document content
 */
export function getSmartContext(
  htmlContent: string,
  userQuery: string,
  maxTokens: number = 6000
): ContextSelectionResult {
  // Check cache first
  const cacheKey = `${htmlContent.length}-${htmlContent.substring(0, 100)}`;
  const cached = documentCache.get(cacheKey);
  let parsedDoc: ParsedDocument;
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    parsedDoc = cached.parsed;
  } else {
    parsedDoc = parseDocumentContent(htmlContent);
    documentCache.set(cacheKey, { parsed: parsedDoc, timestamp: Date.now() });
  }
  
  // If document is small enough, send the whole thing
  const totalTokens = parsedDoc.totalCharCount * 0.25; // Rough estimate
  if (totalTokens < maxTokens * 0.5 && parsedDoc.sections.length <= 5) {
    const allSections = parsedDoc.sections;
    const context = formatSectionsForAI(allSections, true, parsedDoc.outline);
    
    return {
      context,
      selectedSections: allSections,
      outline: parsedDoc.outline,
      totalSections: allSections.length,
      selectionReason: 'Small document - sent complete content',
    };
  }
  
  // Select relevant sections
  const selectedSections = selectRelevantSections(
    parsedDoc,
    userQuery,
    3, // Max 3 sections
    maxTokens
  );
  
  // Generate selection reason
  let selectionReason: string;
  if (selectedSections.length === 0) {
    selectionReason = 'No relevant sections found - sending outline only';
  } else if (selectedSections.length === 1) {
    selectionReason = `Selected section: ${selectedSections[0].heading}`;
  } else {
    selectionReason = `Selected ${selectedSections.length} relevant sections based on query keywords`;
  }
  
  // Format context
  const context = formatSectionsForAI(
    selectedSections,
    true,
    parsedDoc.outline
  );
  
  return {
    context,
    selectedSections,
    outline: parsedDoc.outline,
    totalSections: parsedDoc.sections.length,
    selectionReason,
  };
}

/**
 * Clear document cache (useful for testing or when memory is low)
 */
export function clearDocumentCache(): void {
  documentCache.clear();
}

/**
 * Get cache stats for monitoring
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: documentCache.size,
    entries: Array.from(documentCache.keys()).map(k => k.substring(0, 50) + '...'),
  };
}

/**
 * Find section by ID
 */
export function findSectionById(
  htmlContent: string,
  sectionId: string
): DocumentSection | null {
  const parsedDoc = parseDocumentContent(htmlContent);
  return parsedDoc.sections.find(s => s.id === sectionId) || null;
}

/**
 * Get section position for scrolling
 */
export function getSectionScrollPosition(
  htmlContent: string,
  sectionId: string
): number | null {
  const section = findSectionById(htmlContent, sectionId);
  return section ? section.startPosition : null;
}
