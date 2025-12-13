// Query Expansion Utilities
// Generates varied search queries for broader source coverage

import { DocumentType } from "@/lib/types/document";

interface ExpandedQueries {
  primary: string;
  variations: string[];
}

/**
 * Document type specific prefixes for better search results
 */
const DOCUMENT_TYPE_PREFIXES: Record<DocumentType, string[]> = {
  [DocumentType.RESEARCH_PAPER]: [
    "academic research",
    "peer-reviewed study",
    "scientific literature",
  ],
  [DocumentType.ESSAY]: [
    "analysis",
    "critical examination",
    "discussion",
  ],
  [DocumentType.REPORT]: [
    "comprehensive report",
    "industry analysis",
    "detailed findings",
  ],
};

/**
 * Perspective variations to ensure diverse sources
 */
const PERSPECTIVE_SUFFIXES = [
  "history and development",
  "current applications",
  "challenges and limitations",
  "future trends",
  "case studies",
  "key researchers and contributors",
  "methodology approaches",
  "comparative analysis",
];

/**
 * Generate expanded search queries for broader coverage
 */
export function expandSearchQueries(
  topic: string,
  documentType: DocumentType,
  numVariations: number = 3
): ExpandedQueries {
  const prefixes = DOCUMENT_TYPE_PREFIXES[documentType] || ["research"];

  // Primary query with document type context
  const primary = `${prefixes[0]} ${topic}`;

  // Generate variations
  const variations: string[] = [];

  // Add prefix variations (different academic framings)
  prefixes.slice(1).forEach((prefix) => {
    variations.push(`${prefix} ${topic}`);
  });

  // Add perspective variations (different angles on the topic)
  const shuffledSuffixes = [...PERSPECTIVE_SUFFIXES].sort(
    () => Math.random() - 0.5
  );

  shuffledSuffixes.slice(0, numVariations).forEach((suffix) => {
    variations.push(`${topic} ${suffix}`);
  });

  // Limit total variations
  return {
    primary,
    variations: variations.slice(0, numVariations),
  };
}

/**
 * Generate all queries as a flat array
 */
export function getAllQueries(
  topic: string,
  documentType: DocumentType,
  numVariations: number = 3
): string[] {
  const { primary, variations } = expandSearchQueries(
    topic,
    documentType,
    numVariations
  );
  return [primary, ...variations];
}

/**
 * Enhance a single query with document type context
 */
export function enhanceQueryForDocumentType(
  query: string,
  documentType: DocumentType
): string {
  const prefixes = DOCUMENT_TYPE_PREFIXES[documentType];
  const prefix = prefixes[0];

  // Check if query already has academic framing
  const lowerQuery = query.toLowerCase();
  const hasAcademicFraming =
    lowerQuery.includes("research") ||
    lowerQuery.includes("academic") ||
    lowerQuery.includes("study") ||
    lowerQuery.includes("analysis");

  if (hasAcademicFraming) {
    return query;
  }

  return `${prefix} ${query}`;
}

/**
 * Generate targeted queries based on specific aspects of a topic
 */
export function generateTargetedQueries(
  topic: string,
  aspects: string[],
  documentType: DocumentType
): string[] {
  const prefix = DOCUMENT_TYPE_PREFIXES[documentType][0];

  return aspects.map((aspect) => `${prefix} ${topic} ${aspect}`);
}

/**
 * Extract key phrases from user instructions for query enhancement
 */
export function extractKeyPhrasesFromInstructions(instructions: string): string[] {
  if (!instructions || instructions.trim() === '') {
    return [];
  }

  const keyphrases: string[] = [];
  const text = instructions.toLowerCase();

  // Extract time periods (e.g., "2023-2024", "recent", "last 5 years")
  const yearPattern = /\b(20\d{2}(?:\s*-\s*20\d{2})?)\b/g;
  const yearMatches = text.match(yearPattern);
  if (yearMatches) {
    keyphrases.push(...yearMatches);
  }

  // Extract "focus on X" patterns
  const focusPattern = /focus(?:ing)?\s+on\s+([^,.;]+)/gi;
  let match;
  while ((match = focusPattern.exec(text)) !== null) {
    keyphrases.push(match[1].trim());
  }

  // Extract "include X" patterns
  const includePattern = /include\s+([^,.;]+)/gi;
  while ((match = includePattern.exec(text)) !== null) {
    keyphrases.push(match[1].trim());
  }

  // Extract "emphasize X" patterns
  const emphasizePattern = /emphasize\s+([^,.;]+)/gi;
  while ((match = emphasizePattern.exec(text)) !== null) {
    keyphrases.push(match[1].trim());
  }

  // Extract "concentrate on X" patterns
  const concentratePattern = /concentrat(?:e|ing)\s+on\s+([^,.;]+)/gi;
  while ((match = concentratePattern.exec(text)) !== null) {
    keyphrases.push(match[1].trim());
  }

  // Extract geographic locations (simple pattern)
  const geoPattern = /\b(US|USA|United States|UK|Europe|Asia|China|India|Japan|Germany|France|Canada|Australia)\b/gi;
  const geoMatches = text.match(geoPattern);
  if (geoMatches) {
    keyphrases.push(...geoMatches.map(m => m.toLowerCase()));
  }

  // Extract quoted phrases
  const quotedPattern = /"([^"]+)"/g;
  while ((match = quotedPattern.exec(instructions)) !== null) {
    keyphrases.push(match[1]);
  }

  // Remove duplicates and limit length
  return [...new Set(keyphrases)]
    .filter(phrase => phrase.length > 3 && phrase.length < 50)
    .slice(0, 5); // Max 5 key phrases
}

/**
 * Enhance queries with instructions for more targeted research
 */
export function enhanceQueriesWithInstructions(
  queries: string[],
  instructions: string | undefined
): string[] {
  if (!instructions || instructions.trim() === '') {
    return queries;
  }

  const keyPhrases = extractKeyPhrasesFromInstructions(instructions);

  if (keyPhrases.length === 0) {
    return queries;
  }

  // Enhance the primary query (first one) with most important key phrase
  const enhancedQueries = [...queries];
  if (enhancedQueries.length > 0 && keyPhrases.length > 0) {
    enhancedQueries[0] = `${enhancedQueries[0]} ${keyPhrases[0]}`;
  }

  // Add 1-2 additional queries that combine topic with key phrases
  if (keyPhrases.length > 1 && enhancedQueries.length > 1) {
    enhancedQueries[1] = `${enhancedQueries[1]} ${keyPhrases[1]}`;
  }

  return enhancedQueries;
}

/**
 * Generate all queries with optional instruction enhancement
 */
export function getAllQueriesWithInstructions(
  topic: string,
  documentType: DocumentType,
  instructions?: string,
  numVariations: number = 3
): string[] {
  const baseQueries = getAllQueries(topic, documentType, numVariations);
  return enhanceQueriesWithInstructions(baseQueries, instructions);
}
