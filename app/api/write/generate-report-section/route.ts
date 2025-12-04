import { NextRequest } from "next/server";
import {
  DocumentType,
  ResearchSource,
  DocumentSection,
  AcademicLevel,
  WritingStyle,
  DOCUMENT_TYPE_CONFIGS,
  ACADEMIC_LEVEL_CONFIGS,
} from "@/lib/types/document";
import { formatSourcesForPrompt } from "@/lib/utils/documentStructure";
import { aiService } from "@/lib/services/aiService";
import { AIProvider, DEFAULT_AI_PROVIDER } from "@/lib/config/aiModels";
import { getHumanizationPrompt } from "@/lib/config/humanizationGuidelines";

interface GenerateReportSectionRequest {
  documentType: DocumentType;
  topic: string;
  instructions?: string;
  sources: ResearchSource[];
  chapter: DocumentSection; // Reusing 'chapter' type for section
  chapterIndex: number;
  totalChapters: number;
  previousChaptersText?: string;
  documentTitle: string;
  documentApproach: string;
  documentTone: string;
  academicLevel?: AcademicLevel;
  aiProvider?: string;
}

function generateReportSectionPrompt(
  topic: string,
  instructions: string,
  section: DocumentSection,
  sectionIndex: number,
  totalSections: number,
  sourcesText: string,
  previousSectionsText: string,
  documentTitle: string,
  documentApproach: string,
  documentTone: string,
  academicLevel: AcademicLevel
): string {
  const targetWordCount = section.estimatedWordCount || 1000;
  const isProfessional = academicLevel === AcademicLevel.PROFESSIONAL;
  const levelConfig = ACADEMIC_LEVEL_CONFIGS[academicLevel];

  // --- MODE SELECTION ---
  // Professional = Business Report (Exec Summary, Bullets, Actionable)
  // Academic = Academic Report (Abstract, Methodology, Citations, Formal)

  const isExecutiveSummary = section.heading
    .toLowerCase()
    .includes("executive summary");
  const isAbstract = section.heading.toLowerCase().includes("abstract");
  const isMethodology = section.heading.toLowerCase().includes("methodology");

  let prompt = "";

  if (isProfessional) {
    // --- BUSINESS REPORT MODE ---
    if (isExecutiveSummary) {
      prompt = `You are writing the Executive Summary for a professional business report.

DOCUMENT CONTEXT:
Title: "${documentTitle}"
Topic: "${topic}"
Overall Approach: ${documentApproach}
${instructions ? `Additional Instructions: ${instructions}` : ""}

EXECUTIVE SUMMARY REQUIREMENTS:
- Target word count: ${targetWordCount} words
- Style: High-level overview, persuasive, action-oriented ("Bottom Line Up Front")
- Key Elements: Problem statement, key findings, major recommendations
- NO citations needed in the executive summary
- Write in a clear, professional business tone (Active Voice)

STRUCTURE (USE HTML FORMAT):
1. Brief context/background
2. Main findings/analysis summary
3. Key recommendations/action items

Write the executive summary as a cohesive narrative in HTML format (<p> tags, <strong> for emphasis) that allows a busy executive to understand the entire report in minutes.`;
    } else {
      prompt = `You are writing Section ${
        sectionIndex + 1
      } of ${totalSections} for a professional business report.

DOCUMENT CONTEXT:
Title: "${documentTitle}"
Topic: "${topic}"
Overall Approach: ${documentApproach}
Tone: ${documentTone} (Professional, Clear, Actionable)
${instructions ? `Additional Instructions: ${instructions}` : ""}

SECTION TO WRITE:
Heading: ${section.heading}
Description: ${section.description}

KEY POINTS TO COVER:
${(section.keyPoints ?? []).map((point, idx) => `• ${point}`).join("\n")}

TARGET WORD COUNT: ${targetWordCount} words

AVAILABLE SOURCES:
${sourcesText}

PREVIOUS CONTEXT:
${previousSectionsText ? previousSectionsText.slice(-1000) : "None"}

${getHumanizationPrompt(DocumentType.REPORT, academicLevel, true)}

WRITING REQUIREMENTS (BUSINESS MODE):
1. STRUCTURE (USE HTML NOT MARKDOWN):
   - Use HTML heading tags: <h2>, <h3> for section/subsections
   - Use <strong>text</strong> for key terms and metrics (NOT **bold**)
   - Use <ul><li> or <ol><li> for lists (NOT bullet points with - or *)
   - Wrap paragraphs in <p> tags
   - Keep paragraphs concise (3-5 sentences)

2. TONE:
   - Professional, objective, and data-driven
   - Active voice ("We recommend...", "The data shows...")
   - Avoid academic jargon; use business terminology
   - Prioritize actionable insights

3. CITATIONS:
   - Minimal, non-intrusive (e.g., "According to [Source]...")
   - Focus on the insight, not the source

CRITICAL: Write ONLY this section in HTML format (NOT markdown). Focus on clarity and impact.`;
    }
  } else {
    // --- ACADEMIC REPORT MODE ---
    if (isAbstract) {
      prompt = `You are writing the Abstract for an academic report (${
        levelConfig.label
      } level).

DOCUMENT CONTEXT:
Title: "${documentTitle}"
Topic: "${topic}"
${instructions ? `Additional Instructions: ${instructions}` : ""}

ABSTRACT REQUIREMENTS:
- Target word count: ${targetWordCount} words
- Style: Formal, objective, concise
- Key Elements: Context, Purpose, Methodology, Findings, Conclusion
- NO citations in abstract
- Passive voice where appropriate for objectivity

STRUCTURE (USE HTML FORMAT):
Single paragraph wrapped in <p> tags summarizing the entire report.`;
    } else {
      prompt = `You are writing Section ${
        sectionIndex + 1
      } of ${totalSections} for an academic report (${levelConfig.label} level).

DOCUMENT CONTEXT:
Title: "${documentTitle}"
Topic: "${topic}"
Tone: Formal Academic
${instructions ? `Additional Instructions: ${instructions}` : ""}

SECTION TO WRITE:
Heading: ${section.heading}
Description: ${section.description}

KEY POINTS:
${(section.keyPoints ?? []).map((point, idx) => `• ${point}`).join("\n")}

TARGET WORD COUNT: ${targetWordCount} words

AVAILABLE SOURCES:
${sourcesText}

PREVIOUS CONTEXT:
${previousSectionsText ? previousSectionsText.slice(-1000) : "None"}

${getHumanizationPrompt(DocumentType.REPORT, academicLevel, true)}

WRITING REQUIREMENTS (ACADEMIC MODE - USE HTML NOT MARKDOWN):
1. STRUCTURE:
   - Use HTML heading tags with numbered subheadings: <h2>${sectionIndex + 1}.1 Title</h2>
   - Wrap paragraphs in <p> tags with topic sentences
   - Use <strong> and <em> for emphasis (NOT ** or *)
   - Formal transitions

2. TONE:
   - Formal, objective, third-person ("The study found...")
   - Use hedging ("suggests", "indicates") where appropriate
   - Avoid colloquialisms and contractions

3. CITATIONS:
   - Strict adherence to citation standards
   - Cite sources for all claims and data
   - ${levelConfig.citationsPerSection} citations per major point

CRITICAL: Write ONLY this section in HTML format (NOT markdown). Maintain high academic rigor.`;
    }
  }

  prompt += `\n\nBegin writing now in HTML format (use HTML tags, not markdown):`;
  return prompt;
}

