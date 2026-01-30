import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AcademicLevel, WritingStyle, ResearchSource } from "@/lib/types/document";
import { getMinimalHumanizationHint, getEmDashHint } from "@/lib/utils/humanizationPrompt";

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
  contextBefore: string
): Promise<string> {
  const targetWordCount = section.estimatedWordCount || 500;

  // Build sources context
  const sourcesContext = sources
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}
${s.full_content ? s.full_content.substring(0, 1000) : s.excerpt}
${s.author ? `Author: ${s.author}` : ""}
${s.url ? `URL: ${s.url}` : ""}`
    )
    .join("\n\n");

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

RESEARCH SOURCES:
${sourcesContext}

TASK:
Write the content for this section. Your output should:
1. Start with the section heading as an <h1> or <h2> tag
2. Cover all key points thoroughly
3. Integrate information from the research sources naturally
4. Maintain consistency with the document's tone and approach
5. Use proper HTML formatting (headings, paragraphs, lists, etc.)
6. Target approximately ${targetWordCount} words
7. Flow naturally from the previous content

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

  return completion.choices[0]?.message?.content || "";
}

export async function POST(request: NextRequest) {
  try {
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
    }));

    // Set up SSE stream
    const encoder = new TextEncoder();
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
              contextBefore
            );

            // Stream the section update
            const data = JSON.stringify({
              sectionId,
              sectionTitle: section.title,
              content: sectionContent,
              done: false,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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
