// Deep Research Agent with Iterative Quality Loop
// Orchestrates paper discovery, enrichment, and quality validation

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
  COMPLETENESS_WEIGHTS,
} from "@/lib/types/deepResearch";
import {
  executeSearchPapers,
  executeValidatePapers,
  executeExtractIdentifiers,
  batchEnrichPapers,
  deduplicatePapers,
  calculatePaperCompleteness,
} from "./deepResearchTools";
import { perplexityService } from "./perplexityService";

// =============================================================================
// Progress Callback Type
// =============================================================================

export type ProgressCallback = (update: ResearchProgressUpdate) => void;

// =============================================================================
// Query Expansion for Iterations
// =============================================================================

/**
 * Generate expanded queries for refined search (Iteration 2)
 */
function generateRefinedQueries(originalQuery: string): string[] {
  const queries: string[] = [];

  // Add academic framing
  queries.push(`academic research ${originalQuery}`);
  queries.push(`peer-reviewed study ${originalQuery}`);
  queries.push(`scientific literature ${originalQuery}`);

  // Add methodology angle
  queries.push(`${originalQuery} methodology analysis`);

  // Add recent focus
  queries.push(`recent advances ${originalQuery}`);

  return queries;
}

/**
 * Generate aggressive queries for final iteration (Iteration 3)
 */
function generateAggressiveQueries(originalQuery: string): string[] {
  const queries: string[] = [];

  // Multiple academic sources
  queries.push(`${originalQuery} site:arxiv.org`);
  queries.push(`${originalQuery} site:semanticscholar.org`);
  queries.push(`${originalQuery} site:scholar.google.com`);

  // Specific aspects
  queries.push(`${originalQuery} systematic review`);
  queries.push(`${originalQuery} meta-analysis`);
  queries.push(`${originalQuery} empirical study`);
  queries.push(`${originalQuery} theoretical framework`);

  // Alternative phrasings
  const words = originalQuery.split(/\s+/);
  if (words.length >= 2) {
    // Reorder words
    queries.push(`${words.slice(1).join(" ")} ${words[0]}`);
  }

  return queries;
}

/**
 * Generate synonym-based query variations
 */
function expandWithSynonyms(query: string): string[] {
  // Common academic synonyms
  const synonymMap: Record<string, string[]> = {
    study: ["research", "investigation", "analysis", "examination"],
    effect: ["impact", "influence", "consequence", "outcome"],
    method: ["approach", "technique", "methodology", "procedure"],
    result: ["finding", "outcome", "conclusion", "discovery"],
    increase: ["growth", "rise", "expansion", "enhancement"],
    decrease: ["reduction", "decline", "drop", "diminution"],
    important: ["significant", "crucial", "essential", "critical"],
    show: ["demonstrate", "indicate", "reveal", "suggest"],
    use: ["utilize", "employ", "apply", "implement"],
    develop: ["create", "design", "establish", "formulate"],
  };

  const queries: string[] = [];
  const words = query.toLowerCase().split(/\s+/);

  for (const [word, synonyms] of Object.entries(synonymMap)) {
    if (words.includes(word)) {
      for (const synonym of synonyms.slice(0, 2)) {
        const newQuery = query.replace(
          new RegExp(`\\b${word}\\b`, "gi"),
          synonym,
        );
        if (newQuery !== query) {
          queries.push(newQuery);
        }
      }
    }
  }

  return queries.slice(0, 3);
}

// =============================================================================
// Deep Research Agent Class
// =============================================================================

export class DeepResearchAgent {
  private progressCallback?: ProgressCallback;

