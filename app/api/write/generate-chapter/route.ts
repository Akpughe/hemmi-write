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
import { aiService, AIService } from "@/lib/services/aiService";
import { AIProvider, DEFAULT_AI_PROVIDER } from "@/lib/config/aiModels";
import { perplexityService } from "@/lib/services/perplexityService";
import { savePerplexityCitations } from "@/lib/utils/perplexityCitationSaver";
import { requireAuth, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { checkTokenBalance, deductTokens, estimateChapterTokens, MIN_TOKENS } from "@/lib/middleware/tokenMiddleware";
import { tokenService } from "@/lib/services/tokenService";

/**
 * Clean em-dashes from text to avoid AI detection fingerprints
 * Replaces em-dashes with appropriate alternatives
 */
function cleanEmDashes(text: string): string {
  // Replace em-dashes (—, --, etc.) with commas for most cases
  return text
    .replace(/\s*—\s*/g, ", ") // Em-dash with spaces
    .replace(/\s*--\s*/g, ", ") // Double hyphen with spaces
    .replace(/—/g, ", ") // Any remaining em-dashes
    .replace(/,\s*,/g, ","); // Clean up double commas
}

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
  projectId?: string; // Add projectId to save Perplexity citations
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
  documentTone: string,
  perplexityContent?: string,
  argumentSummaries?: any[],
  sectionMapping?: any,
  sourceAnalysis?: any
): string {
  const config = DOCUMENT_TYPE_CONFIGS[documentType];
  const levelConfig = ACADEMIC_LEVEL_CONFIGS[academicLevel];
  const styleConfig = WRITING_STYLE_CONFIGS[writingStyle];

  const isAbstract = chapter.heading.toLowerCase().includes("abstract");
  const chapterNumber = isAbstract ? 0 : chapterIndex;
  const targetWordCount = chapter.estimatedWordCount || 5000;

  if (isAbstract) {
    let prompt = `You are writing the Abstract for a ${levelConfig.label.toLowerCase()} ${config.label.toLowerCase()}.

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

Write the abstract as a SINGLE cohesive paragraph with proper flow between elements.

FORMATTING REQUIREMENTS:
- Output in clean HTML format (NOT markdown)
- Start with heading: <h1>Abstract</h1>
- Write the abstract as a SINGLE <p> tag containing ONE cohesive paragraph
- Do NOT use subsection headings
- Do NOT include citations in the abstract
- Do NOT use markdown syntax (no #, *, **, etc.)
- Use <strong>text</strong> for emphasis if needed

IMPORTANT: Write the abstract NOW. Do not ask questions or provide options.
Output ONLY the HTML content for the abstract. Begin:`;
    return prompt;
  }

  // === NON-ABSTRACT CHAPTER PROMPT ===

  // Build sources section: use pre-analyzed sources when available, fall back to raw sourcesText
  let sourcesSection = "";
  if (sectionMapping?.relevantSourceIds && sourceAnalysis?.analyzedSources) {
    const analyzedSources = sourceAnalysis.analyzedSources as any[];
    const relevantSources = analyzedSources.filter((s: any) =>
      sectionMapping.relevantSourceIds.includes(s.sourceId)
    );
    if (relevantSources.length > 0) {
      sourcesSection = relevantSources
        .map(
          (s: any) =>
            `[${s.author || "Unknown"}] "${s.title}"\n  Key findings: ${
              s.keyFindings?.join("; ") || s.excerpt || "N/A"
            }\n  Relevance: ${s.relevanceToSection || "general"}`
        )
        .join("\n\n");
    } else {
      sourcesSection = sourcesText;
    }
  } else {
    sourcesSection = sourcesText;
  }

  // Build argument thread
  const argumentThread = `
ARGUMENT THREAD:
- Paper's central argument: ${sourceAnalysis?.suggestedCentralArgument || documentApproach}
- Previous chapters established: ${
    argumentSummaries && argumentSummaries.length > 0
      ? argumentSummaries
          .map(
            (s: any) =>
              `${s.chapter_heading}: ${s.thesis_advanced}`
          )
          .join("\n  ")
      : "This is the first chapter."
  }
- THIS chapter's thesis: ${
    sectionMapping?.sectionThesis ||
    `Advance the argument through ${chapter.heading}`
  }
- This chapter's argumentative role: ${
    sectionMapping?.argumentRole || "builds_evidence"
  }
- Next chapter will address: ${
    chapterIndex < totalChapters - 2
      ? "subsequent developments"
      : "synthesis and conclusions"
  }`;

  // Build previous chapters context
  let previousContext = "";
  if (argumentSummaries && argumentSummaries.length > 0) {
    previousContext = `\nPREVIOUS CHAPTERS (argument continuity):
${argumentSummaries
  .map(
    (s: any) =>
      `- ${s.chapter_heading}: ${s.thesis_advanced} (Evidence: ${
        Array.isArray(s.key_evidence)
          ? s.key_evidence.join("; ")
          : s.key_evidence || "N/A"
      })`
  )
  .join("\n")}

Build upon these established points. Do not repeat what was already covered.
`;
  } else if (previousChaptersText && previousChaptersText.trim()) {
    previousContext = `\nPREVIOUS CHAPTERS CONTEXT (for continuity and avoiding repetition):
${previousChaptersText}

IMPORTANT: Reference and build upon concepts from previous chapters where appropriate. Avoid repeating information already covered.
`;
  }

  let prompt = `You are writing Chapter ${chapterNumber} of ${
    totalChapters - 1
  } for a ${levelConfig.label.toLowerCase()} ${config.label.toLowerCase()}.

DOCUMENT CONTEXT:
Title: "${documentTitle}"
Topic: "${topic}"
Overall Approach: ${documentApproach}
Writing Tone: ${documentTone}
${instructions ? `Additional Instructions: ${instructions}` : ""}
${argumentThread}

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
  .map((point: string, idx: number) => `${chapterNumber}.${idx + 1}. ${point}`)
  .join("\n")}

TARGET WORD COUNT: ${targetWordCount} words (range: ${Math.floor(
    targetWordCount * 0.95
  )}-${Math.ceil(targetWordCount * 1.15)} words)

AVAILABLE SOURCES:
${sourcesSection}

${
  perplexityContent
    ? `ADDITIONAL FACTUAL INFORMATION (with inline citations):
${perplexityContent}

Use the information above to enrich your content. The citations [1], [2], etc. in the factual information refer to authoritative sources - integrate this information naturally into your writing.`
    : ""
}
${previousContext}
SYNTHESIS INSTRUCTIONS (CRITICAL):
- Organize by THEMES that cut across sources, not source-by-source
- Each paragraph must draw from at least 2 sources
- Introduce sources with signal phrases: "According to Smith's (2023) longitudinal study..." NOT "(Smith, 2023)"
- After presenting evidence, ANALYZE it: What does this mean? Why does it matter for your thesis?
- Address contradictions between sources — do not ignore disagreements
- Connect each major point back to the chapter thesis

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
      ? Math.ceil(
          (targetWordCount / (chapter.keyPoints ?? []).length) * 1.3
        )
      : targetWordCount
  } words)

2. ACADEMIC RIGOR:
   - Cite ${levelConfig.citationsPerSection} sources per major point
   - Use in-text citations in ${config.citationStyle} format (Author, Year)
   - Integrate information from BOTH the original research sources AND the additional factual information naturally
   - Provide critical analysis, not just description
   - ${levelConfig.analysisStyle}

3. CONTINUITY:
   ${
     chapterNumber > 1
       ? "- Reference concepts from previous chapters where relevant"
       : "- Set the foundation for subsequent chapters"
   }
   ${
     chapterNumber < totalChapters - 1
       ? "- Foreshadow topics that will be explored in later chapters"
       : "- Synthesize and conclude the entire document"
   }

4. WORD COUNT: Write at least ${targetWordCount} words. Do NOT stop early. Write ALL subsections completely.
   Each subsection MUST include: clear topic sentences, evidence with citations, critical analysis, and smooth transitions.

5. FORMATTING (CRITICAL - USE HTML NOT MARKDOWN):
   - Output in clean HTML format (NOT markdown)
   - Main chapter heading: <h1>${chapter.heading}</h1>
   - Subsection headings: <h2>${chapterNumber}.1 Subsection Title</h2>
   - Use <strong>text</strong> for key terms (NOT **text**)
   - Use <em>text</em> for emphasis (NOT *text*)
   - Wrap each paragraph in <p> tags (4-6 sentences each)
   - Use <ul><li> or <ol><li> for lists (NOT dashes or asterisks)
   - In-text citations: (Author, Year) or (Author1 & Author2, Year)
   - Ensure properly closed tags, no markdown syntax

CRITICAL: Write ONLY this chapter (${
    chapter.heading
  }). Do not include references section. Focus on delivering ${targetWordCount} words of high-quality, well-formatted academic writing in HTML format for THIS chapter only.

Begin writing now in HTML format:`;

  return prompt;
}

