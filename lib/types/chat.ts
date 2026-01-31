// Chat-specific types for inline citations

export type SourceType = 'web' | 'pdf' | 'journal' | 'news' | 'book' | 'video' | 'other';

export interface ChatCitation {
  number: number;
  title: string;
  url: string;
  snippet: string;
  hostname: string;
  sourceType?: SourceType;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: ChatCitation[];
}

export interface ChatResponse {
  role: "assistant";
  content: string;
  citations?: ChatCitation[];
}

export interface ChatContext {
  topic: string;
  documentType: string;
  academicLevel?: string;
  writingStyle?: string;
}
