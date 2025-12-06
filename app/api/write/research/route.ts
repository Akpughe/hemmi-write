import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";
import {
  ResearchRequest,
  ResearchResponse,
  ResearchSource,
  DocumentType,
} from "@/lib/types/document";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

const exa = new Exa(process.env.EXA_API_KEY);

// Extended request type to include projectId
interface ExtendedResearchRequest extends ResearchRequest {
  projectId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtendedResearchRequest = await request.json();
    const { topic, documentType, numSources = 15, projectId } = body;

    if (!topic || !documentType) {
      return NextResponse.json(
        { error: "Topic and document type are required" },
        { status: 400 }
      );
    }

    // Enhance the search query based on document type
    const enhancedQuery = enhanceQueryForDocumentType(topic, documentType);

    console.log("Searching with Exa for:", enhancedQuery);

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
      console.log(`Using category filter: ${category}`);
      searchResults = await exa.searchAndContents(enhancedQuery, {
        type: "neural",
        useAutoprompt: true,
        numResults: Math.min(numSources, 10), // Get fewer high-quality first
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
    const neededSources = numSources - (searchResults?.results.length || 0);
    if (neededSources > 0) {
      console.log(`Supplementing with ${neededSources} general search results`);
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

    // Check if we got any results
    if (!searchResults) {
      console.warn("No search results found");
      return NextResponse.json({
        sources: [],
        query: enhancedQuery,
      });
    }

    // Transform Exa results into our ResearchSource format
    const sources: ResearchSource[] = searchResults.results.map(
      (result: any, index: number) => {
        // Extract author from the result if available
        const author = extractAuthor(result);

        // Get the best excerpt (highlights or text)
        const excerpt =
          result.highlights?.[0] ||
          result.text?.substring(0, 500) ||
          result.title;

        return {
          id: result.id || `source-${index}`,
          title: result.title || "Untitled",
          url: result.url,
          author,
          publishedDate: result.publishedDate,
          excerpt,
          score: result.score,
          selected: true, // All sources selected by default
        };
      }
    );

    // Sort by relevance score (highest first)
    sources.sort((a, b) => (b.score || 0) - (a.score || 0));

    // If projectId provided, save sources to database
    let savedSources = sources;
    if (projectId) {
      try {
        const user = await getCurrentUser();
        if (user) {
          const supabase = await createServerSupabaseClient();
          
          // Delete existing sources for this project (replace with new ones)
          await supabase
            .from('research_sources')
            .delete()
            .eq('project_id', projectId);
          
          // Insert new sources
          const sourcesToInsert = sources.map((source, index) => ({
            project_id: projectId,
            title: source.title,
            url: source.url,
            author: source.author || null,
            published_date: source.publishedDate || null,
            excerpt: source.excerpt,
            full_content: null, // Could be populated later
            highlights: null,
            source_type: 'web' as const,
            relevance_score: source.score || null,
            is_selected: source.selected,
            position: index,
          }));

          const { data: insertedSources, error: insertError } = await supabase
            .from('research_sources')
            .insert(sourcesToInsert)
            .select();

          if (insertError) {
            console.error('Failed to save sources to database:', insertError);
          } else if (insertedSources) {
            // Map database IDs back to sources
            savedSources = insertedSources.map((dbSource) => ({
              id: dbSource.id,
              title: dbSource.title,
              url: dbSource.url,
              author: dbSource.author || undefined,
              publishedDate: dbSource.published_date || undefined,
              excerpt: dbSource.excerpt,
              score: dbSource.relevance_score ? Number(dbSource.relevance_score) : undefined,
              selected: dbSource.is_selected,
            }));
            console.log(`Saved ${savedSources.length} sources to database`);
          }
        }
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        // Continue with in-memory sources if database fails
      }
    }

    const response: ResearchResponse = {
      sources: savedSources,
      query: enhancedQuery,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Research API error:", error);
    return NextResponse.json(
      {
        error: error.message || "An error occurred while researching sources",
        sources: [],
        query: "",
      },
      { status: 500 }
    );
  }
}

// Enhance the search query based on document type to get better results
function enhanceQueryForDocumentType(
  topic: string,
  documentType: DocumentType
): string {
  let prefix = "";

  switch (documentType) {
    case DocumentType.RESEARCH_PAPER:
      prefix = "academic research";
      break;
    case DocumentType.ESSAY:
      prefix = "analysis and discussion";
      break;
    case DocumentType.REPORT:
      prefix = "comprehensive report";
      break;
  }

  return `${prefix} about ${topic}`;
}

// Try to extract author information from the result with multiple fallback strategies
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