function getSystemMessage(
  academicLevel: AcademicLevel,
  isAbstract: boolean = false
): string {
  const levelConfig = ACADEMIC_LEVEL_CONFIGS[academicLevel];

  if (isAbstract) {
    return `You are an expert academic writer specializing in ${levelConfig.label.toLowerCase()}-level research papers.
Write a concise, well-structured abstract as a single cohesive paragraph.
Follow standard abstract conventions (background, objectives, methodology, findings, conclusions).
Do NOT include citations in the abstract. Write directly without preamble.`;
  }

  return `You are an expert academic writer. Your writing demonstrates:
- ${levelConfig.analysisStyle}
- Technical depth: ${levelConfig.technicalDepth}
- ${levelConfig.citationsPerSection} citations per major point
- Natural sentence variation (mix short, medium, long)
- Active voice (70-80%)
- Specific data points and examples over vague claims
- No em-dashes — use commas, parentheses, or colons
- None of these words: "Furthermore", "Moreover", "delve", "landscape", "tapestry", "multifaceted", "myriad", "plethora"
- No 3+ AI-flagged phrases per paragraph

Write with authority. Every claim must be supported by evidence.`;
}

export async function POST(request: NextRequest) {
  try {
    // AUTHENTICATE USER
    const user = await requireAuth();

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
      projectId,
    } = body;

    // Get user plan for provider restriction
    const balance = await tokenService.getUserTokenBalance(user.id);
    const planType = balance.subscription?.planType || 'free';

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

    // ESTIMATE TOKEN USAGE
    const chapterWordCount = chapter.estimatedWordCount || 5000;
    const estimatedTokens = estimateChapterTokens({
      targetWordCount: chapterWordCount,
      sourceCount: sources.length,
      hasContext: !!previousChaptersText && previousChaptersText.trim().length > 0,
    });

    console.log(`[Generate Chapter ${chapterIndex + 1}] Estimated tokens: ${estimatedTokens}`);

    // CHECK TOKEN BALANCE (minimum required to start, not full estimate)
    const tokenCheckError = await checkTokenBalance(user.id, estimatedTokens, MIN_TOKENS.CHAPTER);
    if (tokenCheckError) {
      console.log(`[Generate Chapter ${chapterIndex + 1}] ❌ BLOCKED - Below minimum tokens (${MIN_TOKENS.CHAPTER})`);
      return tokenCheckError;
    }

    console.log(`[Generate Chapter ${chapterIndex + 1}] ✅ Token check passed`);

    // Determine AI provider (restricted by plan)
    const provider = AIService.getEffectiveProvider(
      (aiProvider as AIProvider) || DEFAULT_AI_PROVIDER,
      planType
    );

    // Calculate word budget for chapter sources
    const sourceWordBudget = Math.floor(chapterWordCount * 0.25);

    // Fetch argument summaries, section mapping, and source analysis
    let argumentSummaries: any[] = [];
    let sectionMapping: any = null;
    let sourceAnalysisData: any = null;

    if (projectId) {
      const supabase = await createServiceRoleSupabaseClient();

      const { data: summaries } = await (supabase as any)
        .from('chapter_argument_summaries')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (summaries) argumentSummaries = summaries;

      const { data: mappingData } = await (supabase as any)
        .from('section_source_mappings')
        .select('mappings')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (mappingData?.mappings) {
        const allMappings = Array.isArray(mappingData.mappings) ? mappingData.mappings : [];
        sectionMapping = allMappings.find((m: any) => m.sectionHeading === chapter.heading);
      }

      const { data: analysisData } = await (supabase as any)
        .from('source_analysis')
        .select('analysis')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (analysisData) sourceAnalysisData = analysisData.analysis;
    }

    // Step 1: Call Perplexity to get factual information about this chapter
    const isAbstract = chapter.heading.toLowerCase().includes("abstract");
    let perplexityContent = "";

    if (!isAbstract && perplexityService.isAvailable()) {
      console.log(
        `[Generate Chapter ${
          chapterIndex + 1
        }] Fetching factual data from Perplexity for: "${chapter.heading}"`
      );

      const perplexityQuery = sectionMapping
        ? `Find recent empirical evidence about "${sectionMapping.sectionThesis}".
Focus on: ${(chapter.keyPoints ?? []).map((kp: string, i: number) => `${i + 1}. ${kp}`).join('\n')}
Specifically look for: data, statistics, case studies, and research findings from the last 3 years.
Do NOT provide general background — focus on specific evidence and data points.`
        : `Provide comprehensive factual information about "${chapter.heading}" in the context of ${topic}. Focus on these key points:
${(chapter.keyPoints ?? []).map((kp: string, i: number) => `${i + 1}. ${kp}`).join("\n")}

Include relevant data, statistics, examples, and authoritative information with citations.`;

      const perplexityResponse = await perplexityService.chatCompletion(
        perplexityQuery
      );

      if (perplexityResponse.content) {
        // Clean em-dashes from Perplexity content before using it
        perplexityContent = cleanEmDashes(perplexityResponse.content);
        console.log(
          `[Generate Chapter ${chapterIndex + 1}] Perplexity returned ${
            perplexityContent.length
          } chars with ${
            perplexityResponse.citations.length
          } citations (em-dashes cleaned)`
        );

        // Save Perplexity citations to research sources if projectId is provided
        if (projectId && perplexityResponse.citations.length > 0) {
          console.log(
            `[Generate Chapter ${chapterIndex + 1}] Saving ${
              perplexityResponse.citations.length
            } Perplexity citations to research sources`
          );
          const savedCitations = await savePerplexityCitations({
            projectId,
            citations: perplexityResponse.citations,
            chapterName: chapter.heading,
            perplexityContent: perplexityContent,
          });
          console.log(
            `[Generate Chapter ${chapterIndex + 1}] Saved ${
              savedCitations.length
            } citations (${
              perplexityResponse.citations.length - savedCitations.length
            } were duplicates)`
          );
        }
      }
    } else if (!isAbstract) {
      console.log(
        `[Generate Chapter ${
          chapterIndex + 1
        }] Perplexity not available, using only original sources`
      );
    }

    // Format sources - use fullContent if available in sources
    const sourcesText = formatSourcesForPrompt(
      sources.map((s: any) => ({
        title: s.title,
        excerpt: s.excerpt,
        fullContent: s.fullContent || s.full_content, // Support both naming conventions
        author: s.author,
        wordCount: s.wordCount || s.content_word_count,
      })),
      {
        preferFullContent: true,
        maxWordsPerSource: Math.min(400, Math.floor(sourceWordBudget / 5)),
      }
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
      documentTone,
      perplexityContent || undefined,
      argumentSummaries,
      sectionMapping,
      sourceAnalysisData
    );

    const systemMessage = getSystemMessage(academicLevel, isAbstract);

    // Calculate dynamic token limit based on target word count
    // Formula: 1.33 tokens/word + 20% buffer for formatting
    const targetWordCount = chapter.estimatedWordCount || 5000;
    console.log("targetWordCount", targetWordCount);

    // Cap at model limits but allow much higher than current 8000
    // const maxTokenLimit = Math.min(estimatedTokens, 16000);
    const maxTokenLimit = 16000;

    console.log(
      `[Generate Chapter ${
        chapterIndex + 1
      }] ========================================`
    );
    console.log(
      `[Generate Chapter ${
        chapterIndex + 1
      }] Target: ${targetWordCount} words (~${estimatedTokens} tokens)`
    );
    console.log(
      `[Generate Chapter ${chapterIndex + 1}] Token limit: ${maxTokenLimit}`
    );
    console.log(`[Generate Chapter ${chapterIndex + 1}] Provider: ${provider}`);
    console.log(
      `[Generate Chapter ${chapterIndex + 1}] Chapter: ${chapter.heading}`
    );

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let totalWords = 0;
          let contentBuffer = "";
          let totalTokensUsed = 0;

          // Single generation per chapter (stable approach)
          console.log(
            `[Generate Chapter ${
              chapterIndex + 1
            }] Starting single-generation mode`
          );
          console.log(
            `[Generate Chapter ${
              chapterIndex + 1
            }] Target: ${targetWordCount} words, Token limit: ${maxTokenLimit}`
          );

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
              // Capture actual tokens used
              totalTokensUsed = chunk.tokensUsed ?? 0;

              // Check for truncation
              if (chunk.truncated) {
                console.error(
                  `[Generate Chapter ${
                    chapterIndex + 1
                  }] ⚠️  TRUNCATION DETECTED!`
                );
                console.error(
                  `[Generate Chapter ${chapterIndex + 1}] Finish reason: ${
                    chunk.finishReason
                  }`
                );
                console.error(
                  `[Generate Chapter ${chapterIndex + 1}] Tokens used: ${
                    chunk.tokensUsed
                  }/${maxTokenLimit}`
                );
                console.error(
                  `[Generate Chapter ${
                    chapterIndex + 1
                  }] Words generated: ${totalWords}/${targetWordCount}`
                );

                // Send warning to frontend
                const warningMessage = `data: ${JSON.stringify({
                  warning: {
                    type: "truncation",
                    message: `Chapter was truncated. Generated ${totalWords} words out of ${targetWordCount} target.`,
                    finishReason: chunk.finishReason,
                    tokensUsed: chunk.tokensUsed,
                    tokensRequested: maxTokenLimit,
                  },
                })}\n\n`;
                controller.enqueue(encoder.encode(warningMessage));
              } else {
                console.log(
                  `[Generate Chapter ${
                    chapterIndex + 1
                  }] ✓ Completed successfully`
                );
                console.log(
                  `[Generate Chapter ${chapterIndex + 1}] Finish reason: ${
                    chunk.finishReason
                  }`
                );
                console.log(
                  `[Generate Chapter ${chapterIndex + 1}] Tokens used: ${
                    chunk.tokensUsed
                  }/${maxTokenLimit}`
                );
                console.log(
                  `[Generate Chapter ${
                    chapterIndex + 1
                  }] Words generated: ${totalWords}`
                );
              }

              // DEDUCT TOKENS after successful generation
              const deductSuccess = await deductTokens(user.id, totalTokensUsed, 'chapter', {
                projectId,
                chapterName: chapter.heading,
                wordCount: totalWords,
                chapterIndex,
                estimatedTokens,
                actualTokens: totalTokensUsed,
              });

              if (!deductSuccess) {
                console.error(`[Generate Chapter ${chapterIndex + 1}] ⚠️  Failed to deduct tokens (${totalTokensUsed}), but content was generated`);
              } else {
                console.log(`[Generate Chapter ${chapterIndex + 1}] ✅ Deducted ${totalTokensUsed} tokens`);
              }

              // Post-generation argument summary extraction
              if (projectId && !isAbstract && contentBuffer.length > 100) {
                try {
                  const summaryProvider = AIService.getEffectiveProvider(AIProvider.OPENAI, planType);
                  const summaryResponse = await aiService.getChatCompletion(
                    summaryProvider,
                    [
                      { role: 'system', content: 'Extract a brief argument summary. Return only valid JSON.' },
                      { role: 'user', content: `Summarize what this chapter established:
1. The thesis it advanced (one sentence)
2. Key evidence presented with author citations (2-3 items)
3. How it connects to what comes next (one sentence)

Chapter: ${chapter.heading}
Content: ${contentBuffer.substring(0, 8000)}

Return JSON: { "thesisAdvanced": "...", "keyEvidence": ["...", "..."], "connectionToNext": "..." }` },
                    ],
                    0.2,
                    500
                  );

                  const summaryJson = summaryResponse.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
                  const summary = JSON.parse(summaryJson);

                  const dbSupabase = await createServiceRoleSupabaseClient();
                  await (dbSupabase as any).from('chapter_argument_summaries').insert({
                    project_id: projectId,
                    section_id: (chapter as any).id || crypto.randomUUID(),
                    chapter_heading: chapter.heading,
                    thesis_advanced: summary.thesisAdvanced,
                    key_evidence: summary.keyEvidence,
                    connection_to_next: summary.connectionToNext || '',
                  });

                  await deductTokens(user.id, 1500, 'argument_summary', { projectId, chapterName: chapter.heading });
                  console.log(`[Generate Chapter ${chapterIndex + 1}] Argument summary saved`);
                } catch (summaryError) {
                  console.error(`[Generate Chapter ${chapterIndex + 1}] Argument summary failed (non-fatal):`, summaryError);
                }
              }

              // Quality monitoring
              if (contentBuffer.length > 100) {
                const { countEmDashes, checkForBannedPhrases, detectChatGPTFingerprint } = await import('@/lib/config/humanization');
                const emDashCount = countEmDashes(contentBuffer);
                const bannedPhrases = checkForBannedPhrases(contentBuffer);
                const fingerprint = detectChatGPTFingerprint(contentBuffer);
                const citationCount = (contentBuffer.match(/\([A-Z][a-z]+(?:\s*(?:&|and)\s*[A-Z][a-z]+)*,\s*\d{4}\)/g) || []).length;

                console.log(`[Quality Monitor] Chapter ${chapterIndex + 1}:`,
                  `Words: ${totalWords}/${targetWordCount},`,
                  `Em-dashes: ${emDashCount},`,
                  `Banned phrases: ${bannedPhrases.length},`,
                  `ChatGPT fingerprint: ${fingerprint.hasFingerprint ? 'YES' : 'no'},`,
                  `Citations: ${citationCount}`
                );
              }

              const doneMessage = `data: ${JSON.stringify({ done: true })}\n\n`;
              controller.enqueue(encoder.encode(doneMessage));
            } else if (chunk.content) {
              // Track word count
              contentBuffer += chunk.content;
              totalWords = contentBuffer
                .split(/\s+/)
                .filter((w) => w.length > 0).length;

              const sseData = `data: ${JSON.stringify({
                content: chunk.content,
              })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
          }

          controller.close();
        } catch (error: any) {
          console.error(`[Generate Chapter ${chapterIndex + 1}] ERROR:`, error);
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
