// Perplexity Search API Service

import { Perplexity } from "@perplexity-ai/perplexity_ai";
import { SearchProvider } from "@/lib/types/document";

export interface PerplexitySearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  date?: string;
  provider: SearchProvider;
}

interface PerplexitySearchOptions {
  maxResults?: number;
  searchDomainFilter?: string[];
}

export class PerplexityService {
  private client: Perplexity | null = null;

  constructor() {
    if (process.env.PERPLEXITY_API_KEY) {
      this.client = new Perplexity({
        apiKey: process.env.PERPLEXITY_API_KEY,
      });
    }
  }

  /**
   * Check if Perplexity service is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Search using a single query
   */
  async search(
    query: string,
    options: PerplexitySearchOptions = {}
  ): Promise<PerplexitySearchResult[]> {
    if (!this.client) {
      console.warn("Perplexity API key not configured");
      return [];
    }

    const { maxResults = 10, searchDomainFilter } = options;

    try {
      console.log(`[Perplexity] Searching for: "${query}" (max: ${maxResults})`);

      const response = await this.client.search.create({
        query,
        max_results: maxResults,
        ...(searchDomainFilter && { search_domain_filter: searchDomainFilter }),
      });

      if (!response.results) {
        console.log(`[Perplexity] No results returned`);
        return [];
      }

      console.log(`[Perplexity] Raw response: ${response.results.length} results`);

      const filtered = response.results
        .filter((result: any) => {
          // Filter out results without valid titles or URLs
          if (!result.url) {
            console.warn("[Perplexity] Result missing URL, skipping");
            return false;
          }
          if (!result.title || result.title.trim() === "") {
            console.warn(`[Perplexity] Result has no title for ${result.url}, skipping`);
            return false;
          }
          return true;
        })
        .map((result: any, index: number) => ({
          id: `perplexity-${Date.now()}-${index}`,
          title: result.title,
          url: result.url,
          snippet: result.snippet || "",
          date: result.date,
          provider: SearchProvider.PERPLEXITY,
        }));

      console.log(`[Perplexity] After filtering: ${filtered.length} valid results`);
      return filtered;
    } catch (error: any) {
      console.error("[Perplexity] Search failed:", error.message);
      return [];
    }
  }

  /**
   * Search using multiple queries (up to 5 queries supported by Perplexity)
   */
  async multiSearch(
    queries: string[],
    options: PerplexitySearchOptions = {}
  ): Promise<PerplexitySearchResult[]> {
    if (!this.client) {
      console.warn("Perplexity API key not configured");
      return [];
    }

    // Perplexity supports up to 5 queries
    const limitedQueries = queries.slice(0, 5);
    const { maxResults = 10, searchDomainFilter } = options;

    try {
      console.log(`[Perplexity Multi] Searching with ${limitedQueries.length} queries (max: ${maxResults} per query)`);
      console.log(`[Perplexity Multi] Queries:`, limitedQueries);

      const response = await this.client.search.create({
        query: limitedQueries,
        max_results: maxResults,
        ...(searchDomainFilter && { search_domain_filter: searchDomainFilter }),
      });

      if (!response.results) {
        console.log(`[Perplexity Multi] No results returned`);
        return [];
      }

      console.log(`[Perplexity Multi] Raw response: ${response.results.length} results`);

      const filtered = response.results
        .filter((result: any) => {
          // Filter out results without valid titles or URLs
          if (!result.url) {
            console.warn("[Perplexity Multi] Result missing URL, skipping");
            return false;
          }
          if (!result.title || result.title.trim() === "") {
            console.warn(`[Perplexity Multi] Result has no title for ${result.url}, skipping`);
            return false;
          }
          return true;
        })
        .map((result: any, index: number) => ({
          id: `perplexity-${Date.now()}-${index}`,
          title: result.title,
          url: result.url,
          snippet: result.snippet || "",
          date: result.date,
          provider: SearchProvider.PERPLEXITY,
        }));

      console.log(`[Perplexity Multi] After filtering: ${filtered.length} valid results`);
      return filtered;
    } catch (error: any) {
      console.error("[Perplexity Multi] Search failed:", error.message);
      return [];
    }
  }
}

// Singleton instance
export const perplexityService = new PerplexityService();
