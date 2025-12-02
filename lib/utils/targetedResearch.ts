import Exa from "exa-js";
import {
  TargetedSearchResult,
  ResearchSource,
  DocumentType,
} from "@/lib/types/document";

const exa = new Exa(process.env.EXA_API_KEY);

/**
 * Conduct targeted web searches based on feedback analysis
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
  for (const query of searchQueries) {
    try {
      const searchResult = await searchForQuery(
        query,
        documentType,
        existingSourceUrls
      );
      results.push(searchResult);
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
 * Search for sources for a single query
 */
async function searchForQuery(
  query: string,
  documentType: DocumentType,
  existingSourceUrls: string[]
): Promise<TargetedSearchResult> {
  // Enhance query based on document type
  const enhancedQuery = enhanceQueryForDocumentType(query, documentType);

  console.log(`Targeted search for: ${enhancedQuery}`);

  // HYBRID APPROACH: Try category-filtered search first for better quality
  let searchResults;
  let category: "research paper" | "pdf" | undefined;

  if (documentType === DocumentType.RESEARCH_PAPER) {
    category = "research paper";
  } else if (documentType === DocumentType.REPORT) {
    category = "pdf";
  }

  // First attempt: category-filtered for quality
  if (category) {
    searchResults = await exa.searchAndContents(enhancedQuery, {
      type: "neural",
      useAutoprompt: true,
      numResults: 10, // Get fewer high-quality first
      category,
      text: {
        maxCharacters: 1000,
      },
      highlights: {
        numSentences: 3,
      },
    });
  }

  // Supplement with general search if needed
  const neededSources = 15 - (searchResults?.results.length || 0);
  if (neededSources > 0) {
    const generalResults = await exa.searchAndContents(enhancedQuery, {
      type: "neural",
      useAutoprompt: true,
      numResults: neededSources,
      // No category filter - broader search
      text: {
        maxCharacters: 1000,
      },
      highlights: {
        numSentences: 3,
      },
    });

    // Merge results
    if (searchResults) {
      searchResults.results = [...searchResults.results, ...generalResults.results];
    } else {
      searchResults = generalResults;
    }
  }

  // Transform and filter results
  const sources: ResearchSource[] = searchResults.results
    .filter((result: any) => {
      // Filter out duplicates from existing sources
      return !existingSourceUrls.includes(result.url);
    })
    .slice(0, 4) // Take top 4 unique results
    .map((result: any, index: number) => {
      const author = extractAuthor(result);
      const excerpt =
        result.highlights?.[0] ||
        result.text?.substring(0, 500) ||
        result.title;

      return {
        id: result.id || `targeted-${Date.now()}-${index}`,
        title: result.title || "Untitled",
        url: result.url,
        author,
        publishedDate: result.publishedDate,
        excerpt,
        score: result.score,
        selected: true, // New sources selected by default
      };
    });

  // Generate rationale for this search
  const rationale = generateSearchRationale(query, sources.length);

  return {
    query: enhancedQuery,
    sources,
    rationale,
  };
}

/**
 * Enhance search query based on document type
 */
function enhanceQueryForDocumentType(
  query: string,
  documentType: DocumentType
): string {
  let prefix = "";

  switch (documentType) {
    case DocumentType.RESEARCH_PAPER:
      prefix = "academic research";
      break;
    case DocumentType.ESSAY:
      prefix = "analysis";
      break;
    case DocumentType.REPORT:
      prefix = "comprehensive report";
      break;
  }

  // Check if query already has similar prefix
  const lowerQuery = query.toLowerCase();
  if (
    lowerQuery.includes("research") ||
    lowerQuery.includes("academic") ||
    lowerQuery.includes("study")
  ) {
    return query; // Already well-formed
  }

  return `${prefix} ${query}`;
}

/**
 * Extract author from Exa result
 */
function extractAuthor(result: any): string | undefined {
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
      if (match) return match[1].replace(/-/g, ' ');
    }

    // Substack: username.substack.com
    if (hostname.includes(".substack.com")) {
      const subdomain = hostname.split('.')[0];
      if (subdomain && subdomain !== 'www') {
        return subdomain.replace(/-/g, ' ');
      }
    }

    // GitHub: github.com/username
    if (hostname.includes("github.com")) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0) return parts[0];
    }

    // LinkedIn: /in/username
    if (hostname.includes("linkedin.com") && pathname.includes("/in/")) {
      const match = pathname.match(/\/in\/([^/]+)/);
      if (match) return match[1].replace(/-/g, ' ');
    }

    // 3. Extract from title "by Author Name" pattern
    if (result.title) {
      const byMatch = result.title.match(/by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      if (byMatch) return byMatch[1];
    }

    // 4. Clean domain fallback
    return hostname
      .replace(/^www\./, '')
      .split('.')[0]
      .replace(/-/g, ' ')
      .split(' ')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  } catch {
    return 'Unknown Author';
  }
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
