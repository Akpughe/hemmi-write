import { PerplexityCitation } from "@/lib/services/perplexityService";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface SavePerplexityCitationsOptions {
  projectId: string;
  citations: PerplexityCitation[];
  chapterName?: string;
  perplexityContent?: string;
}

interface SavedCitation {
  id: string;
  url: string;
  title: string;
}

/**
 * Save Perplexity citations as research sources in the database
 *
 * This function:
 * 1. Checks if citations already exist (to avoid duplicates)
 * 2. Creates new research_sources entries for new citations
 * 3. Marks them with provider 'perplexity' for tracking
 * 4. Returns the saved citations with their IDs
 */
export async function savePerplexityCitations(
  options: SavePerplexityCitationsOptions
): Promise<SavedCitation[]> {
  const { projectId, citations, chapterName, perplexityContent } = options;

  if (!citations || citations.length === 0) {
    console.log("[Perplexity Citations] No citations to save");
    return [];
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Get existing sources for this project to avoid duplicates
    const { data: existingSources, error: fetchError } = await supabase
      .from("research_sources")
      .select("url, id")
      .eq("project_id", projectId);

    if (fetchError) {
      console.error("[Perplexity Citations] Error fetching existing sources:", fetchError);
      throw fetchError;
    }

    const existingUrls = new Set(existingSources?.map((s) => s.url) || []);
    console.log(`[Perplexity Citations] Found ${existingUrls.size} existing sources for project`);

    // Filter out citations that already exist
    const newCitations = citations.filter((citation) => !existingUrls.has(citation.url));

    if (newCitations.length === 0) {
      console.log("[Perplexity Citations] All citations already exist in research sources");
      // Return existing citations with their IDs
      return citations
        .map((citation) => {
          const existing = existingSources?.find((s) => s.url === citation.url);
          if (existing) {
            return {
              id: existing.id,
              url: citation.url,
              title: citation.title || extractTitleFromUrl(citation.url),
            };
          }
          return null;
        })
        .filter((c): c is SavedCitation => c !== null);
    }

    console.log(`[Perplexity Citations] Saving ${newCitations.length} new citations`);

    // Get the highest position for proper ordering
    const { data: maxPositionData } = await supabase
      .from("research_sources")
      .select("position")
      .eq("project_id", projectId)
      .order("position", { ascending: false })
      .limit(1);

    const startPosition = (maxPositionData?.[0]?.position || 0) + 1;

    // Prepare new research sources
    const newSources = newCitations.map((citation, index) => {
      const title = citation.title || extractTitleFromUrl(citation.url);
      const domain = extractDomain(citation.url);

      // Try to extract a meaningful excerpt from the Perplexity content
      const excerpt = extractExcerptForUrl(perplexityContent, citation.url) ||
                      `Source cited by Perplexity${chapterName ? ` for "${chapterName}"` : ''}`;

      return {
        project_id: projectId,
        title,
        url: citation.url,
        author: null, // Perplexity doesn't provide author info
        published_date: null,
        excerpt,
        full_content: null,
        source_type: "web" as const,
        relevance_score: null,
        is_selected: true,
        position: startPosition + index,
        fetched_at: new Date().toISOString(),
        // Add a note in highlights to indicate this came from Perplexity
        highlights: {
          source: "perplexity",
          chapter: chapterName || "unknown",
          addedAt: new Date().toISOString(),
        },
      };
    });

    // Insert new sources
    const { data: insertedSources, error: insertError } = await supabase
      .from("research_sources")
      .insert(newSources)
      .select("id, url, title");

    if (insertError) {
      console.error("[Perplexity Citations] Error inserting sources:", insertError);
      throw insertError;
    }

    console.log(`[Perplexity Citations] Successfully saved ${insertedSources?.length || 0} new citations`);

    // Combine newly inserted sources with existing ones
    const allSavedCitations: SavedCitation[] = [
      ...(insertedSources || []),
      ...citations
        .filter((citation) => existingUrls.has(citation.url))
        .map((citation) => {
          const existing = existingSources?.find((s) => s.url === citation.url);
          return existing
            ? {
                id: existing.id,
                url: citation.url,
                title: citation.title || extractTitleFromUrl(citation.url),
              }
            : null;
        })
        .filter((c): c is SavedCitation => c !== null),
    ];

    return allSavedCitations;
  } catch (error) {
    console.error("[Perplexity Citations] Failed to save citations:", error);
    // Don't throw - we don't want to fail chapter generation if citation saving fails
    return [];
  }
}

/**
 * Extract a readable title from a URL
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");
    const pathname = urlObj.pathname.split("/").filter((p) => p).pop() || "";

    if (pathname && pathname !== "") {
      // Convert URL slug to title (e.g., "machine-learning-guide" -> "Machine Learning Guide")
      return pathname
        .replace(/\.(html|htm|php|asp|aspx)$/i, "")
        .replace(/[-_]/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
        .substring(0, 200);
    } else {
      return hostname;
    }
  } catch (e) {
    return url.substring(0, 200);
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch (e) {
    return "unknown";
  }
}

/**
 * Try to extract a relevant excerpt from the Perplexity content for a specific URL
 * This is a simple heuristic - looks for sentences near citation markers
 */
function extractExcerptForUrl(content: string | undefined, url: string): string | null {
  if (!content) return null;

  // This is a simple implementation - you could make it more sophisticated
  // by looking for the citation number and extracting nearby text

  // For now, just return a generic excerpt from the beginning
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim().substring(0, 200);
    return firstSentence + (firstSentence.length < sentences[0].trim().length ? "..." : "");
  }

  return null;
}
