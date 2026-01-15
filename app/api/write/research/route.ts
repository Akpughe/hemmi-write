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
import { metadataEnrichmentService } from "@/lib/services/metadataEnrichmentService";
import { getDomainPrestige } from "@/lib/utils/academicSourcePriority";
import {
  scoreAndFilterSources,
  getQualityStatistics,
  type ScoredSource,
} from "@/lib/utils/sourceQualityScorer";

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

          // Insert new sources with domain prestige
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
            domain_prestige: getDomainPrestige(source.url), // NEW: Add domain prestige
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

            // NEW: Fetch full content for ALL sources (to extract metadata)
            try {
              // Fetch metadata for all sources, prioritizing by relevance score if available
              const sourcesToFetch = [...insertedSources]
                .sort(
                  (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)
                )
                .slice(0, numSources);

              console.log(
                `[Content Fetch] Starting for ${sourcesToFetch.length} sources to extract metadata`
              );

              // Fetch content in parallel with retry logic
              const fetchResults = await contentFetchingService.fetchMultiple(
                sourcesToFetch.map((s) => ({
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

                  // Store academic metadata if extracted
                  updateData.journal_name = result.journalName || null;
                  updateData.volume = result.volume || null;
                  updateData.issue = result.issue || null;
                  updateData.pages = result.pages || null;
                  updateData.doi = result.doi || null;
                  updateData.year = result.year || null;
                  updateData.publisher = result.publisher || null;
                  updateData.publication_type = result.publicationType || "web";
                  updateData.authors_structured = result.authorsStructured
                    ? JSON.stringify(result.authorsStructured)
                    : null;

                  // Update author if extraction found one and DB doesn't have it
                  if (result.author) {
                    const { data: existingSource } = await supabase
                      .from("research_sources")
                      .select("author")
                      .eq("id", result.sourceId)
                      .single();

                    if (existingSource && !existingSource.author) {
                      updateData.author = result.author;
                    }
                  }
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

              // NEW: Enrich metadata via APIs
              try {
                console.log(
                  `[Metadata Enrichment] Starting for ${insertedSources.length} sources`
                );

                // Fetch current source data from database for enrichment
                const { data: sourcesForEnrichment, error: fetchError } =
                  await supabase
                    .from("research_sources")
                    .select("*")
                    .in(
                      "id",
                      insertedSources.map((s) => s.id)
                    );

                if (fetchError || !sourcesForEnrichment) {
                  console.error(
                    "[Metadata Enrichment] Failed to fetch sources:",
                    fetchError
                  );
                } else {
                  // Enrich each source
                  const enrichmentResults = await Promise.allSettled(
                    sourcesForEnrichment.map((source) =>
                      metadataEnrichmentService.enrichSource({
                        id: source.id,
                        title: source.title,
                        url: source.url,
                        author: source.author || undefined,
                        doi: source.doi || undefined,
                        journalName: source.journal_name || undefined,
                        volume: source.volume || undefined,
                        issue: source.issue || undefined,
                        pages: source.pages || undefined,
                        year: source.year || undefined,
                        publisher: source.publisher || undefined,
                        publicationType: source.publication_type || undefined,
                        authorsStructured: source.authors_structured
                          ? typeof source.authors_structured === "string"
                            ? JSON.parse(source.authors_structured)
                            : source.authors_structured
                          : undefined,
                        full_content: source.full_content || undefined,
                      })
                    )
                  );

                  // Update database with enriched metadata
                  let enrichedCount = 0;
                  for (let i = 0; i < enrichmentResults.length; i++) {
                    const result = enrichmentResults[i];
                    if (result.status === "fulfilled" && result.value) {
                      const enriched = result.value;
                      const sourceId = sourcesForEnrichment[i].id;

                      const updateData: any = {
                        // Update metadata source and confidence
                        metadata_source: enriched.metadata_source || null,
                        metadata_confidence:
                          enriched.metadata_confidence || null,
                        citation_count: enriched.citation_count || null,
                        open_access_url: enriched.open_access_url || null,
                      };

                      // Update authors if enriched
                      if (
                        enriched.authorsStructured &&
                        enriched.authorsStructured.length > 0
                      ) {
                        updateData.authors_structured = JSON.stringify(
                          enriched.authorsStructured
                        );
                        // Also update author string if not already set
                        if (
                          !sourcesForEnrichment[i].author &&
                          enriched.author
                        ) {
                          updateData.author = enriched.author;
                        }
                      } else if (
                        enriched.author &&
                        !sourcesForEnrichment[i].author
                      ) {
                        updateData.author = enriched.author;
                      }

                      // Update DOI if found
                      if (enriched.doi && !sourcesForEnrichment[i].doi) {
                        updateData.doi = enriched.doi;
                      }

                      // Update journal metadata if enriched and not already set
                      if (
                        enriched.journalName &&
                        !sourcesForEnrichment[i].journal_name
                      ) {
                        updateData.journal_name = enriched.journalName;
                      }
                      if (enriched.volume && !sourcesForEnrichment[i].volume) {
                        updateData.volume = enriched.volume;
                      }
                      if (enriched.issue && !sourcesForEnrichment[i].issue) {
                        updateData.issue = enriched.issue;
                      }
                      if (enriched.pages && !sourcesForEnrichment[i].pages) {
                        updateData.pages = enriched.pages;
                      }
                      if (enriched.year && !sourcesForEnrichment[i].year) {
                        updateData.year = enriched.year;
                      }
                      if (
                        enriched.publisher &&
                        !sourcesForEnrichment[i].publisher
                      ) {
                        updateData.publisher = enriched.publisher;
                      }
                      if (
                        enriched.publicationType &&
                        !sourcesForEnrichment[i].publication_type
                      ) {
                        updateData.publication_type = enriched.publicationType;
                      }

                      // Update venue prestige if enriched
                      if (enriched.venuePrestige && !sourcesForEnrichment[i].venue_prestige) {
                        updateData.venue_prestige = enriched.venuePrestige;
                      }

                      await supabase
                        .from("research_sources")
                        .update(updateData)
                        .eq("id", sourceId);

                      enrichedCount++;
                    } else if (result.status === "rejected") {
                      console.error(
                        `[Metadata Enrichment] Failed for source ${sourcesForEnrichment[i].id}:`,
                        result.reason
                      );
                    }
                  }

                  console.log(
                    `[Metadata Enrichment] Completed: ${enrichedCount}/${sourcesForEnrichment.length} sources enriched`
                  );
                }
              } catch (enrichError) {
                console.error(
                  "[Metadata Enrichment] Non-fatal error:",
                  enrichError
                );
                // Continue - metadata enrichment is optional
              }

              // NEW: Quality Scoring & Filtering (Phase 3)
              try {
                console.log(
                  `[Quality Scoring] Starting for ${insertedSources.length} sources`
                );

                // Fetch current source data from database for scoring
                const { data: sourcesForScoring, error: scoringFetchError } =
                  await supabase
                    .from("research_sources")
                    .select("*")
                    .in(
                      "id",
                      insertedSources.map((s) => s.id)
                    );

                if (scoringFetchError || !sourcesForScoring) {
                  console.error(
                    "[Quality Scoring] Failed to fetch sources:",
                    scoringFetchError
                  );
                } else {
                  // Convert database sources to ScoredSource format
                  const sourcesToScore: ScoredSource[] = sourcesForScoring.map(
                    (source) => ({
                      id: source.id,
                      title: source.title,
                      url: source.url,
                      excerpt: source.excerpt || undefined,
                      author: source.author || undefined,
                      authorsStructured: source.authors_structured
                        ? typeof source.authors_structured === "string"
                          ? JSON.parse(source.authors_structured)
                          : source.authors_structured
                        : undefined,
                      doi: source.doi || undefined,
                      journalName: source.journal_name || undefined,
                      volume: source.volume || undefined,
                      issue: source.issue || undefined,
                      pages: source.pages || undefined,
                      year: source.year || undefined,
                      publisher: source.publisher || undefined,
                      publicationType: source.publication_type || undefined,
                      venuePrestige: source.venue_prestige || undefined,
                      domainPrestige: source.domain_prestige || undefined,
                      citationCount: source.citation_count || undefined,
                      score:
                        source.relevance_score !== null
                          ? Number(source.relevance_score)
                          : undefined,
                    })
                  );

                  // Score sources (but don't filter yet - let user see all sources)
                  const scoredSources = scoreAndFilterSources(sourcesToScore, {
                    minScore: 0, // Don't filter, just score
                    sortByScore: false, // Don't sort, preserve original order
                  });

                  // Get quality statistics
                  const stats = getQualityStatistics(scoredSources);
                  console.log(
                    `[Quality Scoring] Statistics:`,
                    `Total: ${stats.total}, ` +
                      `A: ${stats.gradeA}, B: ${stats.gradeB}, C: ${stats.gradeC}, D: ${stats.gradeD}, F: ${stats.gradeF}, ` +
                      `Avg: ${stats.averageScore}/5, ` +
                      `High Quality (A/B): ${stats.highQuality}/${stats.total} (${Math.round((stats.highQuality / stats.total) * 100)}%)`
                  );

                  // Update database with quality scores
                  for (const source of scoredSources) {
                    await supabase
                      .from("research_sources")
                      .update({
                        quality_score: source.qualityScore,
                        quality_grade: source.qualityGrade,
                      })
                      .eq("id", source.id);
                  }

                  console.log(
                    `[Quality Scoring] Completed: ${scoredSources.length} sources scored and stored`
                  );
                }
              } catch (scoringError) {
                console.error(
                  "[Quality Scoring] Non-fatal error:",
                  scoringError
                );
                // Continue - quality scoring is optional
              }
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
