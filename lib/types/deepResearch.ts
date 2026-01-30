// Deep Research System Types
// Comprehensive type definitions for the iterative research agent system

import { z } from "zod";

// =============================================================================
// Core Enums
// =============================================================================

export enum ResearchStatus {
  PENDING = "pending",
  SEARCHING = "searching",
  ENRICHING = "enriching",
  ANALYZING = "analyzing",
  VALIDATING = "validating",
  COMPLETE = "complete",
  FAILED = "failed",
}

export enum IterationStrategy {
  STANDARD = "standard", // Iteration 1: Original query
  REFINED = "refined", // Iteration 2: Expanded with synonyms
  AGGRESSIVE = "aggressive", // Iteration 3: Multiple query variants
}

export enum PaperIdentifierType {
  DOI = "doi",
  ARXIV = "arxiv",
  PUBMED = "pubmed",
  ISBN = "isbn",
  URL = "url",
}

// =============================================================================
// Author Types (compatible with existing metadataEnrichmentService)
// =============================================================================

export interface StructuredAuthor {
  first: string;
  last: string;
  middle?: string;
  affiliation?: string;
  orcid?: string;
}

// =============================================================================
// Deep Research Paper
// =============================================================================

export interface DeepResearchPaper {
  // Identity
  id: string;
  title: string;
  url: string;

  // Identifiers (critical for enrichment)
  doi?: string;
  arxivId?: string;
  pubmedId?: string;
  isbn?: string;

  // Authors
  authors: string; // Formatted string: "Smith, J., Jones, M., et al."
  authorsStructured?: StructuredAuthor[];

  // Publication Info
  publishedDate?: string; // ISO date string
  year?: number;
  journalName?: string;
  conferenceName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  publicationType?:
    | "journal"
    | "conference"
    | "preprint"
    | "book"
    | "thesis"
    | "report"
    | "web";

  // Content
  abstract?: string;
  excerpt?: string; // 150-300 word excerpt focusing on query relevance
  fullContent?: string; // Full text if available

  // AI-Generated Insights
  highlights: string[]; // 3-6 key highlights relevant to query
  relevanceScore: number; // 0.0-1.0 based on query match
  suggestedSections: string[]; // e.g., ["Introduction", "Methods", "Literature Review"]
  relevanceExplanation?: string; // Why this paper is relevant

  // Metrics
  citationCount?: number;
  influentialCitationCount?: number;

  // Access
  openAccessUrl?: string;
  pdfUrl?: string;
  isOpenAccess: boolean;

  // Quality Metrics
  completenessScore: number; // 0.0-1.0 calculated from field weights
  missingFields: string[]; // List of missing critical fields

  // Metadata
  source:
    | "perplexity"
    | "semanticscholar"
    | "crossref"
    | "openalex"
    | "arxiv"
    | "pubmed";
  enrichedFrom?: string[]; // APIs used for enrichment
  lastEnrichedAt?: string; // ISO date string
}

// =============================================================================
// Research Query
// =============================================================================

export interface DeepResearchQuery {
  // Core Query
  query: string;

  // Filters
  maxPapers?: number; // Default: 20, Max: 100
  yearRange?: {
    start?: number;
    end?: number;
  };
  minRelevance?: number; // 0.0-1.0, Default: 0.5
  minCompleteness?: number; // 0.0-1.0, Default: 0.7

  // Options
  requireDOI?: boolean; // Only return papers with DOI
  requireAbstract?: boolean; // Only return papers with abstract
  preferOpenAccess?: boolean; // Prioritize open access papers

  // Academic Filters
  publicationTypes?: (
    | "journal"
    | "conference"
    | "preprint"
    | "book"
    | "thesis"
  )[];
  excludeDomains?: string[]; // Domains to exclude
  includeDomains?: string[]; // Only include these domains

  // Advanced
  expandQuery?: boolean; // Use synonyms and related terms
  maxIterations?: number; // Default: 3
  targetCompleteness?: number; // Quality threshold to stop, Default: 0.85
}

// =============================================================================
// Quality Report
// =============================================================================

export interface FieldCompletenessReport {
  field: string;
  weight: number;
  presentCount: number;
  totalCount: number;
  percentage: number;
}

export interface QualityReport {
  // Overall Metrics
  totalPapers: number;
  averageCompleteness: number;
  averageRelevance: number;

  // Field-Level Breakdown
  fieldCompleteness: FieldCompletenessReport[];

  // Critical Fields (weighted heavily)
  papersWithDOI: number;
  papersWithAbstract: number;
  papersWithAuthors: number;
  papersWithYear: number;

  // Important Fields
  papersWithJournal: number;
  papersWithCitations: number;
  papersWithOpenAccess: number;
  papersWithHighlights: number;

