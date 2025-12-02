import { NextRequest } from "next/server";
import {
  DocumentType,
  ResearchSource,
  DocumentSection,
  AcademicLevel,
  WritingStyle,
  DOCUMENT_TYPE_CONFIGS,
  ACADEMIC_LEVEL_CONFIGS,
  WRITING_STYLE_CONFIGS,
} from "@/lib/types/document";
import { formatSourcesForPrompt } from "@/lib/utils/documentStructure";
import { aiService } from "@/lib/services/aiService";
import { AIProvider, DEFAULT_AI_PROVIDER } from "@/lib/config/aiModels";

interface GenerateChapterRequest {
  documentType: DocumentType;
  topic: string;
  instructions?: string;
  sources: ResearchSource[];
  chapter: DocumentSection;
  chapterIndex: number;
  totalChapters: number;
  previousChaptersText?: string; // Context from previous chapters
  academicLevel?: AcademicLevel;
  writingStyle?: WritingStyle;
  documentTitle: string;
  documentApproach: string;
  documentTone: string;
  aiProvider?: string;
}

function generateChapterPrompt(
  documentType: DocumentType,
  topic: string,
  instructions: string,
  chapter: DocumentSection,
  chapterIndex: number,
  totalChapters: number,
  sourcesText: string,
  previousChaptersText: string,
  academicLevel: AcademicLevel,
  writingStyle: WritingStyle,
  documentTitle: string,
  documentApproach: string,
  documentTone: string
): string {
  const config = DOCUMENT_TYPE_CONFIGS[documentType];
  const levelConfig = ACADEMIC_LEVEL_CONFIGS[academicLevel];
  const styleConfig = WRITING_STYLE_CONFIGS[writingStyle];

  const chapterNumber = chapterIndex + 1;
  const targetWordCount = chapter.estimatedWordCount || 5000;
  const isAbstract = chapter.heading.toLowerCase().includes("abstract");

  let prompt = isAbstract
    ? `You are writing the Abstract for a ${levelConfig.label.toLowerCase()} ${config.label.toLowerCase()}.

DOCUMENT CONTEXT:
Title: "${documentTitle}"
Topic: "${topic}"
Overall Approach: ${documentApproach}
${instructions ? `Additional Instructions: ${instructions}` : ""}

ABSTRACT REQUIREMENTS:
- Write a single, well-structured paragraph (NO subsections)
- Target word count: ${targetWordCount} words (${
        levelConfig.level === AcademicLevel.UNDERGRADUATE
          ? "250-300"
          : levelConfig.level === AcademicLevel.GRADUATE
          ? "300-350"
          : "350-400"
      } words)
- Must include: Background/context, research objectives/questions, methodology, key findings/results, conclusions/implications
- Use clear, concise academic language
- NO citations needed in the abstract
- Write in past tense for completed research or present tense for conceptual work

STRUCTURE (single paragraph format):
1-2 sentences: Background and research problem
1 sentence: Research objectives/questions
1-2 sentences: Methodology and approach
2-3 sentences: Key findings and results
1-2 sentences: Conclusions and implications

Write the abstract as a SINGLE cohesive paragraph with proper flow between elements.`
    : `You are writing Chapter ${chapterNumber} of ${totalChapters} for a ${levelConfig.label.toLowerCase()} ${config.label.toLowerCase()}.

DOCUMENT CONTEXT:
Title: "${documentTitle}"
Topic: "${topic}"
Overall Approach: ${documentApproach}
Writing Tone: ${documentTone}
${instructions ? `Additional Instructions: ${instructions}` : ""}

ACADEMIC LEVEL: ${levelConfig.label}
- Citations per subsection: ${levelConfig.citationsPerSection}
- Technical depth: ${levelConfig.technicalDepth}
- Analysis style: ${levelConfig.analysisStyle}

WRITING STYLE: ${styleConfig.label}
- ${styleConfig.description}
- Heading format: ${styleConfig.headingFormat}

CHAPTER TO WRITE:
${chapter.heading}

Chapter Description: ${chapter.description}

SUBSECTIONS TO COVER:
${(chapter.keyPoints ?? [])
  .map((point, idx) => `${chapterNumber}.${idx + 1}. ${point}`)
  .join("\n")}

TARGET WORD COUNT: ${targetWordCount} words

AVAILABLE SOURCES:
${sourcesText}`;

  // Add context from previous chapters if available
  if (previousChaptersText && previousChaptersText.trim()) {
    prompt += `\nPREVIOUS CHAPTERS CONTEXT (for continuity and avoiding repetition):
${previousChaptersText}

IMPORTANT: Reference and build upon concepts from previous chapters where appropriate. Avoid repeating information already covered.
`;
  }

  prompt += `
WRITING REQUIREMENTS:

1. STRUCTURE:
   - Start with the chapter heading: "${chapter.heading}"
   - Include ALL ${
     (chapter.keyPoints ?? []).length
   } subsections as ${chapterNumber}.1, ${chapterNumber}.2, etc.
   - Each subsection should be substantial (${
     (chapter.keyPoints ?? []).length > 0
       ? Math.floor(targetWordCount / (chapter.keyPoints ?? []).length)
       : targetWordCount
   }-${
    (chapter.keyPoints ?? []).length > 0
      ? Math.ceil((targetWordCount / (chapter.keyPoints ?? []).length) * 1.3)
      : targetWordCount
  } words)

2. ACADEMIC RIGOR:
   - Cite ${levelConfig.citationsPerSection} sources per major point
   - Use in-text citations in ${config.citationStyle} format (Author, Year)
   - Provide critical analysis, not just description
   - ${levelConfig.analysisStyle}

3. CONTINUITY:
   ${
     chapterNumber > 1
       ? "- Reference concepts from previous chapters where relevant"
       : "- Set the foundation for subsequent chapters"
   }
   ${
     chapterNumber < totalChapters
       ? "- Foreshadow topics that will be explored in later chapters"
       : "- Synthesize and conclude the entire document"
   }

4. CONTENT DEPTH & WORD COUNT REQUIREMENT:
   - Write ${targetWordCount} words for this chapter (±10% tolerance acceptable)
   - Target range: ${Math.floor(targetWordCount * 0.9)}-${Math.ceil(targetWordCount * 1.1)} words
   - Expand analysis and add substantive evidence-based discussion to reach target
   - Do NOT pad with fluff - add depth to your analysis
   - Each subsection should include:
     * Clear topic sentences
     * Evidence from sources with citations
     * Critical analysis and synthesis
     * Transitions to next subsection

5. FORMATTING & PRESENTATION:
   - Use proper markdown formatting for excellent readability
   - Main chapter heading: # ${chapter.heading}
   - Subsection headings: ## ${chapterNumber}.1 Subsection Title (with proper spacing)
   - Use **bold** for key terms and important concepts
   - Use *italics* for emphasis and technical terms
   - Each paragraph should be 4-6 sentences for better flow
   - Add blank lines between paragraphs for visual clarity
   - Use bullet points or numbered lists where appropriate for clarity
   - In-text citations: (Author, Year) or (Author1 & Author2, Year)
   - Ensure proper spacing:
     * Double line break after headings
     * Single line break between paragraphs
     * Proper indentation for nested content

6. WRITING STYLE:
   - Write in clear, professional academic prose
   - Vary sentence structure for better readability
   - Use topic sentences to introduce each paragraph
   - Include transitional phrases between paragraphs
   - Maintain consistent voice and tense throughout
   - Avoid overly complex sentences - aim for clarity

CRITICAL: Write ONLY this chapter (${
    chapter.heading
  }). Do not include references section - that will be added at the end of the entire document. Focus on delivering ${targetWordCount} words of high-quality, well-formatted academic writing for THIS chapter only.

Begin writing now:`;

  return prompt;
}

