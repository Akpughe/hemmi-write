import {
  TargetedSearchResult,
  ResearchSource,
  DocumentType,
} from "@/lib/types/document";
import { searchService } from "@/lib/services/searchService";

/**
 * Conduct targeted web searches based on feedback analysis
 * Uses unified search service for parallel Exa + Perplexity searches
 */
export async function conductTargetedResearch(
  searchQueries: string[],
  documentType: DocumentType,
  existingSourceUrls: string[]
): Promise<TargetedSearchResult[]> {
  if (searchQueries.length === 0) {
    return [];
  }

  const results: TargetedSearchResult[] = [];

  // Process searches sequentially to avoid rate limiting
  // but each search uses parallel Exa + Perplexity
  for (const query of searchQueries) {
    try {
      const sources = await searchService.searchTargeted(
        query,
        documentType,
        existingSourceUrls,
        4 // Get top 4 unique results per query
      );

      const rationale = generateSearchRationale(query, sources.length);

      results.push({
        query,
        sources,
        rationale,
      });

      // Update existing URLs to avoid duplicates in subsequent searches
      sources.forEach((source) => {
        if (!existingSourceUrls.includes(source.url)) {
          existingSourceUrls.push(source.url);
        }
      });
    } catch (error: any) {
      console.error(`Search failed for query "${query}":`, error);
      // Continue with other queries even if one fails
      results.push({
        query,
        sources: [],
        rationale: `Search failed: ${error.message}`,
      });
    }
  }

  return results;
}

/**
 * Generate human-readable rationale for why this search was performed
 */
function generateSearchRationale(query: string, numResults: number): string {
  if (numResults === 0) {
    return `Searched for "${query}" but found no additional unique sources.`;
  }

  if (numResults === 1) {
    return `Found 1 relevant source addressing: "${query}"`;
  }

  return `Found ${numResults} sources to address: "${query}"`;
}