  // Quality Distribution
  highQualityPapers: number; // >= 0.85
  mediumQualityPapers: number; // 0.70 - 0.84
  lowQualityPapers: number; // < 0.70

  // Recommendations
  improvementSuggestions: string[];
}

// =============================================================================
// Iteration Tracking
// =============================================================================

export interface IterationResult {
  iteration: number;
  strategy: IterationStrategy;
  query: string; // Query used for this iteration
  expandedQueries?: string[]; // Additional queries for aggressive strategy

  // Results
  papersFound: number;
  papersEnriched: number;
  newPapersAdded: number; // Papers not found in previous iterations

  // Quality
  qualityBefore: number;
  qualityAfter: number;
  qualityImprovement: number;

  // Timing
  startedAt: string;
  completedAt: string;
  durationMs: number;

  // Decision
  shouldContinue: boolean;
  stopReason?: "quality_met" | "max_iterations" | "no_improvement" | "error";
}

// =============================================================================
// Research Result
// =============================================================================

export interface DeepResearchResult {
  // Status
  status: ResearchStatus;
  success: boolean;

  // Query Info
  originalQuery: string;
  effectiveQueries: string[]; // All queries used across iterations

  // Results
  papers: DeepResearchPaper[];
  totalFound: number;
  totalReturned: number;

  // Quality
  qualityReport: QualityReport;
  meetsQualityThreshold: boolean;

  // Iteration Details
  iterations: IterationResult[];
  totalIterations: number;
  finalStrategy: IterationStrategy;

  // Performance
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;

  // Cost Tracking
  estimatedCost?: {
    perplexity: number;
    claude: number;
    semanticScholar: number; // Usually free
    total: number;
  };

  // Errors (if any)
  errors?: Array<{
    stage: string;
    message: string;
    timestamp: string;
  }>;
}

// =============================================================================
// Streaming Progress Updates
// =============================================================================

export interface ResearchProgressUpdate {
  type: "progress" | "result" | "error";
  timestamp: string;

  // Progress Details
  stage?: ResearchStatus;
  message?: string;

  // Iteration Progress
  currentIteration?: number;
  maxIterations?: number;

  // Paper Progress
  papersFound?: number;
  papersEnriched?: number;
  papers?: PartialDeepResearchPaper[];
  currentQuality?: number;
  targetQuality?: number;

  // Final Result (when type === "result")
  result?: DeepResearchResult;

  // Error (when type === "error")
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

// =============================================================================
// Completeness Calculation Weights
// =============================================================================

export const COMPLETENESS_WEIGHTS = {
  // Critical Fields (60% total)
  title: 0.1,
  authors: 0.1,
  publishedDate: 0.1,
  doi: 0.15,
  abstract: 0.15,

  // Important Fields (30% total)
  journalName: 0.08,
  citationCount: 0.07,
  openAccessUrl: 0.08,
  highlights: 0.07,

  // Nice-to-have Fields (10% total)
  publisher: 0.03,
  excerpt: 0.03,
  suggestedSections: 0.02,
  relevanceScore: 0.02,
} as const;

// =============================================================================
// Quality Thresholds
// =============================================================================

export const QUALITY_THRESHOLDS = {
  excellent: 0.95,
  good: 0.85,
  acceptable: 0.8,
  minimum: 0.7,

  // Iteration Thresholds
  stopIfAbove: 0.8, // Stop iterating if quality >= 80% (target completeness)
  acceptableIfAbove: 0.7, // Accept best effort if quality >= this after max iterations
} as const;

// =============================================================================
// Zod Schemas for Runtime Validation
// =============================================================================

export const StructuredAuthorSchema = z.object({
  first: z.string().min(1),
  last: z.string().min(1),
  middle: z.string().optional(),
  affiliation: z.string().optional(),
  orcid: z.string().optional(),
});

export const DeepResearchQuerySchema = z.object({
  query: z.string().min(3, "Query must be at least 3 characters"),
  maxPapers: z.number().min(1).max(100).default(20),
  yearRange: z
    .object({
      start: z.number().min(1900).max(2100).optional(),
      end: z.number().min(1900).max(2100).optional(),
    })
    .optional(),
  minRelevance: z.number().min(0).max(1).default(0.5),
  minCompleteness: z.number().min(0).max(1).default(0.7),
  requireDOI: z.boolean().default(false),
  requireAbstract: z.boolean().default(false),
  preferOpenAccess: z.boolean().default(false),
  publicationTypes: z
    .array(z.enum(["journal", "conference", "preprint", "book", "thesis"]))
    .optional(),
  excludeDomains: z.array(z.string()).optional(),
  includeDomains: z.array(z.string()).optional(),
  expandQuery: z.boolean().default(true),
  maxIterations: z.number().min(1).max(5).default(3),
  targetCompleteness: z.number().min(0).max(1).default(0.85),
});

export const DeepResearchPaperSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  url: z.string().url(),
  doi: z.string().optional(),
  arxivId: z.string().optional(),
  pubmedId: z.string().optional(),
  isbn: z.string().optional(),
  authors: z.string(),
  authorsStructured: z.array(StructuredAuthorSchema).optional(),
  publishedDate: z.string().optional(),
  year: z.number().optional(),
  journalName: z.string().optional(),
  conferenceName: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  publisher: z.string().optional(),
  publicationType: z
    .enum([
      "journal",
      "conference",
      "preprint",
      "book",
      "thesis",
      "report",
      "web",
    ])
    .optional(),
  abstract: z.string().optional(),
  excerpt: z.string().optional(),
  fullContent: z.string().optional(),
  highlights: z.array(z.string()).default([]),
  relevanceScore: z.number().min(0).max(1),
  suggestedSections: z.array(z.string()).default([]),
  relevanceExplanation: z.string().optional(),
  citationCount: z.number().optional(),
  influentialCitationCount: z.number().optional(),
  openAccessUrl: z.string().url().optional(),
  pdfUrl: z.string().url().optional(),
  isOpenAccess: z.boolean().default(false),
  completenessScore: z.number().min(0).max(1),
  missingFields: z.array(z.string()).default([]),
  source: z.enum([
    "perplexity",
    "semanticscholar",
    "crossref",
    "openalex",
    "arxiv",
    "pubmed",
  ]),
  enrichedFrom: z.array(z.string()).optional(),
  lastEnrichedAt: z.string().optional(),
});