  constructor(progressCallback?: ProgressCallback) {
    this.progressCallback = progressCallback;
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
   * Execute deep research with iterative quality loop
   */
  async execute(query: DeepResearchQuery): Promise<DeepResearchResult> {
    const startTime = Date.now();
    const iterations: IterationResult[] = [];
    let allPapers: PartialDeepResearchPaper[] = [];
    let currentQuality = 0;
    let finalStrategy = IterationStrategy.STANDARD;
    const effectiveQueries: string[] = [query.query];

    const maxIterations = query.maxIterations || 3;
    const targetCompleteness =
      query.targetCompleteness || QUALITY_THRESHOLDS.stopIfAbove;

    this.sendProgress({
      stage: ResearchStatus.SEARCHING,
      message: "Starting deep research...",
      currentIteration: 0,
      maxIterations,
      targetQuality: targetCompleteness,
    });

    try {
      // =======================================================================
      // Iteration Loop
      // =======================================================================

      for (let iteration = 1; iteration <= maxIterations; iteration++) {
        const iterationStart = Date.now();
        const strategy = this.getIterationStrategy(iteration);
        finalStrategy = strategy;

        this.sendProgress({
          stage: ResearchStatus.SEARCHING,
          message: `Iteration ${iteration}/${maxIterations}: ${strategy} search`,
          currentIteration: iteration,
          maxIterations,
          currentQuality,
          targetQuality: targetCompleteness,
        });

        // Get queries for this iteration
        const iterationQueries = this.getQueriesForIteration(
          query.query,
          iteration,
          strategy,
        );
        effectiveQueries.push(
          ...iterationQueries.filter((q) => !effectiveQueries.includes(q)),
        );

        // Search for papers
        const searchResults = await this.searchWithStrategy(
          iterationQueries,
          strategy,
          query,
        );

        const papersFoundThisIteration = searchResults.length;

        this.sendProgress({
          stage: ResearchStatus.ENRICHING,
          message: `Found ${papersFoundThisIteration} papers, enriching metadata...`,
          currentIteration: iteration,
          papersFound: allPapers.length + papersFoundThisIteration,
        });

        // Merge with existing papers (before enrichment to avoid duplicates)
        const mergedPapers = deduplicatePapers([
          ...allPapers,
          ...searchResults,
        ]);
        const newPapersCount = mergedPapers.length - allPapers.length;

        // Enrich new papers
        const enrichedPapers = await batchEnrichPapers(
          mergedPapers.filter(
            (p) => !p.enrichedFrom || p.enrichedFrom.length === 0,
          ),
          5, // Concurrency
        );

        // Merge enriched data back
        allPapers = mergedPapers.map((paper) => {
          const enriched = enrichedPapers.find((e) => e.id === paper.id);
          return enriched || paper;
        });

        this.sendProgress({
          stage: ResearchStatus.VALIDATING,
          message: `Validating ${allPapers.length} papers...`,
          currentIteration: iteration,
          papersEnriched: enrichedPapers.length,
        });

        // Validate quality
        const qualityBefore = currentQuality;
        const validationResult = await executeValidatePapers({
          papers: allPapers,
          min_completeness: query.minCompleteness || 0.7,
        });

        if (validationResult.success && validationResult.data) {
          const data = validationResult.data as {
            qualityReport: QualityReport;
            meetsOverallThreshold: boolean;
          };
          currentQuality = data.qualityReport.averageCompleteness;
        }

        // Record iteration result
        const iterationResult: IterationResult = {
          iteration,
          strategy,
          query: iterationQueries[0],
          expandedQueries: iterationQueries.slice(1),
          papersFound: papersFoundThisIteration,
          papersEnriched: enrichedPapers.length,
          newPapersAdded: newPapersCount,
          qualityBefore,
          qualityAfter: currentQuality,
          qualityImprovement: currentQuality - qualityBefore,
          startedAt: new Date(iterationStart).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - iterationStart,
          shouldContinue: false,
          stopReason: undefined,
        };

        // Check stopping conditions
        const { shouldContinue, reason } = this.shouldContinueIterating(
          iteration,
          maxIterations,
          currentQuality,
          targetCompleteness,
          allPapers.length,
          query.maxPapers || 20,
          iterationResult.qualityImprovement,
        );

        iterationResult.shouldContinue = shouldContinue;
        iterationResult.stopReason = reason;
        iterations.push(iterationResult);

        this.sendProgress({
          stage: ResearchStatus.VALIDATING,
          message: `Iteration ${iteration} complete. Quality: ${(currentQuality * 100).toFixed(1)}%`,
          currentIteration: iteration,
          currentQuality,
          papersFound: allPapers.length,
        });

        if (!shouldContinue) {
          break;
        }
      }

      // =======================================================================
      // Final Processing
      // =======================================================================

      this.sendProgress({
        stage: ResearchStatus.ANALYZING,
        message: "Finalizing results...",
        papersFound: allPapers.length,
        currentQuality,
      });

      // Apply filters
      let finalPapers = this.applyFilters(allPapers, query);

      // Sort by relevance (if available) then by completeness
      finalPapers = finalPapers.sort((a, b) => {
        const relevanceA = a.relevanceScore || 0;
        const relevanceB = b.relevanceScore || 0;
        if (relevanceA !== relevanceB) {
          return relevanceB - relevanceA;
        }
        return (b.completenessScore || 0) - (a.completenessScore || 0);
      });

      // Limit to requested number
      const maxPapers = query.maxPapers || 20;
      finalPapers = finalPapers.slice(0, maxPapers);

      // Calculate final completeness scores
      finalPapers = finalPapers.map((paper) => {
        const { score, missingFields } = calculatePaperCompleteness(paper);
        return {
          ...paper,
          completenessScore: score,
          missingFields,
        };
      });

      // Generate final quality report
      const finalValidation = await executeValidatePapers({
        papers: finalPapers,
        min_completeness: query.minCompleteness || 0.7,
      });

      const qualityReport = (
        finalValidation.data as { qualityReport: QualityReport }
      )?.qualityReport || {
        totalPapers: finalPapers.length,
        averageCompleteness: currentQuality,
        averageRelevance: 0,
        fieldCompleteness: [],
        papersWithDOI: finalPapers.filter((p) => p.doi).length,
        papersWithAbstract: finalPapers.filter((p) => p.abstract).length,
        papersWithAuthors: finalPapers.filter((p) => p.authors).length,
        papersWithYear: finalPapers.filter((p) => p.year || p.publishedDate)
          .length,
        papersWithJournal: finalPapers.filter((p) => p.journalName).length,
        papersWithCitations: finalPapers.filter(
          (p) => p.citationCount !== undefined,
        ).length,
        papersWithOpenAccess: finalPapers.filter((p) => p.openAccessUrl).length,
        papersWithHighlights: finalPapers.filter(
          (p) => p.highlights && p.highlights.length > 0,
        ).length,
        highQualityPapers: finalPapers.filter(
          (p) => (p.completenessScore || 0) >= 0.85,
        ).length,
        mediumQualityPapers: finalPapers.filter((p) => {
          const score = p.completenessScore || 0;
          return score >= 0.7 && score < 0.85;
        }).length,
        lowQualityPapers: finalPapers.filter(
          (p) => (p.completenessScore || 0) < 0.7,
        ).length,
        improvementSuggestions: [],
      };

      const endTime = Date.now();

      // Build final result
      const result: DeepResearchResult = {
        status: ResearchStatus.COMPLETE,
        success: true,
        originalQuery: query.query,
        effectiveQueries,
        papers: finalPapers as DeepResearchPaper[],
        totalFound: allPapers.length,
        totalReturned: finalPapers.length,
        qualityReport,
        meetsQualityThreshold: currentQuality >= targetCompleteness,
        iterations,
        totalIterations: iterations.length,
        finalStrategy,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        totalDurationMs: endTime - startTime,
      };

      this.sendProgress({
        type: "result",
        timestamp: new Date().toISOString(),
        stage: ResearchStatus.COMPLETE,
        message: `Research complete. ${finalPapers.length} papers, ${(currentQuality * 100).toFixed(1)}% quality.`,
        papersFound: finalPapers.length,
        currentQuality,
        result,
      });

      return result;
    } catch (error: any) {
      const endTime = Date.now();

      this.sendProgress({
        type: "error",
        timestamp: new Date().toISOString(),
        error: {
          code: "RESEARCH_FAILED",
          message: error.message,
          retryable: true,
        },
      });

      return {
        status: ResearchStatus.FAILED,
        success: false,
        originalQuery: query.query,
        effectiveQueries,
        papers: allPapers as DeepResearchPaper[],
        totalFound: allPapers.length,
        totalReturned: allPapers.length,
        qualityReport: {
          totalPapers: allPapers.length,
          averageCompleteness: currentQuality,
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
        },
        meetsQualityThreshold: false,
        iterations,
        totalIterations: iterations.length,
        finalStrategy,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        totalDurationMs: endTime - startTime,
        errors: [
          {
            stage: "execution",
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }
  }

  /**
   * Get iteration strategy based on iteration number
   */
  private getIterationStrategy(iteration: number): IterationStrategy {
    switch (iteration) {
      case 1:
        return IterationStrategy.STANDARD;
      case 2:
        return IterationStrategy.REFINED;
      default:
        return IterationStrategy.AGGRESSIVE;
    }
  }

  /**
   * Get queries for a specific iteration
   */
  private getQueriesForIteration(
    originalQuery: string,
    iteration: number,
    strategy: IterationStrategy,
  ): string[] {
    switch (strategy) {
      case IterationStrategy.STANDARD:
        return [originalQuery];

      case IterationStrategy.REFINED:
        return [originalQuery, ...generateRefinedQueries(originalQuery)];

      case IterationStrategy.AGGRESSIVE:
        return [
          originalQuery,
          ...generateRefinedQueries(originalQuery),
          ...generateAggressiveQueries(originalQuery),
          ...expandWithSynonyms(originalQuery),
        ];

      default:
        return [originalQuery];
    }
  }

  /**
   * Search with iteration strategy
   */
  private async searchWithStrategy(
    queries: string[],
    strategy: IterationStrategy,
    config: DeepResearchQuery,
  ): Promise<PartialDeepResearchPaper[]> {
    const allResults: PartialDeepResearchPaper[] = [];

    // Determine how many results to fetch per query
    const maxPapers = config.maxPapers || 20;
    const resultsPerQuery = Math.max(5, Math.ceil(maxPapers / queries.length));

    if (strategy === IterationStrategy.STANDARD) {
      // Single query search
      const result = await executeSearchPapers({
        query: queries[0],
        max_results: Math.min(20, maxPapers),
        academic_only: true,
      });

      if (result.success && result.data) {
        const data = result.data as { papers: PartialDeepResearchPaper[] };
        allResults.push(...data.papers);
      }
    } else if (strategy === IterationStrategy.REFINED) {
      // Use multi-search for refined queries
      const limitedQueries = queries.slice(0, 5); // Perplexity supports up to 5

      for (const query of limitedQueries) {
        const result = await executeSearchPapers({
          query,
          max_results: resultsPerQuery,
          academic_only: true,
        });

        if (result.success && result.data) {
          const data = result.data as { papers: PartialDeepResearchPaper[] };
          allResults.push(...data.papers);
        }

        // Small delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } else {
      // Aggressive: parallel searches with multiple queries
      const searchPromises = queries.slice(0, 8).map(async (query, index) => {
        // Stagger requests slightly
        await new Promise((resolve) => setTimeout(resolve, index * 50));

        const result = await executeSearchPapers({
          query,
          max_results: Math.min(10, resultsPerQuery),
          academic_only: true,
        });

        if (result.success && result.data) {
          return (result.data as { papers: PartialDeepResearchPaper[] }).papers;
        }
        return [];
      });

      const results = await Promise.all(searchPromises);
      results.forEach((papers) => allResults.push(...papers));
    }

    return deduplicatePapers(allResults);
  }

  /**
   * Determine if we should continue iterating
   */
  private shouldContinueIterating(
    currentIteration: number,
    maxIterations: number,
    currentQuality: number,
    targetQuality: number,
    paperCount: number,
    targetPaperCount: number,
    qualityImprovement: number,
  ): { shouldContinue: boolean; reason?: IterationResult["stopReason"] } {
    // Check if we've reached quality target with enough papers
    if (
      currentQuality >= targetQuality &&
      paperCount >= targetPaperCount * 0.8
    ) {
      return { shouldContinue: false, reason: "quality_met" };
    }

    // Check if we've hit max iterations
    if (currentIteration >= maxIterations) {
      if (currentQuality >= QUALITY_THRESHOLDS.acceptableIfAbove) {
        return { shouldContinue: false, reason: "max_iterations" };
      }
      return { shouldContinue: false, reason: "max_iterations" };
    }

    // Check for diminishing returns (no improvement in quality)
    if (currentIteration > 1 && qualityImprovement < 0.02) {
      return { shouldContinue: false, reason: "no_improvement" };
    }

    return { shouldContinue: true };
  }

  /**
   * Apply query filters to papers
   */
  private applyFilters(
    papers: PartialDeepResearchPaper[],
    query: DeepResearchQuery,
  ): PartialDeepResearchPaper[] {
    let filtered = [...papers];

    // Filter by year range
    if (query.yearRange) {
      filtered = filtered.filter((paper) => {
        const year =
          paper.year ||
          (paper.publishedDate
            ? new Date(paper.publishedDate).getFullYear()
            : null);
        if (!year) return !query.yearRange?.start && !query.yearRange?.end; // Keep if no year filter
        if (query.yearRange?.start && year < query.yearRange.start)
          return false;
        if (query.yearRange?.end && year > query.yearRange.end) return false;
        return true;
      });
    }

    // Filter by minimum relevance
    if (query.minRelevance) {
      filtered = filtered.filter(
        (paper) => (paper.relevanceScore || 0) >= query.minRelevance!,
      );
    }

    // Filter by minimum completeness
    if (query.minCompleteness) {
      filtered = filtered.filter((paper) => {
        const { score } = calculatePaperCompleteness(paper);
        return score >= query.minCompleteness!;
      });
    }

    // Filter by DOI requirement
    if (query.requireDOI) {
      filtered = filtered.filter(
        (paper) => paper.doi && paper.doi.trim() !== "",
      );
    }

    // Filter by abstract requirement
    if (query.requireAbstract) {
      filtered = filtered.filter(
        (paper) => paper.abstract && paper.abstract.trim() !== "",
      );
    }

    // Filter by publication type
    if (query.publicationTypes && query.publicationTypes.length > 0) {
      filtered = filtered.filter(
        (paper) =>
          paper.publicationType &&
          query.publicationTypes!.includes(paper.publicationType as any),
      );
    }

    // Prefer open access if requested
    if (query.preferOpenAccess) {
      filtered = filtered.sort((a, b) => {
        const aOpen = a.isOpenAccess || a.openAccessUrl ? 1 : 0;
        const bOpen = b.isOpenAccess || b.openAccessUrl ? 1 : 0;
        return bOpen - aOpen;
      });
    }

    return filtered;
  }
}

// =============================================================================
// Convenience Function
// =============================================================================

/**
 * Execute deep research (convenience wrapper)
 */
export async function executeDeepResearch(
  query: DeepResearchQuery,
  progressCallback?: ProgressCallback,
): Promise<DeepResearchResult> {
  const agent = new DeepResearchAgent(progressCallback);
  return agent.execute(query);
}
