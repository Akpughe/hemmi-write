// Type definitions for the autonomous writing tool

export enum DocumentType {
  REPORT = "REPORT",
  RESEARCH_PAPER = "RESEARCH_PAPER",
  ESSAY = "ESSAY",
}

export enum CitationStyle {
  APA = "APA",
  MLA = "MLA",
  HARVARD = "HARVARD",
  CHICAGO = "CHICAGO",
}

export enum AcademicLevel {
  UNDERGRADUATE = "UNDERGRADUATE",
  GRADUATE = "GRADUATE", // DEFAULT
  POSTGRADUATE = "POSTGRADUATE",
  PROFESSIONAL = "PROFESSIONAL",
}

export interface AcademicLevelConfig {
  level: AcademicLevel;
  label: string;
  description: string;
  icon: string;
  citationsPerSection: string;
  technicalDepth: "moderate" | "high" | "very-high";
  analysisStyle: string;
}

export enum WritingStyle {
  ANALYTICAL = "ANALYTICAL",
  ARGUMENTATIVE = "ARGUMENTATIVE",
  DESCRIPTIVE = "DESCRIPTIVE",
  EXPOSITORY = "EXPOSITORY",
  NARRATIVE = "NARRATIVE",
  TECHNICAL = "TECHNICAL",
}

export interface WritingStyleConfig {
  style: WritingStyle;
  label: string;
  description: string;
  icon: string;
  headingFormat: string;
}

export interface DocumentTypeConfig {
  type: DocumentType;
  label: string;
  description: string;
  citationStyle: CitationStyle;
  structure: string[];
  suggestedWordCountMin: number;
  suggestedWordCountMax: number;
  icon: string;
}

export interface ResearchSource {
  id: string;
  title: string;
  url: string;
  author?: string;
  publishedDate?: string;
  excerpt: string;
  score?: number;
  selected: boolean;
}

export interface ResearchRequest {
  topic: string;
  documentType: DocumentType;
  numSources?: number;
}

export interface ResearchResponse {
  sources: ResearchSource[];
  query: string;
  error?: string;
}

export interface DocumentSection {
  heading: string;
  description: string;
  keyPoints: string[];
  estimatedWordCount?: number; // NEW: Target word count for this chapter/section
}

export interface TableOfContents {
  items: TOCItem[];
}

export interface TOCItem {
  level: number;
  title: string;
  sectionNumber?: string;
}

export interface DocumentStructure {
  title: string;
  approach: string; // Overall writing approach/methodology
  tone: string; // Writing tone (formal, conversational, etc.)
  sections: DocumentSection[];
  estimatedWordCount: number;
  tableOfContents?: TableOfContents; // NEW: Auto-generated TOC for research papers
}

export interface StructureRequest {
  documentType: DocumentType;
  topic: string;
  instructions?: string;
  sources: ResearchSource[];
  wordCount?: number;
  userFeedback?: string; // For regeneration with adjustments
  academicLevel?: AcademicLevel; // NEW: Only for research papers
  writingStyle?: WritingStyle; // NEW: Only for research papers
  aiProvider?: string; // AI model provider (GROQ or GEMINI)
}

export interface StructureResponse {
  structure: DocumentStructure;
  error?: string;
}

export interface GenerateRequest {
  documentType: DocumentType;
  topic: string;
  instructions?: string;
  sources: ResearchSource[];
  wordCount?: number;
  structure: DocumentStructure; // Now includes approved structure
  academicLevel?: AcademicLevel; // NEW: Only for research papers
  writingStyle?: WritingStyle; // NEW: Only for research papers
  aiProvider?: string; // AI model provider (GROQ or GEMINI)
  blockGeneration?: {
    enabled: boolean;
    currentBlockIndex: number;
    totalBlocks: number;
    sectionsPerBlock: number;
    previousContent?: string; // Context from previous blocks
  };
}

export interface GenerateResponse {
  content: string;
  references: string;
  error?: string;
}

export interface Citation {
  marker: string;
  source: ResearchSource;
  inTextFormat: string;
  referenceFormat: string;
}

// Deep Regeneration Types
export interface FeedbackAnalysis {
  intents: string[]; // ["add_section", "expand_section", "change_tone"]
  specificRequests: string[]; // ["Add case studies", "Expand methodology"]
  knowledgeGaps: string[]; // What information is missing
  searchQueries: string[]; // Targeted search queries to fill gaps
  requiresNewSources: boolean;
}

export interface TargetedSearchResult {
  query: string;
  sources: ResearchSource[];
  rationale: string; // Why this search was performed
}

export interface RegenerationReport {
  feedbackAnalysis: FeedbackAnalysis;
  researchConducted: TargetedSearchResult[];
  newSourcesAdded: ResearchSource[];
  changesSummary: string; // What changed and why
}

export interface DeepRegenerateRequest {
  documentType: DocumentType;
  topic: string;
  instructions: string;
  wordCount: number;
  currentStructure: DocumentStructure;
  existingSources: ResearchSource[];
  userFeedback: string;
}

