// Unified Search Service
// Combines Exa and Perplexity APIs for comprehensive source research

import Exa from "exa-js";
import { perplexityService } from "./perplexityService";
import {
  SearchResult,
  mergeResults,
  filterExistingUrls,
  filterSimilarTitles,
  toResearchSources,
} from "@/lib/utils/searchResultProcessor";
import {
  getAllQueriesWithInstructions,
  enhanceQueryForDocumentType,
} from "@/lib/utils/queryExpansion";
import {
  DocumentType,
  SearchProvider,
  ResearchSource,
} from "@/lib/types/document";
import {
  getSearchDomainFilter,
  enhanceQueryForAcademicSearch,
  getDomainPrestige,
} from "@/lib/utils/academicSourcePriority";

interface SearchOptions {
  topic: string;
  documentType: DocumentType;
  instructions?: string;
  numResults?: number;
  excludeUrls?: string[];
  excludeTitles?: string[];
  maxSourcesPerDomain?: number;
  enableQueryExpansion?: boolean;
}

interface ExaSearchOptions {
  query: string;
  numResults: number;
  documentType: DocumentType;
}

export class SearchService {
  private exa: Exa | null = null;

  constructor() {
    if (process.env.EXA_API_KEY) {
      this.exa = new Exa(process.env.EXA_API_KEY);
    }
  }

  /**
   * Check if Exa is available
   */
  isExaAvailable(): boolean {
    return this.exa !== null;
  }

  /**
   * Check if Perplexity is available
   */
  isPerplexityAvailable(): boolean {
    return perplexityService.isAvailable();
  }

  /**
   * Get list of available search providers
   */
  getAvailableProviders(): SearchProvider[] {
    const providers: SearchProvider[] = [];
    if (this.isExaAvailable()) providers.push(SearchProvider.EXA);
    if (this.isPerplexityAvailable()) providers.push(SearchProvider.PERPLEXITY);
    return providers;
  }

  /**
   * Search using Exa API
   */
  async searchExa(options: ExaSearchOptions): Promise<SearchResult[]> {
    if (!this.exa) {
      console.warn("Exa API key not configured");
      return [];
    }

    const { query, numResults, documentType } = options;

    try {
      // Determine category based on document type
      let category: "research paper" | "pdf" | undefined;
      if (documentType === DocumentType.RESEARCH_PAPER) {
        category = "research paper";
      } else if (documentType === DocumentType.REPORT) {
        category = "pdf";
      }

      // Search with category filter for better quality
      let searchResults;
      if (category) {
        searchResults = await this.exa.searchAndContents(query, {
          type: "neural",
          useAutoprompt: true,
          numResults: Math.min(numResults, 10),
          category,
          text: { maxCharacters: 1000 },
          highlights: { numSentences: 3 },
        });
      }

      // Supplement with general search if needed
      const neededSources = numResults - (searchResults?.results.length || 0);
      if (neededSources > 0) {
        const generalResults = await this.exa.searchAndContents(query, {
          type: "neural",
          useAutoprompt: true,
          numResults: neededSources,
          text: { maxCharacters: 1000 },
          highlights: { numSentences: 3 },
        });

        if (searchResults) {
          searchResults.results = [
            ...searchResults.results,
            ...generalResults.results,
          ];
        } else {
          searchResults = generalResults;
        }
      }

      if (!searchResults?.results) {
        return [];
      }

      let pdfCounter = 1;

      return searchResults.results
        .filter((result: any) => {
          // Filter out results without valid URLs
          if (!result.url) {
            console.warn("Exa result missing URL, skipping");
            return false;
          }
          // Allow results without titles (will be named PDF Reference #N)
          return true;
        })
        .map((result: any, index: number) => {
          let title = result.title;
          if (!title || title.trim() === "") {
            title = `PDF Reference #${pdfCounter++}`;
          }

          return {
            id: result.id || `exa-${Date.now()}-${index}`,
            title: title,
            url: result.url,
            snippet:
              result.highlights?.[0] || result.text?.substring(0, 500) || title,
            date: result.publishedDate,
            author: this.extractAuthor(result),
            score: result.score,
            provider: SearchProvider.EXA,
          };
        });
    } catch (error: any) {
      console.error("Exa search failed:", error.message);
      return [];
    }
  }

