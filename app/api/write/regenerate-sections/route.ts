import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { createServerSupabaseClient, requireAuth } from "@/lib/supabase/server";
import { AcademicLevel, WritingStyle, ResearchSource } from "@/lib/types/document";
import { getMinimalHumanizationHint, getEmDashHint } from "@/lib/utils/humanizationPrompt";
import { perplexityService } from "@/lib/services/perplexityService";
import { savePerplexityCitations } from "@/lib/utils/perplexityCitationSaver";
import { checkTokenBalance, deductTokens, estimateChapterTokens } from "@/lib/middleware/tokenMiddleware";

/**
 * Clean em-dashes from text to avoid AI detection fingerprints
 * Replaces em-dashes with appropriate alternatives
 */
function cleanEmDashes(text: string): string {
  // Replace em-dashes (—, --, etc.) with commas for most cases
  return text
    .replace(/\s*—\s*/g, ', ') // Em-dash with spaces
    .replace(/\s*--\s*/g, ', ') // Double hyphen with spaces
    .replace(/—/g, ', ') // Any remaining em-dashes
    .replace(/,\s*,/g, ','); // Clean up double commas
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface RegenerateSectionsRequest {
  projectId: string;
  sectionIds: string[];
  sourceIds: string[];
  brief: {
    documentType: string;
    topic: string;
    instructions?: string;
    wordCount?: number;
    academicLevel?: string;
    writingStyle?: string;
    citationStyle?: string;
  };
  currentStructure: {
    title: string;
    approach: string;
    tone: string;
    sections: Array<{
      id: string;
      title: string;
      keyPoints: string[];
      estimatedWordCount?: number;
    }>;
  };
}

async function generateSection(
  section: { title: string; keyPoints: string[]; estimatedWordCount?: number },
  sources: ResearchSource[],
  brief: RegenerateSectionsRequest["brief"],
  structure: RegenerateSectionsRequest["currentStructure"],
  contextBefore: string,
  projectId: string
): Promise<string> {
  const targetWordCount = section.estimatedWordCount || 500;

  // Step 1: Call Perplexity to get factual information about this section
  let perplexityContent = "";
  let perplexitySources: ResearchSource[] = [];

  if (perplexityService.isAvailable()) {
    console.log(`[Generate Section] Fetching factual data from Perplexity for: "${section.title}"`);

    const perplexityQuery = `Provide comprehensive factual information about "${section.title}" in the context of ${brief.topic}. Focus on these key points:
${section.keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join("\n")}

Include relevant data, statistics, examples, and authoritative information with citations.`;

    const perplexityResponse = await perplexityService.chatCompletion(perplexityQuery);

    if (perplexityResponse.content) {
      // Clean em-dashes from Perplexity content before using it
      perplexityContent = cleanEmDashes(perplexityResponse.content);
      console.log(`[Generate Section] Perplexity returned ${perplexityContent.length} chars with ${perplexityResponse.citations.length} citations (em-dashes cleaned)`);

      // Save Perplexity citations to research sources
      if (perplexityResponse.citations.length > 0) {
        console.log(`[Generate Section] Saving ${perplexityResponse.citations.length} Perplexity citations to research sources`);
        const savedCitations = await savePerplexityCitations({
          projectId,
          citations: perplexityResponse.citations,
          chapterName: section.title,
          perplexityContent: perplexityContent,
        });
        console.log(`[Generate Section] Saved ${savedCitations.length} citations (${perplexityResponse.citations.length - savedCitations.length} were duplicates)`);
      }

      // Convert Perplexity citations to ResearchSource format
      perplexityResponse.citations.forEach((citation, index) => {
        perplexitySources.push({
          id: `perplexity-${Date.now()}-${index}`,
          title: citation.title || `Source ${index + 1}`,
          url: citation.url,
          excerpt: "",
          selected: true,
        });
      });
    }
  } else {
    console.log(`[Generate Section] Perplexity not available, using only original sources`);
  }

  // Step 2: Merge original sources with Perplexity sources
  const allSources = [...sources, ...perplexitySources];

  // Build sources context from original sources
  const originalSourcesContext = sources
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}
${s.full_content ? s.full_content.substring(0, 1000) : s.excerpt}
${s.author ? `Author: ${s.author}` : ""}
${s.url ? `URL: ${s.url}` : ""}`
    )
    .join("\n\n");

  // Step 3: Build enhanced prompt with both original sources and Perplexity data
  const prompt = `You are an expert academic writer. Generate content for a specific section of a ${brief.documentType}.

DOCUMENT CONTEXT:
Title: ${structure.title}
Topic: ${brief.topic}
Approach: ${structure.approach}
Tone: ${structure.tone}
${brief.instructions ? `Instructions: ${brief.instructions}` : ""}

SECTION TO GENERATE:
Title: ${section.title}
Key Points to Cover:
${section.keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join("\n")}

Target Word Count: ${targetWordCount} words

PREVIOUS CONTENT (for context):
${contextBefore ? contextBefore.substring(Math.max(0, contextBefore.length - 2000)) : "This is the first section."}

ORIGINAL RESEARCH SOURCES:
${originalSourcesContext}

${perplexityContent ? `ADDITIONAL FACTUAL INFORMATION (with inline citations):
${perplexityContent}

Use the information above to enrich your content. The citations [1], [2], etc. in the factual information refer to authoritative sources - integrate this information naturally into your writing.` : ""}

TASK:
Write the content for this section. Your output should:
1. Start with the section heading as an <h1> or <h2> tag
2. Cover all key points thoroughly
3. Integrate information from BOTH the original research sources AND the additional factual information naturally
4. Maintain consistency with the document's tone and approach
5. Use proper HTML formatting (headings, paragraphs, lists, etc.)
6. Target approximately ${targetWordCount} words (adjust as needed to include all important information)
7. Flow naturally from the previous content
8. Weave together insights from all sources to create comprehensive, well-researched content

Return ONLY the HTML content for this section, no additional commentary.`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are an expert academic writer. Generate well-structured HTML content for document sections. Use proper HTML tags like <h1>, <h2>, <p>, <ul>, <ol>, <li>, <strong>, <em>. Do not use markdown.\n\n" + getMinimalHumanizationHint() + "\n\n" + getEmDashHint(),
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "openai/gpt-oss-120b",
    temperature: 0.7,
    max_tokens: Math.min(Math.ceil(targetWordCount * 1.33 * 1.2), 4000),
  });

  const generatedContent = completion.choices[0]?.message?.content || "";

  // Final safety check: clean any em-dashes that might have slipped through
  return cleanEmDashes(generatedContent);
}

export async function POST(request: NextRequest) {
  try {
    // AUTHENTICATE USER
    const user = await requireAuth();

    const body: RegenerateSectionsRequest = await request.json();
    const {
      projectId,
      sectionIds,
      sourceIds,
      brief,
      currentStructure,
    } = body;

    if (!projectId || !sectionIds || sectionIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "projectId and sectionIds are required" }),
        { status: 400 }
      );
    }

    // ESTIMATE TOKEN USAGE for all sections combined
    const totalEstimatedWords = sectionIds.length * 500; // Average 500 words per section
    const estimatedTokens = estimateChapterTokens({
      targetWordCount: totalEstimatedWords,
      sourceCount: sourceIds.length,
      hasContext: true,
    });

    console.log(`[Regenerate Sections] Estimated tokens: ${estimatedTokens} for ${sectionIds.length} sections`);

    // CHECK TOKEN BALANCE
    const tokenCheckError = await checkTokenBalance(user.id, estimatedTokens);
    if (tokenCheckError) {
      console.log(`[Regenerate Sections] ❌ BLOCKED - Insufficient tokens`);
      return tokenCheckError;
    }

    console.log(`[Regenerate Sections] ✅ Token check passed`);

    // Fetch sources from database
    const supabase = await createServerSupabaseClient();
    const { data: sourcesData, error: sourcesError } = await supabase
      .from("research_sources")
      .select("*")
      .eq("project_id", projectId)
      .in("id", sourceIds);

    if (sourcesError) {
      throw new Error("Failed to fetch sources");
    }

    const sources: ResearchSource[] = (sourcesData || []).map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      excerpt: s.excerpt,
      author: s.author || undefined,
      publishedDate: s.published_date || undefined,
      full_content: s.full_content || undefined,
      selected: s.is_selected,
      // Include enriched metadata from APIs
      authorsStructured: s.authors_structured
        ? (typeof s.authors_structured === 'string'
            ? JSON.parse(s.authors_structured)
            : s.authors_structured)
        : undefined,
      doi: s.doi || undefined,
      journalName: s.journal_name || undefined,
      volume: s.volume || undefined,
      issue: s.issue || undefined,
      pages: s.pages || undefined,
      year: s.year || undefined,
      publisher: s.publisher || undefined,
      publicationType: s.publication_type || undefined,
    }));

    // Set up SSE stream
    const encoder = new TextEncoder();
    let totalTokensUsed = 0;
    let totalWordsGenerated = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Generate each section
          for (const sectionId of sectionIds) {
            const section = currentStructure.sections.find(
              (s) => s.id === sectionId
            );
            if (!section) continue;

            // Get context before this section (simplified - just empty for now)
            // In a full implementation, we'd extract the actual content before this section
            const contextBefore = "";

            // Generate section content
            const sectionContent = await generateSection(
              section,
              sources,
              brief,
              currentStructure,
              contextBefore,
              projectId
            );

            // Track words generated
            const sectionWords = sectionContent.split(/\s+/).filter(w => w.length > 0).length;
            totalWordsGenerated += sectionWords;

            // Stream the section update
            const data = JSON.stringify({
              sectionId,
              sectionTitle: section.title,
              content: sectionContent,
              done: false,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // DEDUCT TOKENS after all sections are regenerated
          // Use actual words generated, fallback to estimate
          const actualTokens = Math.ceil(totalWordsGenerated * 1.33) || estimatedTokens;
          const deductSuccess = await deductTokens(user.id, actualTokens, 'chapter', {
            projectId,
            sectionCount: sectionIds.length,
            wordCount: totalWordsGenerated,
            estimatedTokens,
            actualTokens,
          });

          if (!deductSuccess) {
            console.error(`[Regenerate Sections] ⚠️  Failed to deduct tokens (${actualTokens}), but sections were regenerated`);
          } else {
            console.log(`[Regenerate Sections] ✅ Deducted ${actualTokens} tokens`);
          }

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error("Section regeneration error:", error);
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
            done: true,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Regenerate sections error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to regenerate sections";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}
