import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
  requireAuth,
} from "@/lib/supabase/server";
import { generateReferenceList } from "@/lib/utils/citations";
import { CitationStyle } from "@/lib/types/document";

interface GenerateReferencesRequest {
  projectId: string;
  citationStyle?: CitationStyle;
  userId?: string; // Optional: if provided, use service role client to bypass RLS
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateReferencesRequest = await request.json();
    const { projectId, citationStyle = CitationStyle.APA, userId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // If userId is provided, use service role client (bypasses RLS); otherwise require authentication
    let targetUserId: string;
    let supabase;

    if (userId) {
      targetUserId = userId;
      try {
        supabase = createServiceRoleSupabaseClient();
      } catch (error) {
        console.error("Failed to create service role client:", error);
        return NextResponse.json(
          {
            error:
              "Service role client not available. SUPABASE_SERVICE_ROLE_KEY must be set.",
          },
          { status: 500 }
        );
      }
    } else {
      const user = await requireAuth();
      targetUserId = user.id;
      supabase = await createServerSupabaseClient();
    }

    console.log("Looking for projectId:", projectId, "userId:", targetUserId);

    // Get the project - explicitly filter by user_id and deleted_at
    const { data: project, error: projectError } = await supabase
      .from("writing_projects")
      .select("id, citation_style")
      .eq("id", projectId)
      .eq("user_id", targetUserId)
      .is("deleted_at", null)
      .single();

    console.log("project", project);
    console.log("projectError", projectError);

    if (projectError || !project) {
      console.error("Project fetch error:", {
        projectId,
        userId: targetUserId,
        error: projectError,
        project,
      });
      return NextResponse.json(
        {
          error: "Project not found",
          details:
            projectError?.message || "No project found with the given ID",
        },
        { status: 404 }
      );
    }

    // Fetch research sources for the project
    // Include ALL sources that were researched, not just selected ones
    // This ensures all sources generated are included in the references
    const { data: researchSources, error: sourcesError } = await supabase
      .from("research_sources")
      .select(
        `
        id, title, url, author, published_date, excerpt, full_content,
        journal_name, volume, issue, pages, doi, year, publisher, publication_type,
        authors_structured
      `
      )
      .eq("project_id", projectId)
      .order("relevance_score", { ascending: false });

    if (sourcesError) {
      console.error("Failed to fetch research sources:", sourcesError);
      return NextResponse.json(
        { error: "Failed to fetch research sources" },
        { status: 500 }
      );
    }

    if (!researchSources || researchSources.length === 0) {
      return NextResponse.json(
        { error: "No research sources found for this project" },
        { status: 404 }
      );
    }

    console.log(
      `[Generate References] Found ${researchSources.length} sources for project ${projectId}`
    );

    // Convert database sources to ResearchSource format
    const sources = researchSources.map((dbSource) => {
      // Parse authors_structured if it's a string
      let authorsStructured = undefined;
      if (dbSource.authors_structured) {
        authorsStructured =
          typeof dbSource.authors_structured === "string"
            ? JSON.parse(dbSource.authors_structured)
            : dbSource.authors_structured;
      }

      return {
        id: dbSource.id,
        title: dbSource.title,
        url: dbSource.url,
        author: dbSource.author || undefined,
        publishedDate: dbSource.published_date || undefined,
        excerpt: dbSource.excerpt,
        score: undefined, // Not needed for references
        selected: true,
        domain: new URL(dbSource.url).hostname,
        provider: undefined, // Database sources don't have a search provider

        // Enriched metadata
        journalName: dbSource.journal_name || undefined,
        volume: dbSource.volume || undefined,
        issue: dbSource.issue || undefined,
        pages: dbSource.pages || undefined,
        doi: dbSource.doi || undefined,
        year: dbSource.year || undefined,
        publisher: dbSource.publisher || undefined,
        publicationType: dbSource.publication_type as
          | "journal"
          | "conference"
          | "book"
          | "book_chapter"
          | "web"
          | "thesis"
          | "report"
          | "preprint"
          | undefined,
        authorsStructured,
      };
    });

    // Use project's citation style if not specified in request
    const style =
      citationStyle ||
      (project.citation_style as CitationStyle) ||
      CitationStyle.APA;

    // Generate the reference list
    const referenceList = generateReferenceList(sources, style);

    console.log(
      `[Generate References] Generated references in ${style} format for ${sources.length} sources`
    );

    return NextResponse.json({
      projectId,
      citationStyle: style,
      sourcesCount: sources.length,
      references: referenceList,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Generate references API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while generating references",
      },
      { status: 500 }
    );
  }
}