// =============================================================================
// Type Guards
// =============================================================================

export function isDeepResearchPaper(obj: unknown): obj is DeepResearchPaper {
  return DeepResearchPaperSchema.safeParse(obj).success;
}

export function isDeepResearchQuery(obj: unknown): obj is DeepResearchQuery {
  return DeepResearchQuerySchema.safeParse(obj).success;
}

// =============================================================================
// Utility Types
// =============================================================================

export type DeepResearchQueryInput = z.input<typeof DeepResearchQuerySchema>;
export type DeepResearchQueryParsed = z.output<typeof DeepResearchQuerySchema>;

// Partial paper for intermediate processing
export type PartialDeepResearchPaper = Partial<DeepResearchPaper> & {
  id: string;
  title: string;
  url: string;
};

// Paper update for enrichment merging
export type PaperEnrichmentUpdate = Partial<
  Omit<DeepResearchPaper, "id" | "title" | "url">
>;

// =============================================================================
// Streaming Event Types (Granular Paper-Level Events)
// =============================================================================

export type ResearchEventType =
  | "connected"
  | "phase"           // Phase transitions
  | "paper_found"     // Paper discovered (partial data)
  | "paper_enriching" // Paper being enriched
  | "paper_complete"  // Paper fully processed & saved
  | "paper_failed"    // Paper failed validation
  | "tokens_low"      // Token warning
  | "tokens_exhausted"// Tokens ran out
  | "progress"        // Keep for backwards compat
  | "result"
  | "error"
  | "done";

export type ResearchPhase =
  | "idle"
  | "searching"
  | "found"
  | "enriching"
  | "validating"
  | "complete"
  | "error";

export interface PaperStreamEvent {
  type: "paper_found" | "paper_enriching" | "paper_complete" | "paper_failed";
  paperId: string;
  paper: PartialDeepResearchPaper;
  enrichmentField?: string;  // "authors" | "doi" | "abstract" etc
  message?: string;
}

export interface PhaseEvent {
  type: "phase";
  phase: ResearchPhase;
  message: string;
  count?: number;
  topic?: string;
}

export interface TokenEvent {
  type: "tokens_low" | "tokens_exhausted";
  tokensRemaining: number;
  tokensUsed: number;
  papersSaved: number;
}

export interface StreamConnectedEvent {
  type: "connected";
  message: string;
  query: string;
  config: {
    maxPapers: number;
    maxIterations: number;
    targetCompleteness: number;
  };
}

export interface StreamDoneEvent {
  type: "done";
  message: string;
  success: boolean;
  totalPapers: number;
  quality: number;
  iterations: number;
  durationMs: number;
  papersSaved?: number;
}

export interface StreamErrorEvent {
  type: "error";
  code: string;
  message: string;
  retryable: boolean;
  timestamp?: string;
}

export interface StreamResultEvent {
  type: "result";
  success: boolean;
  data: DeepResearchResult;
}

// Union type for all streaming events
export type StreamingResearchEvent =
  | StreamConnectedEvent
  | PhaseEvent
  | PaperStreamEvent
  | TokenEvent
  | ResearchProgressUpdate
  | StreamResultEvent
  | StreamErrorEvent
  | StreamDoneEvent;
