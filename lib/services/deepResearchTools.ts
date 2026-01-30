// Deep Research Tools for AI Agent Tool Use
// Defines tool schemas and execution functions for the research agent
// Uses Perplexity for search and Claude for intelligent enrichment

import Anthropic from "@anthropic-ai/sdk";
import { perplexityService } from "./perplexityService";
import {
  DeepResearchPaper,
  PartialDeepResearchPaper,
  COMPLETENESS_WEIGHTS,
  QualityReport,
  FieldCompletenessReport,
} from "@/lib/types/deepResearch";
import { researchCache } from "./researchCacheService";
import { EnrichmentResult } from "./metadataEnrichmentService";

// =============================================================================
// Tool Type Definition (Provider-Agnostic)
// =============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// =============================================================================
// Tool Definitions for AI Agents
// =============================================================================

export const DEEP_RESEARCH_TOOLS: ToolDefinition[] = [
  {
    name: "search_papers",
    description: `Search for academic papers using Perplexity AI. Returns papers from academic sources including arXiv, Google Scholar, PubMed, IEEE, ACM, and Semantic Scholar. Use this tool to discover relevant papers for a research query. Returns up to 20 results per search.`,
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "The search query for finding academic papers. Be specific and include relevant technical terms.",
        },
        max_results: {
          type: "number",
          description:
            "Maximum number of results to return (1-20). Default is 10.",
        },
        academic_only: {
          type: "boolean",
          description:
            "If true, restricts search to academic domains only. Default is true.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "enrich_missing_authors",
    description: `Batch enrich papers that are missing author information. This is a token-optimized tool that only sends paper titles and URLs to Claude (no abstracts or excerpts). Use this after search_papers when you notice papers are missing authors. Processes up to 8 papers per batch efficiently.`,
    input_schema: {
      type: "object" as const,
      properties: {
        papers: {
          type: "array",
          description:
            "Array of papers missing author information. Only title, URL, and id fields are required.",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              url: { type: "string" },
            },
            required: ["id", "title", "url"],
          },
        },
      },
      required: ["papers"],
    },
  },
  {
    name: "research_paper_metadata",
    description: `Use Claude to research and find missing metadata for a paper. Provide the paper's title, URL, and any known information. Claude will search its knowledge to find: authors, publication year, journal/venue, DOI, abstract, and other metadata. Use this when Perplexity search didn't return complete information.`,
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "The paper title (required for research).",
        },
        url: {
          type: "string",
          description: "The paper URL (helps identify the paper).",
        },
        excerpt: {
          type: "string",
          description: "Any snippet or excerpt from the paper.",
        },
        missing_fields: {
          type: "array",
          items: { type: "string" },
          description:
            "List of fields that need to be found: authors, year, doi, abstract, journalName, publisher, citationCount",
        },
        known_info: {
          type: "object",
          description: "Any already known information about the paper.",
          properties: {
            authors: { type: "string" },
            year: { type: "number" },
            doi: { type: "string" },
            journalName: { type: "string" },
          },
        },
      },
      required: ["title"],
    },
  },
  {
    name: "extract_identifiers",
    description: `Extract academic identifiers (DOI, arXiv ID, PubMed ID) from a URL or text content. Useful for preparing papers for enrichment.`,
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description:
            "URL to extract identifiers from (e.g., 'https://arxiv.org/abs/2301.12345').",
        },
        content: {
          type: "string",
          description:
            "Text content that may contain DOI or other identifiers.",
        },
      },
      required: [],
    },
  },
  {
    name: "validate_papers",
    description: `Validate a list of papers and generate a quality report. Calculates completeness scores based on metadata presence and identifies missing fields. Use this to check if papers meet quality thresholds.`,
    input_schema: {
      type: "object" as const,
      properties: {
        papers: {
          type: "array",
          description: "Array of paper objects to validate.",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              url: { type: "string" },
              doi: { type: "string" },
              authors: { type: "string" },
              year: { type: "number" },
              abstract: { type: "string" },
              journalName: { type: "string" },
              citationCount: { type: "number" },
              openAccessUrl: { type: "string" },
              highlights: { type: "array", items: { type: "string" } },
              excerpt: { type: "string" },
              suggestedSections: { type: "array", items: { type: "string" } },
              relevanceScore: { type: "number" },
            },
            required: ["id", "title", "url"],
          },
        },
        min_completeness: {
          type: "number",
          description:
            "Minimum completeness threshold (0-1). Papers below this are flagged. Default is 0.7.",
        },
      },
      required: ["papers"],
    },
  },
  {
    name: "generate_insights",
    description: `Generate AI insights for papers including highlights, relevance scores, and suggested sections. Call this after enriching papers to add query-specific analysis.`,
    input_schema: {
      type: "object" as const,
      properties: {
        papers: {
          type: "array",
          description: "Array of enriched paper objects to analyze.",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              abstract: { type: "string" },
              url: { type: "string" },
            },
            required: ["id", "title"],
          },
        },
        query: {
          type: "string",
          description:
            "The original research query. Used to calculate relevance and generate query-specific highlights.",
        },
        target_sections: {
          type: "array",
          items: { type: "string" },
          description:
            "Target document sections (e.g., ['Introduction', 'Methods', 'Literature Review']). Papers will be mapped to relevant sections.",
        },
      },
      required: ["papers", "query"],
    },
  },
];

