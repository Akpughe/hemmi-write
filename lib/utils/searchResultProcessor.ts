// Search Result Processing Utilities
// Handles deduplication, domain diversity, and result merging

import { ResearchSource, SearchProvider } from "@/lib/types/document";

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  date?: string;
  author?: string;
  score?: number;
  provider: SearchProvider;
}

interface ProcessingOptions {
  maxSourcesPerDomain?: number;
  totalMaxResults?: number;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove www. prefix for consistency
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * Deduplicate results by URL
 */
export function deduplicateByUrl(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    // Normalize URL for comparison (remove trailing slash, www, etc.)
    const normalizedUrl = result.url
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");

    if (seen.has(normalizedUrl)) {
      return false;
    }
    seen.add(normalizedUrl);
    return true;
  });
}

/**
 * Enforce domain diversity by limiting sources per domain
 */
export function enforceDomainDiversity(
  results: SearchResult[],
  maxPerDomain: number = 2
): SearchResult[] {
  const domainCounts = new Map<string, number>();

  return results.filter((result) => {
    const domain = extractDomain(result.url);
    const currentCount = domainCounts.get(domain) || 0;

    if (currentCount >= maxPerDomain) {
      return false;
    }

    domainCounts.set(domain, currentCount + 1);
    return true;
  });
}

/**
 * Normalize scores across providers to 0-1 range
 */
export function normalizeScores(results: SearchResult[]): SearchResult[] {
  // Group by provider
  const byProvider = new Map<SearchProvider, SearchResult[]>();

  results.forEach((result) => {
    const existing = byProvider.get(result.provider) || [];
    existing.push(result);
    byProvider.set(result.provider, existing);
  });

  // Normalize each provider's scores independently
  const normalized: SearchResult[] = [];

  byProvider.forEach((providerResults) => {
    const scores = providerResults
      .map((r) => r.score)
      .filter((s): s is number => s !== undefined);

    if (scores.length === 0) {
      // No scores available, assign position-based scores
      providerResults.forEach((result, index) => {
        normalized.push({
          ...result,
          score: 1 - index * 0.05, // Decay by position
        });
      });
      return;
    }

    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const range = maxScore - minScore || 1;

    providerResults.forEach((result) => {
      normalized.push({
        ...result,
        score:
          result.score !== undefined ? (result.score - minScore) / range : 0.5, // Default score for missing
      });
    });
  });

  return normalized;
}

/**
 * Merge results from multiple providers
 * Interleaves results for diversity while respecting scores
 */
export function mergeResults(
  exaResults: SearchResult[],
  perplexityResults: SearchResult[],
  options: ProcessingOptions = {}
): SearchResult[] {
  const { maxSourcesPerDomain = 2, totalMaxResults = 15 } = options;

  // Combine and deduplicate
  const allResults = [...exaResults, ...perplexityResults];
  const deduplicated = deduplicateByUrl(allResults);

  // Normalize scores
  const normalized = normalizeScores(deduplicated);

  // Sort by normalized score (highest first)
  normalized.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Enforce domain diversity
  const diverse = enforceDomainDiversity(normalized, maxSourcesPerDomain);

  // Limit total results
  return diverse.slice(0, totalMaxResults);
}

/**
 * Convert SearchResult to ResearchSource format
 */
export function toResearchSource(
  result: SearchResult,
  index: number
): ResearchSource {
  return {
    id: result.id,
    title: result.title,
    url: result.url,
    author: result.author,
    publishedDate: result.date,
    excerpt: result.snippet,
    score: result.score,
    selected: true,
    provider: result.provider,
    domain: extractDomain(result.url),
  };
}

/**
 * Convert array of SearchResults to ResearchSources
 */
export function toResearchSources(results: SearchResult[]): ResearchSource[] {
  return results.map(toResearchSource);
}

/**
 * Filter out URLs that already exist
 */
export function filterExistingUrls(
  results: SearchResult[],
  existingUrls: string[]
): SearchResult[] {
  const normalizedExisting = new Set(
    existingUrls.map((url) =>
      url
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/$/, "")
    )
  );

  return results.filter((result) => {
    const normalizedUrl = result.url
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");

    return !normalizedExisting.has(normalizedUrl);
  });
}

/**
 * Calculate simple Jaccard similarity between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

/**
 * Filter out results that are too similar to existing sources by title
 */
export function filterSimilarTitles(
  results: SearchResult[],
  existingTitles: string[],
  threshold: number = 0.8
): SearchResult[] {
  return results.filter((result) => {
    // Check if any existing title is too similar
    const isDuplicate = existingTitles.some((existingTitle) => {
      return calculateSimilarity(result.title, existingTitle) > threshold;
    });
    return !isDuplicate;
  });
}
