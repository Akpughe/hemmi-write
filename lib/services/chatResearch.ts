// Chat Research Service
// Smart detection and Perplexity search for chat questions

import { perplexityService } from "./perplexityService";
import { ChatCitation, ChatContext } from "@/lib/types/chat";

/**
 * Keywords that indicate a question needs factual research
 */
const RESEARCH_TRIGGERS = [
  // Question starters
  "what is",
  "what are",
  "who is",
  "who are",
  "when did",
  "when was",
  "where is",
  "where are",
  "why is",
  "why are",
  "how does",
  "how do",
  "how is",
  "how are",
  "explain",
  "describe",
  "define",
  "tell me about",
  "what does",
  // Research-related
  "research",
  "study",
  "studies",
  "evidence",
  "statistics",
  "data",
  "findings",
  "according to",
  "source",
  "reference",
  "cite",
  "citation",
  // Information seeking
  "information about",
  "details about",
  "facts about",
  "background on",
  "history of",
  "overview of",
  "examples of",
  "types of",
  "benefits of",
  "advantages of",
  "disadvantages of",
  "pros and cons",
  "comparison",
  "difference between",
];

/**
 * Keywords that indicate NO research is needed
 */
const SKIP_RESEARCH_PATTERNS = [
  // Greetings
  /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
  // Simple acknowledgments
  /^(thanks|thank you|ok|okay|got it|understood|sure|yes|no)/i,
  // Document editing requests
  /^(edit|change|modify|update|fix|correct|replace|remove|delete|add to|insert)/i,
  // Formatting requests
  /^(format|reformat|make it|rewrite|rephrase|shorten|lengthen|summarize this|expand this)/i,
  // Clarifications about the document
  /^(what do you mean|can you clarify|i meant|i mean|actually|wait)/i,
  // Meta questions about the assistant
  /^(can you|are you able|do you|will you|could you help)/i,
];

/**
 * Extract domain hostname from URL
 */
function extractHostname(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * Determine if a question needs external research
 */
export function needsResearch(question: string): boolean {
  const lowerQuestion = question.toLowerCase().trim();

  // Check if it matches skip patterns
  for (const pattern of SKIP_RESEARCH_PATTERNS) {
    if (pattern.test(lowerQuestion)) {
      return false;
    }
  }

  // Check if it contains research triggers
  for (const trigger of RESEARCH_TRIGGERS) {
    if (lowerQuestion.includes(trigger)) {
      return true;
    }
  }

  // Check if it's a question (ends with ?)
  if (question.trim().endsWith("?")) {
    // Questions longer than 20 chars are likely factual
    if (question.length > 20) {
      return true;
    }
  }

  // Default: don't research short messages or unclear intents
  return false;
}

/**
 * Research a chat question using Perplexity
 */
export async function researchChatQuestion(
  question: string,
  context?: ChatContext
): Promise<ChatCitation[]> {
  // Build search query with context
  let searchQuery = question;

  // Add topic context if available for more relevant results
  if (context?.topic) {
    // Only add context if question doesn't already mention the topic
    if (!question.toLowerCase().includes(context.topic.toLowerCase())) {
      searchQuery = `${context.topic}: ${question}`;
    }
  }

  console.log(`Researching chat question: ${searchQuery}`);

  try {
    // Use Perplexity for quick search
    const results = await perplexityService.search(searchQuery, {
      maxResults: 5,
    });

    if (!results || results.length === 0) {
      console.log("No research results found");
      return [];
    }

    // Convert to ChatCitation format with numbering
    const citations: ChatCitation[] = results.map((result, index) => ({
      number: index + 1,
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      hostname: extractHostname(result.url),
    }));

    console.log(`Found ${citations.length} citations for chat`);
    return citations;
  } catch (error: any) {
    console.error("Chat research failed:", error.message);
    return [];
  }
}

/**
 * Format citations for inclusion in the system prompt
 */
export function formatCitationsForPrompt(citations: ChatCitation[]): string {
  if (citations.length === 0) {
    return "";
  }

  const formatted = citations
    .map(
      (c) =>
        `[${c.number}] ${c.title} (${c.hostname})\n   ${c.snippet}`
    )
    .join("\n\n");

  return `\n\nRESEARCH SOURCES (use [1], [2], etc. to cite):\n${formatted}`;
}
