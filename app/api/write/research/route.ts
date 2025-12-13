import { NextRequest, NextResponse } from "next/server";
import {
  ResearchRequest,
  ResearchResponse,
  ResearchSource,
  DocumentType,
} from "@/lib/types/document";
import {
  createServerSupabaseClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { searchService } from "@/lib/services/searchService";
import { contentFetchingService } from "@/lib/services/contentFetchingService";

// Extended request type to include projectId
interface ExtendedResearchRequest extends ResearchRequest {
  projectId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtendedResearchRequest = await request.json();
    const {
      topic,
      documentType,
      instructions,
      numSources = 15,
      projectId,
      excludeUrls = [],
      excludeTitles = [],
      mode = "replace",
    } = body;

    if (!topic || !documentType) {
      return NextResponse.json(
        { error: "Topic and document type are required" },
        { status: 400 }
      );
    }

    console.log(`Starting parallel search for topic: ${topic}`);
    if (instructions) {
      console.log(`With instructions: ${instructions}`);
    }
    console.log(
      `Available providers: ${searchService.getAvailableProviders().join(", ")}`
    );

    // Calculate dynamic domain limit based on requested source count
    // Formula: ceil(numSources / 5), capped at 5 for diversity
    const dynamicDomainLimit = Math.min(5, Math.ceil(numSources / 5));
    console.log(
      `Dynamic domain limit: ${dynamicDomainLimit} (for ${numSources} sources)`
    );

    // Use the unified search service for parallel Exa + Perplexity search
    const sources = await searchService.searchParallel({
      topic,
      documentType,
      instructions,
      numResults: numSources,
      maxSourcesPerDomain: dynamicDomainLimit, // Dynamic diversity based on source count
      enableQueryExpansion: true, // Generate varied queries
      excludeUrls,
      excludeTitles,
    });

    console.log(
      `Got ${sources.length} sources after deduplication and diversity enforcement`
    );

    // If projectId provided, save sources to database
    let savedSources = sources;
    if (projectId) {
      try {
        const user = await getCurrentUser();
        if (user) {
          const supabase = await createServerSupabaseClient();

          let startPosition = 0;

          // Delete existing sources for this project only if mode is replace
          if (mode === "replace") {
            await supabase
              .from("research_sources")
              .delete()
              .eq("project_id", projectId);
          } else {
            // If appending, find the current max position
            const { count } = await supabase
              .from("research_sources")
              .select("*", { count: "exact", head: true })
              .eq("project_id", projectId);

            startPosition = count || 0;
          }

          // Map provider to valid source_type
          const getSourceType = (
            provider?: string
          ): "web" | "academic" | "news" | "blog" => {
            // For now, both EXA and PERPLEXITY are general web search providers
            // Could be enhanced to infer type from URL or metadata in the future
            return "web";
          };

          // Insert new sources
          const sourcesToInsert = sources.map((source, index) => ({
            project_id: projectId,
            title: source.title,
            url: source.url,
            author: source.author || null,
            published_date: source.publishedDate || null,
            excerpt: source.excerpt,
            full_content: null,
            highlights: null,
            source_type: getSourceType(source.provider),
            relevance_score: source.score || null,
            is_selected: source.selected,
            position: startPosition + index,
          }));

          const { data: insertedSources, error: insertError } = await supabase
            .from("research_sources")
            .insert(sourcesToInsert)
            .select();

          if (insertError) {
            console.error("Failed to save sources to database:", insertError);
          } else if (insertedSources) {
            // Map database IDs back to sources
            savedSources = insertedSources.map((dbSource) => ({
              id: dbSource.id,
              title: dbSource.title,
              url: dbSource.url,
              author: dbSource.author || undefined,
              publishedDate: dbSource.published_date || undefined,
              excerpt: dbSource.excerpt,
              score: dbSource.relevance_score
                ? Number(dbSource.relevance_score)
                : undefined,
              selected: dbSource.is_selected,
              provider: sources.find((s) => s.url === dbSource.url)?.provider,
              domain: sources.find((s) => s.url === dbSource.url)?.domain,
            }));
            console.log(`Saved ${savedSources.length} sources to database`);

            // NEW: Fetch full content for top sources
            try {
              // Select top sources by relevance score (threshold: 0.5)
              // Fetch full content for all requested sources, not just top 8
              const topSources = insertedSources
                .filter((s) => s.relevance_score && s.relevance_score > 0.5)
                .sort(
                  (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)
                )
                .slice(0, numSources);

              console.log(
                `[Content Fetch] Starting for ${topSources.length} top sources`
              );

              // Fetch content in parallel with retry logic
              const fetchResults = await contentFetchingService.fetchMultiple(
                topSources.map((s) => ({
                  id: s.id,
                  url: s.url,
                  title: s.title,
                })),
                {
                  maxConcurrent: 3,
                  timeout: 8000,
                  retries: 2,
                  maxWords: 500,
                }
              );

              // Update database with results
              for (const result of fetchResults) {
                const updateData: any = {
                  content_fetch_status: result.success ? "success" : "failed",
                  fetch_attempted_at: new Date().toISOString(),
                  fetch_completed_at: new Date().toISOString(),
                  fetch_duration_ms: result.fetchDuration,
                };

                if (result.success && result.content) {
                  updateData.full_content = result.content;
                  updateData.content_word_count = result.wordCount;
                  updateData.content_char_count = result.content.length;
                } else {
                  updateData.fetch_error = result.error;
                }

                await supabase
                  .from("research_sources")
                  .update(updateData)
                  .eq("id", result.sourceId);
              }

              const successCount = fetchResults.filter((r) => r.success).length;
              console.log(
                `[Content Fetch] Success: ${successCount}/${fetchResults.length}`
              );
            } catch (fetchError) {
              console.error("[Content Fetch] Non-fatal error:", fetchError);
              // Continue - generation will use excerpts
            }
          }
        }
      } catch (dbError) {
        console.error("Database operation failed:", dbError);
        // Continue with in-memory sources if database fails
      }
    }

    const response: ResearchResponse = {
      sources: savedSources,
      query: topic,
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