// =============================================================================
// Academic Domain Filter
// =============================================================================

// Perplexity API allows max 20 domains
const ACADEMIC_DOMAINS = [
  "arxiv.org",
  "scholar.google.com",
  "semanticscholar.org",
  "pubmed.ncbi.nlm.nih.gov",
  "ieee.org",
  "acm.org",
  "sciencedirect.com",
  "springer.com",
  "nature.com",
  "wiley.com",
  "jstor.org",
  "researchgate.net",
  "biorxiv.org",
  "plos.org",
  "frontiersin.org",
  "mdpi.com",
  "oup.com",
  "cambridge.org",
  "ssrn.com",
  "tandfonline.com",
];

// =============================================================================
// Tool Execution Functions
// =============================================================================

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Execute the search_papers tool (with caching)
 */
export async function executeSearchPapers(input: {
  query: string;
  max_results?: number;
  academic_only?: boolean;
}): Promise<ToolExecutionResult> {
  try {
    const { query, max_results = 10, academic_only = true } = input;

    const cacheOptions = { max_results, academic_only };

    // Check cache first
    const cachedResults = researchCache.getQueryResults(query, cacheOptions);
    if (cachedResults && cachedResults.length > 0) {
      console.log(
        `[Search] Cache hit for query: "${query}" (${cachedResults.length} papers)`,
      );
      return {
        success: true,
        data: {
          papers: cachedResults,
          total: cachedResults.length,
          query,
          cached: true,
        },
      };
    }

    const options: { maxResults: number; searchDomainFilter?: string[] } = {
      maxResults: Math.min(max_results, 20),
    };

    if (academic_only) {
      options.searchDomainFilter = ACADEMIC_DOMAINS;
    }

    const results = await perplexityService.search(query, options);

    // Transform to partial paper format and calculate completeness
    const papers: PartialDeepResearchPaper[] = results
      .map((result) => {
        // Try to extract a DOI from the snippet if URL is missing
        let effectiveUrl = result.url;
        let foundDoi = "";

        if (!effectiveUrl || effectiveUrl.trim() === "") {
          const doiMatch = result.snippet.match(
            /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i,
          );
          if (doiMatch) {
            foundDoi = doiMatch[0];
            effectiveUrl = `https://doi.org/${foundDoi}`;
          }
        }

        const paper: PartialDeepResearchPaper = {
          id: result.id,
          title: result.title,
          url: effectiveUrl,
          doi: foundDoi || undefined,
          source: "perplexity" as const,
          excerpt: result.snippet,
          publishedDate: result.date,
          authors: "", // Will be enriched later
          highlights: [],
          relevanceScore: 0,
          suggestedSections: [],
          isOpenAccess: false,
          completenessScore: 0,
          missingFields: [],
        };

        // Calculate completeness immediately so Claude knows what's missing
        const { score, missingFields } = calculatePaperCompleteness(paper);
        paper.completenessScore = score;
        paper.missingFields = missingFields;

        return paper;
      })
      .filter((p) => p.url && p.url.trim().length > 0); // FILTER: Discard papers with no URL

    console.log(
      `[Search] Found ${results.length} results. Keeping ${papers.length} valid papers with URLs.`,
    );
    papers.forEach((p, i) => {
      console.log(
        `  ${i + 1}. "${p.title.substring(0, 40)}..." - Completeness: ${(p.completenessScore! * 100).toFixed(0)}% (Missing: ${p.missingFields?.join(", ") || "none"})`,
      );
    });

    // Cache the results
    if (papers.length > 0) {
      researchCache.setQueryResults(query, papers, cacheOptions);
      console.log(
        `[Search] Cached ${papers.length} papers for query: "${query}"`,
      );
    }

    return {
      success: true,
      data: {
        papers,
        total: papers.length,
        query,
        cached: false,
      },
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Search failed: ${errorMessage}`,
    };
  }
}

/**
 * Execute the research_paper_metadata tool using Claude
 * This dynamically researches missing fields for a paper using Claude's knowledge
 */
export async function executeResearchPaperMetadata(input: {
  title: string;
  url?: string;
  excerpt?: string;
  missing_fields?: string[];
  known_info?: {
    authors?: string;
    year?: number;
    doi?: string;
    journalName?: string;
  };
}): Promise<ToolExecutionResult> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "ANTHROPIC_API_KEY not configured for paper research",
      };
    }

    // Generate cache key
    const cacheKey = `research:${input.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 50)}`;

    // Check cache first
    const cachedResult = researchCache.getEnrichment(cacheKey);
    if (cachedResult) {
      console.log(
        `[Research] Cache hit for: ${input.title.substring(0, 50)}...`,
      );
      return {
        success: true,
        data: {
          ...cachedResult,
          cached: true,
        },
      };
    }

    const client = new Anthropic({ apiKey });

    // Build the research prompt
    const fieldsToFind = input.missing_fields || [
      "authors",
      "year",
      "doi",
      "abstract",
      "journalName",
      "publisher",
    ];

    const prompt = `I need you to find metadata for this academic paper. Please research and provide accurate information.

**Paper Title:** ${input.title}
${input.url ? `**URL:** ${input.url}` : ""}
${input.excerpt ? `**Excerpt/Snippet:** ${input.excerpt}` : ""}
${input.known_info ? `**Already Known:** ${JSON.stringify(input.known_info)}` : ""}

**Fields I need you to find:** ${fieldsToFind.join(", ")}

Please respond with a JSON object containing ONLY the fields you can confidently provide. Use these exact field names:
- authors: string (comma-separated author names, e.g., "John Smith, Jane Doe")
- year: number (publication year)
- doi: string (DOI without URL prefix)
- abstract: string (paper abstract or summary)
- journalName: string (journal or conference name)
- publisher: string (publisher name)
- citationCount: number (approximate citation count if known)
- venue: string (publication venue if different from journal)

IMPORTANT:
- Only include fields you're confident about
- If you're not sure about a field, don't include it
- Respond with ONLY the JSON object, no other text
- For authors, use the format "FirstName LastName, FirstName LastName"`;

    console.log(
      `[Research] Using Claude to research: "${input.title.substring(0, 50)}..."`,
    );

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract JSON from response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return {
        success: false,
        error: "No text response from Claude",
      };
    }

    // Parse the JSON response
    let metadata: Record<string, unknown> = {};
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonStr = textBlock.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      metadata = JSON.parse(jsonStr);
    } catch {
      console.warn(
        `[Research] Failed to parse JSON response: ${textBlock.text.substring(0, 100)}`,
      );
      // Try to extract individual fields using regex as fallback
      const authorMatch = textBlock.text.match(/"authors":\s*"([^"]+)"/i);
      const yearMatch = textBlock.text.match(/"year":\s*(\d{4})/i);
      const doiMatch = textBlock.text.match(/"doi":\s*"([^"]+)"/i);
      const journalMatch = textBlock.text.match(/"journalName":\s*"([^"]+)"/i);

      if (authorMatch) metadata.authors = authorMatch[1];
      if (yearMatch) metadata.year = parseInt(yearMatch[1]);
      if (doiMatch) metadata.doi = doiMatch[1];
      if (journalMatch) metadata.journalName = journalMatch[1];
    }

    // Additional cleanup for authors field (sometimes Claude adds extra text)
    if (typeof metadata.authors === "string") {
      metadata.authors = metadata.authors.replace(/^Authors:\s*/i, "").trim();
    }

    const result: EnrichmentResult = {
      ...metadata,
      source: "scraping", // 'claude' not in EnrichmentResult source union
      confidence: "medium",
    };

    researchCache.setEnrichment(cacheKey, result);
    console.log(
      `[Research] Found metadata: ${Object.keys(metadata).join(", ")}`,
    );

    return {
      success: true,
      data: {
        ...result,
        fieldsFound: Object.keys(metadata),
        cached: false,
      } as Record<string, unknown>,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Research] Error:`, message);
    return {
      success: false,
      error: `Research failed: ${message}`,
    };
  }
}