export interface DeepRegenerateResponse {
  structure: DocumentStructure;
  regenerationReport: RegenerationReport;
  error?: string;
}

// Document type configurations mapping
export const DOCUMENT_TYPE_CONFIGS: Record<DocumentType, DocumentTypeConfig> = {
  [DocumentType.RESEARCH_PAPER]: {
    type: DocumentType.RESEARCH_PAPER,
    label: "Research Paper",
    description: "Academic research paper with methodology and analysis",
    citationStyle: CitationStyle.APA,
    structure: [
      "Abstract",
      "Introduction",
      "Methods",
      "Results",
      "Discussion",
      "References",
    ],
    suggestedWordCountMin: 2000,
    suggestedWordCountMax: 100000,
    icon: "📄",
  },
  [DocumentType.ESSAY]: {
    type: DocumentType.ESSAY,
    label: "Essay",
    description: "Analytical or argumentative essay",
    citationStyle: CitationStyle.MLA,
    structure: ["Introduction", "Body Paragraphs", "Conclusion", "Works Cited"],
    suggestedWordCountMin: 500,
    suggestedWordCountMax: 5000,
    icon: "📝",
  },
  [DocumentType.REPORT]: {
    type: DocumentType.REPORT,
    label: "Report",
    description: "Structured report with findings and recommendations",
    citationStyle: CitationStyle.HARVARD,
    structure: [
      "Executive Summary",
      "Introduction",
      "Background",
      "Findings",
      "Analysis",
      "Recommendations",
      "Conclusion",
      "References",
    ],
    suggestedWordCountMin: 1000,
    suggestedWordCountMax: 10000,
    icon: "📊",
  },
};

// Academic level configurations
export const ACADEMIC_LEVEL_CONFIGS: Record<
  AcademicLevel,
  AcademicLevelConfig
> = {
  [AcademicLevel.UNDERGRADUATE]: {
    level: AcademicLevel.UNDERGRADUATE,
    label: "Undergraduate",
    description: "Bachelor's level writing with foundational analysis",
    icon: "🎓",
    citationsPerSection: "2-3",
    technicalDepth: "moderate",
    analysisStyle: "Clear explanation with basic critical analysis",
  },
  [AcademicLevel.GRADUATE]: {
    level: AcademicLevel.GRADUATE,
    label: "Graduate (Masters)",
    description: "Advanced analysis with comprehensive citations",
    icon: "📚",
    citationsPerSection: "3-5",
    technicalDepth: "high",
    analysisStyle: "Critical synthesis with theoretical frameworks",
  },
  [AcademicLevel.POSTGRADUATE]: {
    level: AcademicLevel.POSTGRADUATE,
    label: "Postgraduate (PhD)",
    description: "Original research-level depth and rigor",
    icon: "🔬",
    citationsPerSection: "5-8",
    technicalDepth: "very-high",
    analysisStyle: "Novel contributions with exhaustive literature review",
  },
  [AcademicLevel.PROFESSIONAL]: {
    level: AcademicLevel.PROFESSIONAL,
    label: "Professional",
    description: "Business-focused, actionable, and concise",
    icon: "mj",
    citationsPerSection: "minimal",
    technicalDepth: "moderate",
    analysisStyle: "Data-driven insights with strategic recommendations",
  },
};

// Writing style configurations
export const WRITING_STYLE_CONFIGS: Record<WritingStyle, WritingStyleConfig> = {
  [WritingStyle.ANALYTICAL]: {
    style: WritingStyle.ANALYTICAL,
    label: "Analytical",
    description: "Focuses on analyzing and interpreting data or texts",
    icon: "🔍",
    headingFormat: "standard",
  },
  [WritingStyle.ARGUMENTATIVE]: {
    style: WritingStyle.ARGUMENTATIVE,
    label: "Argumentative",
    description: "Presents arguments and evidence to support a claim",
    icon: "⚖️",
    headingFormat: "standard",
  },
  [WritingStyle.DESCRIPTIVE]: {
    style: WritingStyle.DESCRIPTIVE,
    label: "Descriptive",
    description: "Detailed description of a person, place, or event",
    icon: "🎨",
    headingFormat: "standard",
  },
  [WritingStyle.EXPOSITORY]: {
    style: WritingStyle.EXPOSITORY,
    label: "Expository",
    description: "Explains or informs about a topic",
    icon: "💡",
    headingFormat: "standard",
  },
  [WritingStyle.NARRATIVE]: {
    style: WritingStyle.NARRATIVE,
    label: "Narrative",
    description: "Tells a story or recounts events",
    icon: "📖",
    headingFormat: "minimal",
  },
  [WritingStyle.TECHNICAL]: {
    style: WritingStyle.TECHNICAL,
    label: "Technical",
    description: "Formal and objective technical writing",
    icon: "⚙️",
    headingFormat: "numbered",
  },
};

// Minimum and maximum word count limits for safety
export const MIN_WORD_COUNT = 500;
export const MAX_WORD_COUNT = 100000; // Increased to support PhD dissertations