  /**
   * Search using Perplexity API
   */
  async searchPerplexity(
    query: string,
    numResults: number = 10,
    options: { searchDomainFilter?: string[] } = {}
  ): Promise<SearchResult[]> {
    const results = await perplexityService.search(query, {
      maxResults: numResults,
      searchDomainFilter: options.searchDomainFilter,
    });

    return results.map((result) => ({
      id: result.id,
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      date: result.date,
      provider: SearchProvider.PERPLEXITY,
    }));
  }

  /**
   * Search using Perplexity with multiple queries
   */
  async searchPerplexityMulti(
    queries: string[],
    numResults: number = 10,
    options: { searchDomainFilter?: string[] } = {}
  ): Promise<SearchResult[]> {
    const results = await perplexityService.multiSearch(queries, {
      maxResults: numResults,
      searchDomainFilter: options.searchDomainFilter,
    });

    return results.map((result) => ({
      id: result.id,
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      date: result.date,
      provider: SearchProvider.PERPLEXITY,
    }));
  }

  /**
   * Parallel search across all available providers
   */
  async searchParallel(options: SearchOptions): Promise<ResearchSource[]> {
    const {
      topic,
      documentType,
      instructions,
      numResults = 15,
      excludeUrls = [],
      excludeTitles = [],
      maxSourcesPerDomain = 2,
      enableQueryExpansion = true,
    } = options;

    // Generate queries with instruction enhancement AND academic context
    let queries: string[];
    if (enableQueryExpansion) {
      queries = getAllQueriesWithInstructions(
        topic,
        documentType,
        instructions,
        3
      );
    } else {
      queries = [enhanceQueryForDocumentType(topic, documentType)];
    }

    // Enhance queries with academic keywords
    const academicQueries = queries.map(q => enhanceQueryForAcademicSearch(q, true));
    const primaryQuery = academicQueries[0];

    // Get academic domain filter (Tier 1 + Tier 2, max 20 domains for Perplexity)
    const academicDomains = getSearchDomainFilter(20, true, true, false);

    console.log(`\n=== SEARCH PARALLEL STARTED ===`);
    console.log(`Requested sources: ${numResults}`);
    if (instructions) {
      console.log(`Instructions: ${instructions}`);
    }
    console.log(`Queries:`, academicQueries);
    console.log(`Max sources per domain: ${maxSourcesPerDomain}`);
    console.log(`Academic domain filter: ${academicDomains.length} domains (Perplexity limit: 20)`);
    console.log(`  Priority domains: scholar.google.com, pubmed.gov, ieee.org, nature.com, springer.com, +${academicDomains.length - 5} more`);

    // Calculate how many to request from each provider (request MORE to account for deduplication)
    // Increased from 2.0x to 3.0x with minimum of 20 results
    const exaCount = Math.max(20, Math.ceil(numResults * 3.0));
    const perplexityCount = Math.max(20, Math.ceil(numResults * 3.0));

    console.log(
      `\nRequesting ${exaCount} from Exa, ${perplexityCount} from Perplexity (with domain filter)`
    );

    // Execute parallel searches with academic domain filtering
    const [exaResult, perplexityResult] = await Promise.allSettled([
      this.searchExa({
        query: primaryQuery,
        numResults: exaCount,
        documentType,
      }),
      this.searchPerplexityMulti(academicQueries, perplexityCount, {
        searchDomainFilter: academicDomains,
      }),
    ]);

    // Extract results, handling failures gracefully
    const exaResults = exaResult.status === "fulfilled" ? exaResult.value : [];
    const perplexityResults =
      perplexityResult.status === "fulfilled" ? perplexityResult.value : [];

    // Track which providers failed (explicit errors only)
    const exaFailed = exaResult.status === "rejected";
    const perplexityFailed = perplexityResult.status === "rejected";

    // Log provider status
    if (exaFailed) {
      console.warn("❌ Exa search failed:", exaResult.reason);
    } else {
      console.log(`✓ Exa returned ${exaResults.length} results`);
      if (exaResults.length > 0) {
        console.log(
          `  Sample Exa titles:`,
          exaResults.slice(0, 3).map((r) => r.title)
        );
      }
    }

    if (perplexityFailed) {
      console.warn("❌ Perplexity search failed:", perplexityResult.reason);
    } else {
      console.log(`✓ Perplexity returned ${perplexityResults.length} results`);
      if (perplexityResults.length > 0) {
        console.log(
          `  Sample Perplexity titles:`,
          perplexityResults.slice(0, 3).map((r) => r.title)
        );
      }
    }

    console.log(`\n--- Merging and processing ---`);
    console.log(
      `Total raw results: ${exaResults.length + perplexityResults.length}`
    );

    // Merge, deduplicate, and enforce diversity
    let merged = mergeResults(exaResults, perplexityResults, {
      maxSourcesPerDomain,
      totalMaxResults: numResults * 2, // Allow more before final trim
    });

    console.log(`After deduplication & diversity: ${merged.length} results`);
    if (merged.length > 0) {
      console.log(
        `  Sample titles:`,
        merged.slice(0, 3).map((r) => r.title)
      );
    }

    // Filter out existing URLs if provided
    if (excludeUrls.length > 0) {
      const beforeFilter = merged.length;
      merged = filterExistingUrls(merged, excludeUrls);
      console.log(
        `After filtering ${excludeUrls.length} existing URLs: ${
          merged.length
        } results (removed ${beforeFilter - merged.length})`
      );
    }

    // Filter out similar titles if provided
    if (excludeTitles.length > 0) {
      const beforeTitleFilter = merged.length;
      merged = filterSimilarTitles(merged, excludeTitles, 0.85); // 85% similarity threshold
      console.log(
        `After filtering ${excludeTitles.length} existing titles: ${
          merged.length
        } results (removed ${beforeTitleFilter - merged.length})`
      );
    }

    // Fallback compensation logic: if we don't have enough results AND one provider failed
    const shortfall = numResults - merged.length;
    const needsCompensation = shortfall > 0 && (exaFailed || perplexityFailed);

    if (needsCompensation) {
      console.log(
        `\n⚠️ Shortfall detected: ${shortfall} sources needed (target: ${numResults}, have: ${merged.length})`
      );
      console.log(
        `Provider status - Exa: ${exaFailed ? "FAILED" : "OK"}, Perplexity: ${
          perplexityFailed ? "FAILED" : "OK"
        }`
      );

      // Determine which provider to use for compensation
      let supplementaryResults: SearchResult[] = [];
      const compensationCount = Math.ceil(shortfall * 2); // Request 2x buffer for compensation

      if (exaFailed && !perplexityFailed) {
        // Exa failed, use Perplexity for compensation
        console.log(
          `🔄 Compensating with Perplexity: requesting ${compensationCount} more results`
        );
        try {
          supplementaryResults = await this.searchPerplexityMulti(
            academicQueries,
            compensationCount,
            {
              searchDomainFilter: academicDomains,
            }
          );
          console.log(
            `✓ Perplexity compensation returned ${supplementaryResults.length} results`
          );
        } catch (error: any) {
          console.warn(`⚠️ Perplexity compensation failed: ${error.message}`);
        }
      } else if (perplexityFailed && !exaFailed) {
        // Perplexity failed, use Exa for compensation
        console.log(
          `🔄 Compensating with Exa: requesting ${compensationCount} more results`
        );
        try {
          supplementaryResults = await this.searchExa({
            query: primaryQuery,
            numResults: compensationCount,
            documentType,
          });
          console.log(
            `✓ Exa compensation returned ${supplementaryResults.length} results`
          );
        } catch (error: any) {
          console.warn(`⚠️ Exa compensation failed: ${error.message}`);
        }
      }

      // Merge supplementary results with existing results
      if (supplementaryResults.length > 0) {
        const beforeCompensation = merged.length;

        // Combine all results: initial + supplementary, separated by provider
        let combinedExaResults: SearchResult[] = [];
        let combinedPerplexityResults: SearchResult[] = [];

        if (exaFailed && !perplexityFailed) {
          // Exa failed, compensating with Perplexity
          // All supplementary results are from Perplexity
          combinedExaResults = [];
          combinedPerplexityResults = [
            ...perplexityResults,
            ...supplementaryResults,
          ];
        } else if (perplexityFailed && !exaFailed) {
          // Perplexity failed, compensating with Exa
          // All supplementary results are from Exa
          combinedExaResults = [...exaResults, ...supplementaryResults];
          combinedPerplexityResults = [];
        }

        // Re-merge with supplementary results
        merged = mergeResults(combinedExaResults, combinedPerplexityResults, {
          maxSourcesPerDomain,
          totalMaxResults: numResults * 2,
        });

        // Re-apply filters
        if (excludeUrls.length > 0) {
          merged = filterExistingUrls(merged, excludeUrls);
        }
        if (excludeTitles.length > 0) {
          merged = filterSimilarTitles(merged, excludeTitles, 0.85);
        }

        console.log(
          `✓ After compensation: ${merged.length} sources (added ${
            merged.length - beforeCompensation
          })`
        );
      }
    }

    // Final trim to requested amount - DISABLED to show all relevant results
    // merged = merged.slice(0, numResults);

    // Calculate academic source statistics
    const academicSourceCount = merged.filter(r => {
      const prestige = getDomainPrestige(r.url);
      return prestige === 'high' || prestige === 'medium';
    }).length;
    const academicPercentage = merged.length > 0
      ? Math.round((academicSourceCount / merged.length) * 100)
      : 0;

    console.log(`\n✓ Final result: ${merged.length} sources`);
    console.log(`  Academic sources: ${academicSourceCount}/${merged.length} (${academicPercentage}%)`);
    if (merged.length > 0) {
      console.log(
        `  Domains:`,
        [...new Set(merged.map((r) => r.url.split("/")[2]))].slice(0, 5)
      );
    }
    console.log(`=== SEARCH PARALLEL COMPLETE ===\n`);

    // Convert to ResearchSource format
    return toResearchSources(merged);
  }

