import { NextRequest, NextResponse } from 'next/server';
import Exa from 'exa-js';
import { ResearchRequest, ResearchResponse, ResearchSource, DocumentType } from '@/lib/types/document';

const exa = new Exa(process.env.EXA_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();
    const { topic, documentType, numSources = 15 } = body;

    if (!topic || !documentType) {
      return NextResponse.json(
        { error: 'Topic and document type are required' },
        { status: 400 }
      );
    }

    // Enhance the search query based on document type
    const enhancedQuery = enhanceQueryForDocumentType(topic, documentType);

    console.log('Searching with Exa for:', enhancedQuery);

    // Use Exa search with enhanced parameters
    const searchResults = await exa.searchAndContents(enhancedQuery, {
      type: 'neural', // Use neural search for better semantic matching
      useAutoprompt: true, // Let Exa optimize the search query
      numResults: numSources,
      text: {
        maxCharacters: 1000, // Get meaningful excerpts
      },
      highlights: {
        numSentences: 3, // Get key highlights
      },
    });

    // Transform Exa results into our ResearchSource format
    const sources: ResearchSource[] = searchResults.results.map((result: any, index: number) => {
      // Extract author from the result if available
      const author = extractAuthor(result);

      // Get the best excerpt (highlights or text)
      const excerpt = result.highlights?.[0] || result.text?.substring(0, 500) || result.title;

      return {
        id: result.id || `source-${index}`,
        title: result.title || 'Untitled',
        url: result.url,
        author,
        publishedDate: result.publishedDate,
        excerpt,
        score: result.score,
        selected: true, // All sources selected by default
      };
    });

    // Sort by relevance score (highest first)
    sources.sort((a, b) => (b.score || 0) - (a.score || 0));

    const response: ResearchResponse = {
      sources,
      query: enhancedQuery,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Research API error:', error);
    return NextResponse.json(
      {
        error: error.message || 'An error occurred while researching sources',
        sources: [],
        query: '',
      },
      { status: 500 }
    );
  }
}

// Enhance the search query based on document type to get better results
function enhanceQueryForDocumentType(topic: string, documentType: DocumentType): string {
  let prefix = '';

  switch (documentType) {
    case DocumentType.RESEARCH_PAPER:
      prefix = 'academic research';
      break;
    case DocumentType.ESSAY:
      prefix = 'analysis and discussion';
      break;
    case DocumentType.REPORT:
      prefix = 'comprehensive report';
      break;
    case DocumentType.ASSIGNMENT:
      prefix = 'educational information';
      break;
  }

  return `${prefix} about ${topic}`;
}

// Try to extract author information from the result
function extractAuthor(result: any): string | undefined {
  // Exa might provide author in different fields
  if (result.author) {
    return result.author;
  }

  // Try to extract from URL (e.g., medium.com/@username)
  try {
    const url = new URL(result.url);
    const hostname = url.hostname;

    // Check for known patterns
    if (hostname.includes('medium.com') && url.pathname.includes('@')) {
      const authorMatch = url.pathname.match(/@([^/]+)/);
      if (authorMatch) {
        return authorMatch[1];
      }
    }

    // For other sites, use the domain name as a fallback
    return hostname.replace('www.', '');
  } catch {
    return undefined;
  }
}
