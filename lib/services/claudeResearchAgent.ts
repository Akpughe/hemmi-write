// Claude-Orchestrated Deep Research Agent
// Uses Claude's native tool use to intelligently orchestrate research

import Anthropic from "@anthropic-ai/sdk";
import {
  DeepResearchQuery,
  DeepResearchResult,
  DeepResearchPaper,
  PartialDeepResearchPaper,
  QualityReport,
  IterationResult,
  IterationStrategy,
  ResearchStatus,
  ResearchProgressUpdate,
  QUALITY_THRESHOLDS,
} from "@/lib/types/deepResearch";
import {
  DEEP_RESEARCH_TOOLS,
  executeToolCall,
  ToolName,
  calculatePaperCompleteness,
  deduplicatePapers,
} from "./deepResearchTools";

// =============================================================================
// Types
// =============================================================================

export type ProgressCallback = (update: ResearchProgressUpdate) => void;

type ConversationMessage = Anthropic.MessageParam;

// =============================================================================
// System Prompt
// =============================================================================

const RESEARCH_SYSTEM_PROMPT = `You are an expert academic research assistant. Your job is to find high-quality academic papers and ensure they have complete metadata.

## Your Tools

1. **search_papers** - Search for academic papers using Perplexity AI (your main discovery tool)
2. **enrich_missing_authors** - TOKEN-OPTIMIZED batch enrichment for papers missing authors (only sends title + URL, no abstracts)
3. **research_paper_metadata** - Use your knowledge to find missing metadata for papers (authors, year, DOI, abstract, journal, etc.)
4. **extract_identifiers** - Extract DOI/arXiv ID from URLs
5. **validate_papers** - Check paper quality and completeness scores

## Your Process (CRITICAL: Evaluation-First Flow)

1. **Discover**: Use search_papers to find papers.
2. **Evaluate Every Paper**: Use validate_papers on ALL discovered papers immediately.
3. **Identify Missing Fields**: Note which papers have completeness < 80% and what specifically is missing (authors, DOI, abstract, etc.).
4. **Systematic Enrichment**:
   - **For Missing Authors**: ALWAYS use **enrich_missing_authors** first for batches of papers.
   - **For Other Fields**: Use **research_paper_metadata** for the remaining missing fields.
5. **Re-Validate**: After enrichment, use validate_papers again.
6. **Iterate**: If you have fewer than the requested number of papers at 80% quality, perform a new search with different terms and repeat.

## Discovery Buffer Strategy

To ensure you hit the requested number of HIGH-QUALITY papers:
- **ALWAYS search for 50% more papers than requested** (e.g., if the user wants 10, search for 15-20). 
- This gives you a pool of candidates to choose from. After enrichment, the system will automatically pick the best ones.
- Never settle for exactly the number requested during the initial search.

## Smart Enrichment Strategy

Every paper retrieved from Perplexity MUST go through your enrichment flow if it is incomplete.
1. **Validation is mandatory**: You cannot know what is missing without calling validate_papers.
2. **Batch authors first**: If 2 or more papers miss authors, the batch tool is required.
3. **Individual lookup for depth**: Use research_paper_metadata to fill in abstracts, years, and DOIs.

## Critical Rules

1. **NEVER stop until you have found the requested number of papers (maxPapers) AND quality >= 80%**.
2. **A "PAPER" IS NOT VALID WITHOUT A URL**. If search_papers returns results without links, refine your query to find papers with valid links.
3. **NEVER provide a final response until you have attempted to enrich every paper you found**.
4. **ALWAYS check for missing authors first** - this is the most common gap.
5. **DO NOT settle for 8 papers if the user asked for 10**. If one search fails to yield enough valid links, refine your query and search again.
6. **DEDUP IS HANDLED AUTOMATICALLY**. Do not worry about duplicate titles; the system merges them if they match.

## Output

Only after reaching your targets, summarize:
- Papers found and their completeness levels
- Key themes discovered
- Any gaps you noticed in the academic literature

Be thorough. Prioritize systematic evaluation of every single source found.`;