function getSystemMessage(academicLevel: AcademicLevel, isAbstract: boolean = false): string {
  const levelConfig = ACADEMIC_LEVEL_CONFIGS[academicLevel];

  if (isAbstract) {
    return `You are an expert academic writer specializing in ${levelConfig.label.toLowerCase()}-level research papers.

Your task is to write a concise, well-structured abstract that:
- Summarizes the research in a single cohesive paragraph
- Uses clear, professional academic language
- Follows standard abstract conventions (background, objectives, methodology, findings, conclusions)
- Does NOT include citations (abstracts are standalone summaries)
- Maintains the appropriate academic tone and depth for ${levelConfig.label.toLowerCase()}-level work

Write the abstract directly without preamble or meta-commentary. Just provide the abstract content itself.`;
  }

  return `You are an expert academic writer specializing in ${levelConfig.label.toLowerCase()}-level research papers. Your writing demonstrates:

- ${levelConfig.analysisStyle}
- Technical depth: ${levelConfig.technicalDepth}
- ${levelConfig.citationsPerSection} citations per major point
- Clear, professional academic prose
- Logical flow and strong argumentation

Write with authority and precision. Every claim should be supported by evidence from the provided sources.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateChapterRequest = await request.json();
    const {
      documentType,
      topic,
      instructions,
      sources,
      chapter,
      chapterIndex,
      totalChapters,
      previousChaptersText,
      academicLevel,
      writingStyle,
      documentTitle,
      documentApproach,
      documentTone,
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

    if (!academicLevel || !writingStyle) {
      return new Response(
        JSON.stringify({
          error:
            "Academic level and writing style are required for chapter generation",
        }),
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

    // Smart context truncation: Keep only last 3500 words of previous chapters for better consistency
    let truncatedContext = previousChaptersText || "";
    if (truncatedContext) {
      const words = truncatedContext.split(/\s+/);
      if (words.length > 3500) {
        truncatedContext =
          "...(earlier content omitted for brevity)...\n\n" +
          words.slice(-3500).join(" ");
      }
    }

    // Generate prompt
    const userPrompt = generateChapterPrompt(
      documentType,
      topic,
      instructions || "",
      chapter,
      chapterIndex,
      totalChapters,
      sourcesText,
      truncatedContext,
      academicLevel,
      writingStyle,
      documentTitle,
      documentApproach,
      documentTone
    );

    const isAbstract = chapter.heading.toLowerCase().includes("abstract");
    const systemMessage = getSystemMessage(academicLevel, isAbstract);

    // Calculate dynamic token limit based on target word count
    // Formula: 1.33 tokens/word + 20% buffer for formatting
    const targetWordCount = chapter.estimatedWordCount || 5000;
    const estimatedTokens = Math.ceil(targetWordCount * 1.33 * 1.2);

    // Cap at model limits but allow much higher than current 8000
    const maxTokenLimit = Math.min(estimatedTokens, 16000);

    console.log(`Chapter ${chapterIndex + 1}: Target ${targetWordCount} words, using ${maxTokenLimit} tokens`);

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
            maxTokenLimit
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
          console.error("Chapter generation error:", error);
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
    console.error("Chapter generation API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