/**
 * Execute the extract_identifiers tool
 */
export async function executeExtractIdentifiers(input: {
  url?: string;
  content?: string;
}): Promise<ToolExecutionResult> {
  try {
    const identifiers: {
      doi?: string;
      arxivId?: string;
      pubmedId?: string;
      source: string;
    } = { source: "extraction" };

    const textToSearch = `${input.url || ""} ${input.content || ""}`;

    // DOI patterns
    const doiPatterns = [
      /(?:doi\.org\/|dx\.doi\.org\/)(10\.\d+\/[^\s\)\"'<>]+)/i,
      /(?:doi|DOI)[\s:]+?(10\.\d+\/[^\s\)\"'<>]+)/i,
      /\b(10\.\d{4,}\/[^\s\)\"'<>]+)/g,
    ];

    for (const pattern of doiPatterns) {
      const match = textToSearch.match(pattern);
      if (match) {
        // Clean the DOI (remove trailing punctuation)
        identifiers.doi =
          match[1]?.replace(/[.,;:]+$/, "") || match[0].replace(/[.,;:]+$/, "");
        break;
      }
    }

    // arXiv ID patterns
    const arxivPatterns = [
      /arxiv\.org\/abs\/(\d{4}\.\d{4,5}(?:v\d+)?)/i,
      /arxiv\.org\/pdf\/(\d{4}\.\d{4,5}(?:v\d+)?)/i,
      /arXiv:(\d{4}\.\d{4,5}(?:v\d+)?)/i,
      /\b(\d{4}\.\d{4,5}(?:v\d+)?)\b/, // Bare arXiv ID
    ];

    for (const pattern of arxivPatterns) {
      const match = textToSearch.match(pattern);
      if (match && match[1]) {
        identifiers.arxivId = match[1];
        break;
      }
    }

    // PubMed ID patterns
    const pubmedPatterns = [
      /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i,
      /ncbi\.nlm\.nih\.gov\/pubmed\/(\d+)/i,
      /PMID[\s:]+?(\d+)/i,
    ];

    for (const pattern of pubmedPatterns) {
      const match = textToSearch.match(pattern);
      if (match && match[1]) {
        identifiers.pubmedId = match[1];
        break;
      }
    }

    const found =
      identifiers.doi || identifiers.arxivId || identifiers.pubmedId;

    return {
      success: true,
      data: {
        ...identifiers,
        found: !!found,
        message: found
          ? `Found identifiers: ${Object.entries(identifiers)
              .filter(([k, v]) => v && k !== "source" && k !== "found")
              .map(([k, v]) => `${k}=${v}`)
              .join(", ")}`
          : "No academic identifiers found in the provided text.",
      } as Record<string, unknown>,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Extraction failed: ${error.message}`,
    };
  }
}

/**
 * Calculate completeness score for a single paper
 */
export function calculatePaperCompleteness(paper: Partial<DeepResearchPaper>): {
  score: number;
  missingFields: string[];
} {
  let score = 0;
  const missingFields: string[] = [];

  // Check each weighted field
  if (paper.title && paper.title.trim()) {
    score += COMPLETENESS_WEIGHTS.title;
  } else {
    missingFields.push("title");
  }

  if (paper.authors && paper.authors.trim()) {
    score += COMPLETENESS_WEIGHTS.authors;
  } else {
    missingFields.push("authors");
  }

  if (paper.publishedDate || paper.year) {
    score += COMPLETENESS_WEIGHTS.publishedDate;
  } else {
    missingFields.push("publishedDate");
  }

  if (paper.doi && paper.doi.trim()) {
    score += COMPLETENESS_WEIGHTS.doi;
  } else {
    missingFields.push("doi");
  }

  if (paper.abstract && paper.abstract.trim()) {
    score += COMPLETENESS_WEIGHTS.abstract;
  } else {
    missingFields.push("abstract");
  }

  if (paper.journalName && paper.journalName.trim()) {
    score += COMPLETENESS_WEIGHTS.journalName;
  } else {
    missingFields.push("journalName");
  }

  if (paper.citationCount !== undefined && paper.citationCount >= 0) {
    score += COMPLETENESS_WEIGHTS.citationCount;
  } else {
    missingFields.push("citationCount");
  }

  if (paper.openAccessUrl && paper.openAccessUrl.trim()) {
    score += COMPLETENESS_WEIGHTS.openAccessUrl;
  } else {
    missingFields.push("openAccessUrl");
  }

  if (paper.highlights && paper.highlights.length > 0) {
    score += COMPLETENESS_WEIGHTS.highlights;
  } else {
    missingFields.push("highlights");
  }

  if (paper.publisher && paper.publisher.trim()) {
    score += COMPLETENESS_WEIGHTS.publisher;
  } else {
    missingFields.push("publisher");
  }

  if (paper.excerpt && paper.excerpt.trim()) {
    score += COMPLETENESS_WEIGHTS.excerpt;
  } else {
    missingFields.push("excerpt");
  }

  if (paper.suggestedSections && paper.suggestedSections.length > 0) {
    score += COMPLETENESS_WEIGHTS.suggestedSections;
  } else {
    missingFields.push("suggestedSections");
  }

  if (paper.relevanceScore !== undefined && paper.relevanceScore > 0) {
    score += COMPLETENESS_WEIGHTS.relevanceScore;
  } else {
    missingFields.push("relevanceScore");
  }

  return { score, missingFields };
}

/**
 * Execute the validate_papers tool
 */
export async function executeValidatePapers(input: {
  papers: Partial<DeepResearchPaper>[];
  min_completeness?: number;
}): Promise<ToolExecutionResult> {
  try {
    const { papers, min_completeness = 0.7 } = input;

    console.log("\n" + "=".repeat(80));
    console.log(
      `[Tool: validate_papers] Called by Claude - validating ${papers?.length || 0} papers`,
    );
    console.log("=".repeat(80));

    if (!papers || papers.length === 0) {
      return {
        success: true,
        data: {
          totalPapers: 0,
          averageCompleteness: 0,
          meetsThreshold: false,
          message: "No papers provided for validation.",
        },
      };
    }

    // Calculate completeness for each paper
    const paperResults = papers.map((paper) => {
      const { score, missingFields } = calculatePaperCompleteness(paper);
      return {
        id: paper.id,
        title: paper.title,
        completenessScore: score,
        missingFields,
        meetsThreshold: score >= min_completeness,
      };
    });

    // Calculate field-level statistics
    const fieldStats: Record<string, { present: number; total: number }> = {};
    Object.keys(COMPLETENESS_WEIGHTS).forEach((field) => {
      fieldStats[field] = { present: 0, total: papers.length };
    });

    paperResults.forEach((result) => {
      Object.keys(COMPLETENESS_WEIGHTS).forEach((field) => {
        if (!result.missingFields.includes(field)) {
          fieldStats[field].present++;
        }
      });
    });

    const fieldCompleteness: FieldCompletenessReport[] = Object.entries(
      fieldStats,
    ).map(([field, stats]) => ({
      field,
      weight: COMPLETENESS_WEIGHTS[field as keyof typeof COMPLETENESS_WEIGHTS],
      presentCount: stats.present,
      totalCount: stats.total,
      percentage: (stats.present / stats.total) * 100,
    }));

    // Overall metrics
    const totalCompleteness = paperResults.reduce(
      (sum, p) => sum + p.completenessScore,
      0,
    );
    const averageCompleteness = totalCompleteness / papers.length;
    const papersAboveThreshold = paperResults.filter(
      (p) => p.meetsThreshold,
    ).length;

    // Quality distribution
    const highQuality = paperResults.filter(
      (p) => p.completenessScore >= 0.85,
    ).length;
    const mediumQuality = paperResults.filter(
      (p) => p.completenessScore >= 0.7 && p.completenessScore < 0.85,
    ).length;
    const lowQuality = paperResults.filter(
      (p) => p.completenessScore < 0.7,
    ).length;

    // Generate improvement suggestions
    const suggestions: string[] = [];
    fieldCompleteness
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3)
      .forEach((field) => {
        if (field.percentage < 80) {
          suggestions.push(
            `Improve ${field.field} coverage (currently ${field.percentage.toFixed(0)}%)`,
          );
        }
      });

    const qualityReport: QualityReport = {
      totalPapers: papers.length,
      averageCompleteness,
      averageRelevance: 0, // Would need relevance scores
      fieldCompleteness,
      papersWithDOI: fieldStats.doi?.present || 0,
      papersWithAbstract: fieldStats.abstract?.present || 0,
      papersWithAuthors: fieldStats.authors?.present || 0,
      papersWithYear: fieldStats.publishedDate?.present || 0,
      papersWithJournal: fieldStats.journalName?.present || 0,
      papersWithCitations: fieldStats.citationCount?.present || 0,
      papersWithOpenAccess: fieldStats.openAccessUrl?.present || 0,
      papersWithHighlights: fieldStats.highlights?.present || 0,
      highQualityPapers: highQuality,
      mediumQualityPapers: mediumQuality,
      lowQualityPapers: lowQuality,
      improvementSuggestions: suggestions,
    };

    console.log("\n[Tool: validate_papers] Detailed Breakdown:");
    paperResults.forEach((res, i) => {
      console.log(
        `  ${i + 1}. "${res.title?.substring(0, 40)}..." - ${(res.completenessScore * 100).toFixed(0)}% - Missing: ${res.missingFields.join(", ") || "none"}`,
      );
    });

    console.log("\n[Tool: validate_papers] Summary Metrics:");
    console.log(`  Total Papers: ${papers.length}`);
    console.log(
      `  Average Completeness: ${(averageCompleteness * 100).toFixed(1)}%`,
    );
    console.log(
      `  Papers with Authors: ${fieldStats.authors?.present || 0}/${papers.length}`,
    );
    console.log(
      `  Papers with DOI: ${fieldStats.doi?.present || 0}/${papers.length}`,
    );
    console.log(
      `  Papers with Abstract: ${fieldStats.abstract?.present || 0}/${papers.length}`,
    );
    console.log(
      `  Meets Threshold (${(min_completeness * 100).toFixed(0)}%): ${averageCompleteness >= min_completeness ? "✓ YES" : "✗ NO"}`,
    );
    console.log("=".repeat(80) + "\n");

    return {
      success: true,
      data: {
        qualityReport,
        paperResults,
        meetsOverallThreshold: averageCompleteness >= min_completeness,
        papersAboveThreshold,
        papersNeedingWork: papers.length - papersAboveThreshold,
        summary: `${papersAboveThreshold}/${papers.length} papers meet ${(min_completeness * 100).toFixed(0)}% threshold. Average completeness: ${(averageCompleteness * 100).toFixed(1)}%`,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Validation failed: ${error.message}`,
    };
  }
}

/**
 * Execute the generate_insights tool (placeholder - actual implementation uses Claude)
 */
export async function executeGenerateInsights(input: {
  papers: Partial<DeepResearchPaper>[];
  query: string;
  target_sections?: string[];
}): Promise<ToolExecutionResult> {
  // This tool is meant to be handled by Claude itself in the conversation
  // The tool definition exists so Claude knows it can generate insights
  // In practice, we return the papers and let Claude do the analysis
  return {
    success: true,
    data: {
      message:
        "Insights generation should be performed by the AI model directly.",
      papers: input.papers,
      query: input.query,
      target_sections: input.target_sections || [
        "Introduction",
        "Literature Review",
        "Methods",
        "Results",
        "Discussion",
      ],
    },
  };
}

// =============================================================================
// Tool Router
// =============================================================================

export type ToolName =
  | "search_papers"
  | "enrich_missing_authors"
  | "research_paper_metadata"
  | "extract_identifiers"
  | "validate_papers"
  | "generate_insights";

/**
 * Execute the enrich_missing_authors tool
 */
export async function executeEnrichMissingAuthors(input: {
  papers: PartialDeepResearchPaper[];
}): Promise<ToolExecutionResult> {
  try {
    const { papers } = input;

    console.log("\n" + "=".repeat(80));
    console.log("[Tool: enrich_missing_authors] Called by Claude agent");
    console.log("=".repeat(80));

    if (!papers || papers.length === 0) {
      console.log("[Tool: enrich_missing_authors] No papers provided");
      return {
        success: true,
        data: {
          message: "No papers provided for author enrichment",
          enrichedCount: 0,
        },
      };
    }

    const papersNeedingAuthors = papers.filter(
      (p) => !p.authors || p.authors.trim() === "",
    );

    console.log(
      `[Tool: enrich_missing_authors] Received ${papers.length} papers, ${papersNeedingAuthors.length} need authors`,
    );

    if (papersNeedingAuthors.length === 0) {
      console.log(
        "[Tool: enrich_missing_authors] All papers already have authors",
      );
      return {
        success: true,
        data: {
          message: "All papers already have authors",
          enrichedCount: 0,
          papers,
        },
      };
    }

    const enrichedPapers = await enrichMissingAuthors(papers);

    const enrichedCount = enrichedPapers.filter(
      (p) => p.authors && p.authors.trim() !== "",
    ).length;
    const totalNeeded = papersNeedingAuthors.length;

    console.log("\n" + "=".repeat(80));
    console.log(
      `[Tool: enrich_missing_authors] Returning result to Claude: ${enrichedCount}/${totalNeeded} papers enriched`,
    );
    console.log("=".repeat(80) + "\n");

    return {
      success: true,
      data: {
        papers: enrichedPapers,
        enrichedCount,
        totalNeeded,
        successRate: `${enrichedCount}/${totalNeeded}`,
        message: `Successfully found authors for ${enrichedCount} out of ${totalNeeded} papers`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Author enrichment failed: ${message}`,
    };
  }
}

/**
 * Route and execute a tool call from Claude
 */
export async function executeToolCall(
  toolName: ToolName,
  toolInput: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  switch (toolName) {
    case "search_papers":
      return executeSearchPapers(
        toolInput as Parameters<typeof executeSearchPapers>[0],
      );
    case "enrich_missing_authors":
      return executeEnrichMissingAuthors(
        toolInput as Parameters<typeof executeEnrichMissingAuthors>[0],
      );
    case "research_paper_metadata":
      return executeResearchPaperMetadata(
        toolInput as Parameters<typeof executeResearchPaperMetadata>[0],
      );
    case "extract_identifiers":
      return executeExtractIdentifiers(
        toolInput as Parameters<typeof executeExtractIdentifiers>[0],
      );
    case "validate_papers":
      return executeValidatePapers(
        toolInput as Parameters<typeof executeValidatePapers>[0],
      );
    case "generate_insights":
      return executeGenerateInsights(
        toolInput as Parameters<typeof executeGenerateInsights>[0],
      );
    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
      };
  }
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Enrich papers with missing authors using Claude
 * Token-optimized: Only sends title + URL (no abstract/excerpt)
 * Batches multiple papers per request for efficiency
 */
export async function enrichMissingAuthors(
  papers: PartialDeepResearchPaper[],
  batchSize: number = 8,
): Promise<PartialDeepResearchPaper[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[Enrich Authors] ANTHROPIC_API_KEY not configured");
    return papers;
  }

  // Filter papers missing authors
  const papersNeedingAuthors = papers.filter(
    (p) => !p.authors || p.authors.trim() === "",
  );

  if (papersNeedingAuthors.length === 0) {
    console.log("[Enrich Authors] All papers already have authors");
    return papers;
  }

  console.log(
    `[Enrich Authors] ${papersNeedingAuthors.length} papers need author information`,
  );

  const client = new Anthropic({ apiKey });
  const enrichedPapers = new Map<string, PartialDeepResearchPaper>();

  // Initialize map with all original papers
  papers.forEach((p) => enrichedPapers.set(p.id, p));

  // Process in batches
  for (let i = 0; i < papersNeedingAuthors.length; i += batchSize) {
    const batch = papersNeedingAuthors.slice(i, i + batchSize);

    console.log(
      `[Enrich Authors] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(papersNeedingAuthors.length / batchSize)} (${batch.length} papers)`,
    );

    // Build minimal request with only title + URL
    const papersForClaude = batch.map((p) => ({
      id: p.id,
      title: p.title,
      url: p.url,
    }));

    // Log papers being sent to Claude
    console.log("[Enrich Authors] Papers sent to Claude:");
    papersForClaude.forEach((p, idx) => {
      console.log(`  ${idx + 1}. [${p.id}] ${p.title.substring(0, 60)}...`);
      console.log(`     URL: ${p.url}`);
    });

    const prompt = `You are an expert at finding author information for academic papers. I have a list of papers that are missing author information. For each paper, please find the authors using the title and URL provided.

**Papers:**
${papersForClaude
  .map(
    (p, idx) => `
${idx + 1}. **Title:** ${p.title}
   **URL:** ${p.url}
   **ID:** ${p.id}`,
  )
  .join("\n")}

**Instructions:**
- For each paper, find the complete list of authors
- Return authors in the format "FirstName LastName, FirstName LastName" (comma-separated)
- Only include papers where you can confidently identify the authors
- If you cannot find authors for a paper, omit it from your response

**Response Format (JSON only, no other text):**
\`\`\`json
[
  {
    "id": "paper-id-here",
    "authors": "Author One, Author Two, Author Three"
  }
]
\`\`\`

Respond with ONLY the JSON array, no other text.`;

    try {
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      // Extract JSON from response
      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        console.warn("[Enrich Authors] No text response from Claude");
        continue;
      }

      // Log the raw response from Claude
      console.log("\n[Enrich Authors] Claude Response:");
      console.log("─".repeat(80));
      console.log(textBlock.text);
      console.log("─".repeat(80) + "\n");

      // Parse the JSON response
      let authorResults: Array<{ id: string; authors: string }> = [];
      try {
        let jsonStr = textBlock.text.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        authorResults = JSON.parse(jsonStr);

        console.log(
          `[Enrich Authors] Parsed ${authorResults.length} author results from Claude`,
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(
          `[Enrich Authors] Failed to parse JSON (${errMsg}): ${textBlock.text.substring(0, 200)}...`,
        );
        continue;
      }

      // Merge results back into papers
      console.log("\n[Enrich Authors] Merging results:");
      let enrichedCount = 0;
      for (const result of authorResults) {
        const paper = enrichedPapers.get(result.id);
        if (paper && result.authors && result.authors.trim()) {
          const authorCount = result.authors.split(",").length;
          paper.authors = result.authors;
          paper.enrichedFrom = [
            ...(paper.enrichedFrom || []),
            "claude:authors",
          ];
          paper.lastEnrichedAt = new Date().toISOString();
          enrichedCount++;

          console.log(
            `  ✓ [${result.id}] "${paper.title?.substring(0, 50)}..."`,
          );
          console.log(`    Authors (${authorCount}): ${result.authors}`);
        } else if (paper) {
          console.log(
            `  ✗ [${result.id}] "${paper.title?.substring(0, 50)}..." - No authors found`,
          );
        } else {
          console.log(`  ✗ [${result.id}] - Paper not found in map`);
        }
      }

      // Log papers that weren't enriched
      const enrichedIds = new Set(authorResults.map((r) => r.id));
      const missedPapers = batch.filter((p) => !enrichedIds.has(p.id));
      if (missedPapers.length > 0) {
        console.log("\n[Enrich Authors] Papers not enriched by Claude:");
        missedPapers.forEach((p) => {
          console.log(`  ✗ [${p.id}] "${p.title?.substring(0, 50)}..."`);
        });
      }

      console.log(
        `\n[Enrich Authors] Batch complete: ${enrichedCount}/${batch.length} papers enriched`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Enrich Authors] Batch error: ${message}`);
    }

    // Rate limiting delay between batches
    if (i + batchSize < papersNeedingAuthors.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Final summary
  const finalPapers = Array.from(enrichedPapers.values());
  const finalWithAuthors = finalPapers.filter(
    (p) => p.authors && p.authors.trim() !== "",
  ).length;
  const totalPapers = finalPapers.length;

  console.log("\n" + "=".repeat(80));
  console.log(
    `[Enrich Authors] FINAL SUMMARY: ${finalWithAuthors}/${totalPapers} papers now have authors`,
  );
  console.log("=".repeat(80) + "\n");

  return finalPapers;
}

/**
 * Enrich multiple papers using Claude-based research
 * Only researches papers that are below the completeness threshold
 */
export async function batchEnrichPapers(
  papers: PartialDeepResearchPaper[],
  concurrency: number = 10,
  minCompleteness: number = 0.8,
): Promise<PartialDeepResearchPaper[]> {
  const enrichedPapers: PartialDeepResearchPaper[] = [];

  // Process in batches to respect rate limits
  for (let i = 0; i < papers.length; i += concurrency) {
    const batch = papers.slice(i, i + concurrency);

    const enrichmentPromises = batch.map(async (paper) => {
      // Calculate current completeness
      const { score, missingFields } = calculatePaperCompleteness(paper);

      // Skip if already complete enough
      if (score >= minCompleteness) {
        console.log(
          `[Enrich] Paper "${paper.title?.substring(0, 40)}..." already at ${(score * 100).toFixed(0)}%`,
        );
        return {
          ...paper,
          completenessScore: score,
          missingFields,
        };
      }

      console.log(
        `[Enrich] Paper "${paper.title?.substring(0, 40)}..." at ${(score * 100).toFixed(0)}%, researching: ${missingFields.join(", ")}`,
      );

      // First try to extract identifiers from URL
      const identifierResult = await executeExtractIdentifiers({
        url: paper.url,
      });
      const identifiers = identifierResult.success
        ? (identifierResult.data as { doi?: string; arxivId?: string })
        : {};

      // Use Claude to research missing fields
      const researchResult = await executeResearchPaperMetadata({
        title: paper.title || "",
        url: paper.url,
        excerpt: paper.excerpt,
        missing_fields: missingFields.filter((f) =>
          [
            "authors",
            "year",
            "doi",
            "abstract",
            "journalName",
            "publisher",
            "citationCount",
          ].includes(f),
        ),
        known_info: {
          authors: paper.authors,
          year: paper.year,
          doi: identifiers.doi || paper.doi,
          journalName: paper.journalName,
        },
      });

      if (researchResult.success && researchResult.data) {
        const research = researchResult.data as {
          authors?: string;
          year?: number;
          doi?: string;
          abstract?: string;
          journalName?: string;
          publisher?: string;
          citationCount?: number;
          venue?: string;
        };

        const enrichedPaper = {
          ...paper,
          doi: research.doi || identifiers.doi || paper.doi,
          arxivId: identifiers.arxivId || paper.arxivId,
          authors: research.authors || paper.authors,
          year: research.year || paper.year,
          abstract: research.abstract || paper.abstract,
          journalName:
            research.journalName || research.venue || paper.journalName,
          publisher: research.publisher || paper.publisher,
          citationCount: research.citationCount ?? paper.citationCount,
          enrichedFrom: [...(paper.enrichedFrom || []), "claude"],
          lastEnrichedAt: new Date().toISOString(),
        } as PartialDeepResearchPaper;

        // Recalculate completeness
        const { score: newScore, missingFields: newMissing } =
          calculatePaperCompleteness(enrichedPaper);
        enrichedPaper.completenessScore = newScore;
        enrichedPaper.missingFields = newMissing;

        console.log(
          `[Enrich] Paper improved: ${(score * 100).toFixed(0)}% → ${(newScore * 100).toFixed(0)}%`,
        );

        return enrichedPaper;
      }

      return {
        ...paper,
        completenessScore: score,
        missingFields,
      };
    });

    const batchResults = await Promise.all(enrichmentPromises);
    enrichedPapers.push(...batchResults);

    // Delay between batches to respect rate limits
    if (i + concurrency < papers.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return enrichedPapers;
}

/**
 * Merge two paper objects, keeping the best information from each
 */
function mergePapers(
  existing: PartialDeepResearchPaper,
  newPaper: PartialDeepResearchPaper,
): PartialDeepResearchPaper {
  // Use the one with the better description/excerpt if available
  const bestExcerpt =
    (newPaper.excerpt?.length || 0) > (existing.excerpt?.length || 0)
      ? newPaper.excerpt
      : existing.excerpt;

  // Combine enrichedFrom sources
  const combinedSources = Array.from(
    new Set([
      ...(existing.enrichedFrom || []),
      ...(newPaper.enrichedFrom || []),
    ]),
  );

  return {
    ...existing,
    ...newPaper,
    // Prioritize non-empty fields
    authors: newPaper.authors?.trim() ? newPaper.authors : existing.authors,
    abstract: newPaper.abstract?.trim() ? newPaper.abstract : existing.abstract,
    doi: newPaper.doi || existing.doi,
    year: newPaper.year || existing.year,
    publishedDate: newPaper.publishedDate || existing.publishedDate,
    journalName: newPaper.journalName || existing.journalName,
    excerpt: bestExcerpt,
    enrichedFrom: combinedSources,
    // Recalculate score later or keep the max for now
    completenessScore: Math.max(
      existing.completenessScore || 0,
      newPaper.completenessScore || 0,
    ),
  };
}

/**
 * Deduplicate papers by DOI, URL, or title similarity with merging
 */
export function deduplicatePapers(
  papers: PartialDeepResearchPaper[],
): PartialDeepResearchPaper[] {
  const seenById = new Map<string, PartialDeepResearchPaper>();
  const doiToId = new Map<string, string>();
  const urlToId = new Map<string, string>();
  const titleToId = new Map<string, string>();

  for (const paper of papers) {
    // Generate deduplication keys
    const doiKey = paper.doi
      ?.toLowerCase()
      ?.replace(/https?:\/\/doi\.org\//, "");
    const urlKey = paper.url
      ?.toLowerCase()
      .replace(/https?:\/\//, "")
      .replace(/\/$/, "")
      .split("?")[0]; // Ignore query params
    const titleKey = paper.title
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 60);

    // Identify if this is a duplicate
    const existingId =
      (doiKey ? doiToId.get(doiKey) : null) ||
      (urlKey ? urlToId.get(urlKey) : null) ||
      (titleKey ? titleToId.get(titleKey) : null);

    if (existingId && seenById.has(existingId)) {
      // Merge with existing paper
      const existing = seenById.get(existingId)!;
      const merged = mergePapers(existing, paper);
      seenById.set(existingId, merged);
    } else {
      // New unique paper
      seenById.set(paper.id, paper);
      // Register discovery keys
      if (doiKey) doiToId.set(doiKey, paper.id);
      if (urlKey) urlToId.set(urlKey, paper.id);
      if (titleKey) titleToId.set(titleKey, paper.id);
    }
  }

  return Array.from(seenById.values());
}
