import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { contentFetchingService } from "@/lib/services/contentFetchingService";

/**
 * API endpoint to re-fetch metadata for sources that are missing author information
 */
export async function POST(request: NextRequest) {
  try {
    const { sourceIds } = await request.json();

    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return NextResponse.json(
        { error: "sourceIds array is required" },
        { status: 400 }
      );
    }

    console.log(`[Refetch Metadata] Starting for ${sourceIds.length} sources`);

    const supabase = await createServerSupabaseClient();

    // Fetch source details from database
    const { data: sources, error: fetchError } = await supabase
      .from("research_sources")
      .select("id, url, title")
      .in("id", sourceIds);

    if (fetchError || !sources) {
      console.error("[Refetch Metadata] Failed to fetch sources:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch sources from database" },
        { status: 500 }
      );
    }

    console.log(
      `[Refetch Metadata] Found ${sources.length} sources to process`
    );

    // Fetch content and metadata for each source
    const fetchResults = await contentFetchingService.fetchMultiple(
      sources.map((s) => ({
        id: s.id,
        url: s.url,
        title: s.title,
      })),
      {
        maxConcurrent: 3,
        timeout: 10000, // Longer timeout for metadata extraction
        retries: 2,
        maxWords: 500,
      }
    );

    // Update database with results
    const results = {
      success: 0,
      failed: 0,
      details: [] as Array<{
        id: string;
        title: string;
        success: boolean;
        author?: string;
        hasAuthorsStructured?: boolean;
        error?: string;
      }>,
    };

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

        // Store academic metadata
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

        // Update author if extraction found one
        if (result.author) {
          updateData.author = result.author;
        }

        results.success++;
        results.details.push({
          id: result.sourceId,
          title: sources.find((s) => s.id === result.sourceId)?.title || "",
          success: true,
          author: result.author,
          hasAuthorsStructured: !!result.authorsStructured,
        });

        console.log(
          `[Refetch Metadata] ✓ ${result.sourceId}: Author=${
            result.author || "none"
          }, Journal=${result.journalName || "none"}`
        );
      } else {
        updateData.fetch_error = result.error;
        results.failed++;
        results.details.push({
          id: result.sourceId,
          title: sources.find((s) => s.id === result.sourceId)?.title || "",
          success: false,
          error: result.error,
        });

        console.log(`[Refetch Metadata] ✗ ${result.sourceId}: ${result.error}`);
      }

      // Update the database
      await supabase
        .from("research_sources")
        .update(updateData)
        .eq("id", result.sourceId);
    }

    console.log(
      `[Refetch Metadata] Complete: ${results.success} success, ${results.failed} failed`
    );

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("[Refetch Metadata] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to refetch metadata" },
      { status: 500 }
    );
  }
}