  /**
   * Search for targeted queries (used in deep regeneration)
   */
  async searchTargeted(
    query: string,
    documentType: DocumentType,
    excludeUrls: string[] = [],
    maxResults: number = 4
  ): Promise<ResearchSource[]> {
    const enhancedQuery = enhanceQueryForDocumentType(query, documentType);
    const academicQuery = enhanceQueryForAcademicSearch(enhancedQuery, true);

    // Get academic domain filter (max 20 for Perplexity)
    const academicDomains = getSearchDomainFilter(20, true, true, false);

    // Execute parallel searches for single query with domain filtering
    const [exaResult, perplexityResult] = await Promise.allSettled([
      this.searchExa({
        query: academicQuery,
        numResults: 10,
        documentType,
      }),
      this.searchPerplexity(academicQuery, 10, {
        searchDomainFilter: academicDomains,
      }),
    ]);

    const exaResults = exaResult.status === "fulfilled" ? exaResult.value : [];
    const perplexityResults =
      perplexityResult.status === "fulfilled" ? perplexityResult.value : [];

    // Merge and process
    let merged = mergeResults(exaResults, perplexityResults, {
      maxSourcesPerDomain: 2,
      totalMaxResults: maxResults * 2, // Get more, then filter
    });

    // Filter out existing URLs
    if (excludeUrls.length > 0) {
      merged = filterExistingUrls(merged, excludeUrls);
    }

    // Limit results
    merged = merged.slice(0, maxResults);

    return toResearchSources(merged);
  }

