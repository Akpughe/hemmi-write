import { TableOfContents } from "./document";

export interface WritingBrief {
  topic: string;
  instructions?: string;
  documentType: "research-paper" | "essay" | "report";
  academicLevel:
    | "high-school"
    | "undergraduate"
    | "graduate"
    | "doctoral"
    | "professional";
  writingStyle:
    | "analytical"
    | "argumentative"
    | "descriptive"
    | "expository"
    | "narrative";
  citationStyle?: "APA" | "MLA" | "HARVARD" | "CHICAGO" | "IEEE";
  wordCount?: number;
  sourceCount?: number;
  chapters?: number;
  includeSources?: boolean;
  aiProvider?: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  snippet: string;
  author?: string;
  publishedDate?: string;
  selected: boolean;

  // Academic metadata
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  year?: number;
  publisher?: string;
  publicationType?: string;
  authorsStructured?: Array<{
    first: string;
    last: string;
    middle?: string;
  }>;
}

export interface OutlineSection {
  id: string;
  title: string;
  keyPoints: string[];
  estimatedWordCount?: number;
  status: "pending" | "writing" | "review" | "complete";
}

export interface DocumentPlan {
  title: string;
  approach: string;
  tone: string;
  sections: OutlineSection[];
  tableOfContents?: TableOfContents;
}

export type WorkflowStep = "research" | "planning" | "writing" | "complete";