// =============================================================================
// Claude Research Agent
// =============================================================================

export class ClaudeResearchAgent {
  private client: Anthropic;
  private progressCallback?: ProgressCallback;
  private model: string;

  constructor(options?: {
    progressCallback?: ProgressCallback;
    model?: string;
  }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }

    this.client = new Anthropic({ apiKey });
    this.progressCallback = options?.progressCallback;
    this.model = options?.model || "claude-haiku-4-5-20251001";
  }

  /**
   * Send progress update
   */
  private sendProgress(update: Partial<ResearchProgressUpdate>): void {
    if (this.progressCallback) {
      this.progressCallback({
        type: "progress",
        timestamp: new Date().toISOString(),
        ...update,
      } as ResearchProgressUpdate);
    }
  }

  /**
   * Convert our tool definitions to Anthropic format
   */
  private getAnthropicTools(): Anthropic.Tool[] {
    return DEEP_RESEARCH_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema as Anthropic.Tool["input_schema"],
    }));
  }

  /**
   * Execute research with Claude orchestration
   */
  async execute(query: DeepResearchQuery): Promise<DeepResearchResult> {
    const startTime = Date.now();
    let allPapers: PartialDeepResearchPaper[] = [];
    let currentQuality = 0;
    let iterationCount = 0;

    const maxIterations = query.maxIterations || 3;
    const targetCompleteness =
      query.targetCompleteness || QUALITY_THRESHOLDS.stopIfAbove;
    const maxPapers = query.maxPapers || 20;

    this.sendProgress({
      stage: ResearchStatus.SEARCHING,
      message: "Starting Claude-orchestrated research...",
      currentIteration: 0,
      maxIterations,
      targetQuality: targetCompleteness,
    });

    // Build the initial user message
    const userMessage = this.buildUserMessage(query);

    // Conversation history for multi-turn
    const messages: ConversationMessage[] = [
      { role: "user", content: userMessage },
    ];

    try {
      // Main conversation loop with Claude
      let continueConversation = true;
      let lastAssistantContent: Anthropic.ContentBlock[] = [];

      while (continueConversation && iterationCount < maxIterations * 2) {
        iterationCount++;

        this.sendProgress({
          stage: ResearchStatus.ANALYZING,
          message: `Claude thinking... (turn ${iterationCount})`,
          currentIteration: Math.ceil(iterationCount / 2),
          maxIterations,
          papersFound: allPapers.length,
          currentQuality,
        });

        // Call Claude
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 4096,
          system: RESEARCH_SYSTEM_PROMPT,
          tools: this.getAnthropicTools(),
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        lastAssistantContent = response.content;

        // Check if Claude wants to use tools
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
        );

        if (toolUseBlocks.length > 0) {
          // Execute tools and collect results
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const toolUse of toolUseBlocks) {
            this.sendProgress({
              stage: this.getStageFromTool(toolUse.name),
              message: `Executing ${toolUse.name}...`,
              papersFound: allPapers.length,
            });

            console.log(`[Claude Agent] Executing tool: ${toolUse.name}`);

            const result = await executeToolCall(
              toolUse.name as ToolName,
              toolUse.input as Record<string, unknown>,
            );

            // Track papers from search results
            if (
              toolUse.name === "search_papers" &&
              result.success &&
              result.data
            ) {
              const searchData = result.data as {
                papers: PartialDeepResearchPaper[];
              };
              if (searchData.papers) {
                allPapers = deduplicatePapers([
                  ...allPapers,
                  ...searchData.papers,
                ]);
                this.sendProgress({
                  stage: ResearchStatus.SEARCHING,
                  message: `Found ${searchData.papers.length} papers (${allPapers.length} total)`,
                  papersFound: allPapers.length,
                });
              }
            }

            // Track author enrichment results
            if (
              toolUse.name === "enrich_missing_authors" &&
              result.success &&
              result.data
            ) {
              const enrichData = result.data as {
                papers?: PartialDeepResearchPaper[];
                enrichedCount?: number;
                totalNeeded?: number;
              };

              // CRITICAL: Merge enriched papers back into allPapers
              if (enrichData.papers) {
                allPapers = deduplicatePapers([
                  ...allPapers,
                  ...enrichData.papers,
                ]);
                console.log(
                  `[Claude Agent] Merged ${enrichData.papers.length} enriched papers into allPapers`,
                );
              }

              this.sendProgress({
                stage: ResearchStatus.ENRICHING,
                message: `Enriched authors: ${enrichData.enrichedCount || 0}/${enrichData.totalNeeded || 0} papers`,
                papersEnriched: allPapers.filter((p) => p.enrichedFrom?.length)
                  .length,
              });
            }

            // Track research/enrichment results
            if (
              toolUse.name === "research_paper_metadata" &&
              result.success &&
              result.data
            ) {
              const researchData = result.data as Record<string, unknown> & {
                fieldsFound?: string[];
              };

              // Get original title/URL from tool use input
              const toolInput = toolUse.input as {
                title: string;
                url?: string;
              };

              allPapers = deduplicatePapers([
                ...allPapers,
                {
                  id: `res-${Math.random().toString(36).substring(2, 9)}`,
                  title: toolInput.title,
                  url: toolInput.url || "",
                  ...researchData,
                  lastEnrichedAt: new Date().toISOString(),
                  enrichedFrom: ["claude:research"],
                } as PartialDeepResearchPaper,
              ]);

              this.sendProgress({
                stage: ResearchStatus.ENRICHING,
                message: `Researched paper metadata: found ${researchData.fieldsFound?.join(", ") || "fields"}`,
                papersEnriched: allPapers.filter((p) => p.enrichedFrom?.length)
                  .length,
              });
            }

            // Track validation results
            if (
              toolUse.name === "validate_papers" &&
              result.success &&
              result.data
            ) {
              const validationData = result.data as {
                qualityReport: QualityReport;
                paperResults?: {
                  id: string;
                  title: string;
                  url: string;
                  completenessScore: number;
                  missingFields: string[];
                }[];
              };

              // Merge any updated completeness scores if returned
              if (validationData.paperResults) {
                const updatedPapers: PartialDeepResearchPaper[] =
                  validationData.paperResults.map((res) => ({
                    id: res.id,
                    title: res.title,
                    url: res.url || "", // Need URL for PartialDeepResearchPaper
                    completenessScore: res.completenessScore,
                    missingFields: res.missingFields,
                  }));
                allPapers = deduplicatePapers([...allPapers, ...updatedPapers]);
              }

              if (validationData.qualityReport) {
                currentQuality =
                  validationData.qualityReport.averageCompleteness;
                this.sendProgress({
                  stage: ResearchStatus.VALIDATING,
                  message: `Quality: ${(currentQuality * 100).toFixed(1)}%`,
                  currentQuality,
                  targetQuality: targetCompleteness,
                });
              }
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: JSON.stringify(result),
            });
          }

          // Add assistant message with tool uses
          messages.push({
            role: "assistant",
            content: response.content,
          });

          // Add tool results as user message
          messages.push({
            role: "user",
            content: toolResults,
          });
        } else {
          // Claude is done with tools, has final response
          continueConversation = false;

          // Add final assistant message
          messages.push({
            role: "assistant",
            content: response.content,
          });
        }

        // Check stop conditions
        if (response.stop_reason === "end_turn" && toolUseBlocks.length === 0) {
          continueConversation = false;
        }

        // Safety check - if we have enough quality papers, we can stop
        if (
          currentQuality >= targetCompleteness &&
          allPapers.length >= maxPapers
        ) {
          console.log(
            `[Claude Agent] Thresholds met (Quality: ${(currentQuality * 100).toFixed(1)}%, Count: ${allPapers.length}/${maxPapers}). Stopping early.`,
          );
          continueConversation = false;
        }
      }

      // Extract Claude's final text response
      const finalTextBlock = lastAssistantContent.find(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );

      // Calculate final completeness for all papers and sort them
      const evaluatedPapers = allPapers.map((paper) => {
        const { score, missingFields } = calculatePaperCompleteness(paper);
        return {
          ...paper,
          completenessScore: score,
          missingFields,
        };
      });

      // Sort by completeness (desc) and take only maxPapers
      const finalPapers = evaluatedPapers
        .sort((a, b) => (b.completenessScore || 0) - (a.completenessScore || 0))
        .slice(0, maxPapers);

      // Build quality report
      const qualityReport = this.buildQualityReport(finalPapers);
      currentQuality = qualityReport.averageCompleteness;

      const endTime = Date.now();

      // Build result
      const result: DeepResearchResult = {
        status: ResearchStatus.COMPLETE,
        success: true,
        originalQuery: query.query,
        effectiveQueries: [query.query], // Claude handles query expansion internally
        papers: finalPapers as DeepResearchPaper[],
        totalFound: allPapers.length,
        totalReturned: finalPapers.length,
        qualityReport,
        meetsQualityThreshold: currentQuality >= targetCompleteness,
        iterations: [
          {
            iteration: 1,
            strategy: IterationStrategy.STANDARD,
            query: query.query,
            papersFound: allPapers.length,
            papersEnriched: finalPapers.filter((p) => p.enrichedFrom?.length)
              .length,
            newPapersAdded: allPapers.length,
            qualityBefore: 0,
            qualityAfter: currentQuality,
            qualityImprovement: currentQuality,
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date(endTime).toISOString(),
            durationMs: endTime - startTime,
            shouldContinue: false,
            stopReason:
              currentQuality >= targetCompleteness
                ? "quality_met"
                : iterationCount >= maxIterations * 2
                  ? "max_iterations"
                  : "no_improvement",
          },
        ],
        totalIterations: 1,
        finalStrategy: IterationStrategy.STANDARD,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        totalDurationMs: endTime - startTime,
      };

      this.sendProgress({
        type: "result",
        timestamp: new Date().toISOString(),
        stage: ResearchStatus.COMPLETE,
        message: finalTextBlock?.text || "Research complete",
        papersFound: finalPapers.length,
        currentQuality,
        result,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Claude Agent] Error:", error);

      this.sendProgress({
        type: "error",
        timestamp: new Date().toISOString(),
        error: {
          code: "CLAUDE_ERROR",
          message: errorMessage,
          retryable: true,
        },
      });

      return {
        status: ResearchStatus.FAILED,
        success: false,
        originalQuery: query.query,
        effectiveQueries: [query.query],
        papers: [],
        totalFound: 0,
        totalReturned: 0,
        qualityReport: this.buildQualityReport([]),
        meetsQualityThreshold: false,
        iterations: [],
        totalIterations: 0,
        finalStrategy: IterationStrategy.STANDARD,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        totalDurationMs: Date.now() - startTime,
        errors: [
          {
            stage: "claude_orchestration",
            message: errorMessage,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }
  }

  /**
   * Build user message from query
   */
  private buildUserMessage(query: DeepResearchQuery): string {
    let message = `Please research: "${query.query}"

Requirements:
- Find up to ${query.maxPapers || 20} high-quality academic papers
- Target quality: ${((query.targetCompleteness || 0.8) * 100).toFixed(0)}% completeness
`;

    if (query.yearRange?.start || query.yearRange?.end) {
      message += `- Year range: ${query.yearRange.start || "any"} to ${query.yearRange.end || "present"}\n`;
    }

    if (query.requireDOI) {
      message += `- MUST have DOI for all papers\n`;
    }

    if (query.requireAbstract) {
      message += `- MUST have abstract for all papers\n`;
    }

    if (query.preferOpenAccess) {
      message += `- Prefer open access papers when available\n`;
    }

    if (query.publicationTypes?.length) {
      message += `- Publication types: ${query.publicationTypes.join(", ")}\n`;
    }

    message += `
CRITICAL WORKFLOW - Follow these steps in order:
1. Use search_papers to find papers on this topic.
2. Use validate_papers immediately to evaluate what is missing for EVERY paper found.
3. If paper count is less than ${query.maxPapers || 20}, search again with a different query.
4. For papers missing authors, use enrich_missing_authors.
5. For other missing fields identified by validate_papers, use research_paper_metadata.
6. Re-validate until average quality >= ${((query.targetCompleteness || 0.8) * 100).toFixed(0)}% and you have enough papers.
7. Only then provide your final summary.

IMPORTANT: DO NOT summarize until you have the requested number of papers AND quality >= ${((query.targetCompleteness || 0.8) * 100).toFixed(0)}%. Keep searching and enriching.

Start by calling search_papers.`;

    return message;
  }

  /**
   * Get research stage from tool name
   */
  private getStageFromTool(toolName: string): ResearchStatus {
    switch (toolName) {
      case "search_papers":
        return ResearchStatus.SEARCHING;
      case "enrich_missing_authors":
      case "research_paper_metadata":
      case "extract_identifiers":
        return ResearchStatus.ENRICHING;
      case "validate_papers":
        return ResearchStatus.VALIDATING;
      case "generate_insights":
        return ResearchStatus.ANALYZING;
      default:
        return ResearchStatus.ANALYZING;
    }
  }

  /**
   * Build quality report from papers
   */
  private buildQualityReport(
    papers: PartialDeepResearchPaper[],
  ): QualityReport {
    if (papers.length === 0) {
      return {
        totalPapers: 0,
        averageCompleteness: 0,
        averageRelevance: 0,
        fieldCompleteness: [],
        papersWithDOI: 0,
        papersWithAbstract: 0,
        papersWithAuthors: 0,
        papersWithYear: 0,
        papersWithJournal: 0,
        papersWithCitations: 0,
        papersWithOpenAccess: 0,
        papersWithHighlights: 0,
        highQualityPapers: 0,
        mediumQualityPapers: 0,
        lowQualityPapers: 0,
        improvementSuggestions: [],
      };
    }

    const totalCompleteness = papers.reduce(
      (sum, p) => sum + (p.completenessScore || 0),
      0,
    );

    return {
      totalPapers: papers.length,
      averageCompleteness: totalCompleteness / papers.length,
      averageRelevance:
        papers.reduce((sum, p) => sum + (p.relevanceScore || 0), 0) /
        papers.length,
      fieldCompleteness: [],
      papersWithDOI: papers.filter((p) => p.doi).length,
      papersWithAbstract: papers.filter((p) => p.abstract).length,
      papersWithAuthors: papers.filter((p) => p.authors).length,
      papersWithYear: papers.filter((p) => p.year || p.publishedDate).length,
      papersWithJournal: papers.filter((p) => p.journalName).length,
      papersWithCitations: papers.filter((p) => p.citationCount !== undefined)
        .length,
      papersWithOpenAccess: papers.filter((p) => p.openAccessUrl).length,
      papersWithHighlights: papers.filter((p) => p.highlights?.length).length,
      highQualityPapers: papers.filter(
        (p) => (p.completenessScore || 0) >= 0.85,
      ).length,
      mediumQualityPapers: papers.filter((p) => {
        const score = p.completenessScore || 0;
        return score >= 0.7 && score < 0.85;
      }).length,
      lowQualityPapers: papers.filter((p) => (p.completenessScore || 0) < 0.7)
        .length,
      improvementSuggestions: [],
    };
  }
}

// =============================================================================
// Convenience Function
// =============================================================================

/**
 * Execute deep research with Claude orchestration
 */
export async function executeClaudeResearch(
  query: DeepResearchQuery,
  progressCallback?: ProgressCallback,
): Promise<DeepResearchResult> {
  const agent = new ClaudeResearchAgent({ progressCallback });
  return agent.execute(query);
}