function getSystemMessage(academicLevel: AcademicLevel): string {
  if (academicLevel === AcademicLevel.PROFESSIONAL) {
    return `You are an expert business consultant and professional report writer. Your writing is:
- Clear, concise, and impactful
- Data-driven and objective
- Structured for easy reading (headings, bullets)
- Focused on actionable insights and recommendations`;
  } else {
    return `You are an expert academic researcher and writer. Your writing is:
- Formal, objective, and rigorous
- Thoroughly cited and evidence-based
- Structured with clear logical flow
- Appropriate for a ${academicLevel.toLowerCase()} university setting`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateReportSectionRequest = await request.json();
    const {
      documentType,
      topic,
      instructions,
      sources,
      chapter, // mapped to section
      chapterIndex,
      totalChapters,
      previousChaptersText,
      documentTitle,
      documentApproach,
      documentTone,
      academicLevel = AcademicLevel.PROFESSIONAL, // Default to Professional for reports if not specified
      aiProvider,
    } = body;

    // Validation
    if (
      !documentType ||
      !topic ||
      !sources ||
      sources.length === 0 ||
      !chapter
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine AI provider
    const provider = (aiProvider as AIProvider) || DEFAULT_AI_PROVIDER;

    // Format sources
    const sourcesText = formatSourcesForPrompt(
      sources.map((s: ResearchSource) => ({
        title: s.title,
        excerpt: s.excerpt,
        author: s.author,
      }))
    );

    // Smart context truncation
    let truncatedContext = previousChaptersText || "";
    if (truncatedContext) {
      const words = truncatedContext.split(/\s+/);
      if (words.length > 2000) {
        truncatedContext =
          "...(earlier content omitted)...\n\n" + words.slice(-2000).join(" ");
      }
    }

    // Generate prompt
    const userPrompt = generateReportSectionPrompt(
      topic,
      instructions || "",
      chapter,
      chapterIndex,
      totalChapters,
      sourcesText,
      truncatedContext,
      documentTitle,
      documentApproach,
      documentTone,
      academicLevel
    );

    const systemMessage = getSystemMessage(academicLevel);

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream from AI service
          for await (const chunk of aiService.streamChatCompletion(
            provider,
            [
              { role: "system", content: systemMessage },
              { role: "user", content: userPrompt },
            ],
            0.7,
            8000
          )) {
            if (chunk.done) {
              const doneMessage = `data: ${JSON.stringify({ done: true })}\n\n`;
              controller.enqueue(encoder.encode(doneMessage));
            } else if (chunk.content) {
              const sseData = `data: ${JSON.stringify({
                content: chunk.content,
              })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
          }

          controller.close();
        } catch (error: any) {
          console.error("Report section generation error:", error);
          const errorMessage = `data: ${JSON.stringify({
            error: error.message || "Generation failed",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
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
  } catch (error: any) {
    console.error("Report generation API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