  /**
   * Extract author from Exa result with multiple fallback strategies
   */
  private extractAuthor(result: any): string | undefined {
    // 1. Try Exa's author field
    if (result.author && result.author.trim()) {
      return result.author.trim();
    }

    // 2. Extract from URL patterns
    try {
      const url = new URL(result.url);
      const hostname = url.hostname;
      const pathname = url.pathname;

      // Medium: @username
      if (hostname.includes("medium.com") && pathname.includes("@")) {
        const match = pathname.match(/@([^/]+)/);
        if (match) return match[1].replace(/-/g, " ");
      }

      // Substack: username.substack.com
      if (hostname.includes(".substack.com")) {
        const subdomain = hostname.split(".")[0];
        if (subdomain && subdomain !== "www") {
          return subdomain.replace(/-/g, " ");
        }
      }

      // GitHub: github.com/username
      if (hostname.includes("github.com")) {
        const parts = pathname.split("/").filter(Boolean);
        if (parts.length > 0) return parts[0];
      }

      // LinkedIn: /in/username
      if (hostname.includes("linkedin.com") && pathname.includes("/in/")) {
        const match = pathname.match(/\/in\/([^/]+)/);
        if (match) return match[1].replace(/-/g, " ");
      }

      // 3. Extract from title "by Author Name" pattern
      if (result.title) {
        const byMatch = result.title.match(
          /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
        );
        if (byMatch) return byMatch[1];
      }

      // 4. Clean domain fallback
      return hostname
        .replace(/^www\./, "")
        .split(".")[0]
        .replace(/-/g, " ")
        .split(" ")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    } catch {
      return "Unknown Author";
    }
  }
}

// Singleton instance
export const searchService = new SearchService();
