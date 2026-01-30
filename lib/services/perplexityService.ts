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

export interface PerplexityCitation {
  url: string;
  title?: string;
}

export interface PerplexityChatResponse {
  content: string;
  citations: PerplexityCitation[];
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
    options: PerplexitySearchOptions = {},
  ): Promise<PerplexitySearchResult[]> {
    if (!this.client) {
      console.warn("Perplexity API key not configured");
      return [];
    }

    const { maxResults = 10, searchDomainFilter } = options;

    try {
      console.log(
        `[Perplexity] Searching for: "${query}" (max: ${maxResults})`,
      );

      const response = await this.client.search.create({
        query,
        max_results: maxResults,
        ...(searchDomainFilter && { search_domain_filter: searchDomainFilter }),
      });

      if (!response.results) {
        console.log(`[Perplexity] No results returned`);
        return [];
      }

      console.log(
        `[Perplexity] Raw response: ${response.results.length} results`,
      );

      const filtered = response.results
        .filter((result: any) => {
          // Filter out results without valid titles or URLs
          if (!result.url) {
            console.warn("[Perplexity] Result missing URL, skipping");
            return false;
          }
          if (!result.title || result.title.trim() === "") {
            console.warn(
              `[Perplexity] Result has no title for ${result.url}, skipping`,
            );
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

      console.log(
        `[Perplexity] After filtering: ${filtered.length} valid results`,
      );
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
    options: PerplexitySearchOptions = {},
  ): Promise<PerplexitySearchResult[]> {
    if (!this.client) {
      console.warn("Perplexity API key not configured");
      return [];
    }

    // Perplexity supports up to 5 queries
    const limitedQueries = queries.slice(0, 5);
    const { maxResults = 10, searchDomainFilter } = options;

    try {
      console.log(
        `[Perplexity Multi] Searching with ${limitedQueries.length} queries (max: ${maxResults} per query)`,
      );
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

      console.log(
        `[Perplexity Multi] Raw response: ${response.results.length} results`,
      );

      const filtered = response.results
        .filter((result: any) => {
          // Filter out results without valid titles or URLs
          if (!result.url) {
            console.warn("[Perplexity Multi] Result missing URL, skipping");
            return false;
          }
          if (!result.title || result.title.trim() === "") {
            console.warn(
              `[Perplexity Multi] Result has no title for ${result.url}, skipping`,
            );
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

      console.log(
        `[Perplexity Multi] After filtering: ${filtered.length} valid results`,
      );
      return filtered;
    } catch (error: any) {
      console.error("[Perplexity Multi] Search failed:", error.message);
      return [];
    }
  }

  /**
   * Chat completion with citations
   * Get factual information about a topic with inline citations
   */
  async chatCompletion(
    query: string,
    options: { searchDomainFilter?: string[] } = {},
  ): Promise<PerplexityChatResponse> {
    if (!this.client) {
      console.warn("Perplexity API key not configured");
      return { content: "", citations: [] };
    }

    try {
      console.log(
        `[Perplexity Chat] Getting factual information for: "${query.substring(0, 100)}..."`,
      );

      const response = await this.client.chat.completions.create({
        model: "sonar-pro", // Use sonar-pro for best quality with citations
        messages: [
          {
            role: "system",
            content: `You are a research assistant providing factual information for academic writing.

CRITICAL WRITING RULES:
⚠️ NEVER use em-dashes (—) or double hyphens (--) - use commas, parentheses, colons, or periods instead
- Avoid these banned phrases: "Furthermore", "Moreover", "delve", "landscape", "Additionally", "In conclusion", "myriad", "plethora", "pivotal", "crucial", "groundbreaking", "revolutionary"
- Write naturally with varied sentence lengths
- Use specific data, numbers, and examples
- Cite sources with inline references [1], [2], etc.
- Provide comprehensive, factual information from authoritative sources
- Include author names and publication details when citing sources

PUNCTUATION ALTERNATIVES:
- Use COMMAS for brief asides: "The study, which was groundbreaking, showed..."
- Use PARENTHESES for clarifications: "The results (conducted over three years) reveal..."
- Use COLONS for explanations: "The analysis revealed: clear patterns emerged"
- Use PERIODS for separate thoughts: "The data showed X. The conclusion was Y."

Provide comprehensive, factual information with proper inline citations.`,
          },
          {
            role: "user",
            content: query,
          },
        ],
        ...(options.searchDomainFilter && {
          search_domain_filter: options.searchDomainFilter,
        }),
        return_citations: true,
        return_related_questions: false,
      } as any);

      const content = (response.choices[0]?.message?.content as string) || "";
      const citations: PerplexityCitation[] = [];

      // Extract citations from response
      if (response.citations && Array.isArray(response.citations)) {
        response.citations.forEach((citation: string | any) => {
          // Handle both string URLs and potentially richer citation objects
          const url =
            typeof citation === "string" ? citation : citation.url || citation;

          // Try to extract a better title from the URL
          let title: string | undefined = undefined;
          if (typeof citation === "object" && citation.title) {
            title = citation.title;
          } else {
            // Extract domain name as fallback title
            try {
              const urlObj = new URL(url);
              const hostname = urlObj.hostname.replace("www.", "");
              const pathname =
                urlObj.pathname
                  .split("/")
                  .filter((p) => p)
                  .pop() || "";

              // Try to create a readable title from the URL
              if (pathname && pathname !== "") {
                // Convert URL slug to title (e.g., "machine-learning-guide" -> "Machine Learning Guide")
                title = pathname
                  .replace(/\.(html|htm|php|asp|aspx)$/i, "")
                  .replace(/[-_]/g, " ")
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")
                  .substring(0, 100);
              } else {
                title = hostname;
              }
            } catch (e) {
              title = undefined;
            }
          }

          citations.push({
            url,
            title,
          });
        });
      }

      console.log(
        `[Perplexity Chat] Response: ${content.length} chars, ${citations.length} citations`,
      );

      return { content, citations };
    } catch (error: any) {
      console.error("[Perplexity Chat] Completion failed:", error.message);
      return { content: "", citations: [] };
    }
  }
}

// Singleton instance
export const perplexityService = new PerplexityService();
