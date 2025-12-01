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
}

export interface OutlineSection {
  id: string;
  title: string;
  keyPoints: string[];
  status: "pending" | "writing" | "review" | "complete";
}

export interface DocumentPlan {
  title: string;
  approach: string;
  tone: string;
  sections: OutlineSection[];
}

export type WorkflowStep = "research" | "planning" | "writing" | "complete";
