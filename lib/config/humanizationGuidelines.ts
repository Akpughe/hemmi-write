/**
 * AI Humanization Guidelines
 *
 * Central repository for humanization rules to avoid AI-sounding writing.
 * Based on 2025 research on AI detection patterns and natural human writing.
 *
 * Last updated: 2025-12-04
 * Research sources: Rolling Stone, Plagiarism Today, MIT Technology Review, etc.
 */

import { AcademicLevel, DocumentType } from "@/lib/types/document";

/**
 * Patterns and phrases that make text look AI-generated
 */
export const AI_DETECTION_AVOIDANCE = {
  /**
   * Banned opening phrases that scream "AI wrote this"
   */
  BANNED_PHRASES: [
    "In today's world",
    "In the ever-evolving landscape",
    "In the ever-changing landscape",
    "It is worth noting that",
    "This is due to the fact that",
    "Interestingly enough",
    "Many experts agree that",
    "In conclusion",
    "Last but not least",
    "At the end of the day",
    "It goes without saying",
    "Needless to say",
    "In this day and age",
    "In this modern era",
    "As we move forward",
  ],

  /**
   * Overused AI words that appear too frequently in generated text
   */
  OVERUSED_WORDS: [
    "delve",
    "landscape",
    "tapestry",
    "comprehensive",
    "insightful",
    "nuanced",
    "pivotal",
    "crucial",
    "robust",
    "leverage",
    "facilitate",
    "utilize",
    "paradigm",
    "synergy",
    "holistic",
    "cutting-edge",
    "game-changer",
    "transformative",
    "seamless",
    "innovative",
  ],

  /**
   * Robotic transitions that signal AI writing
   */
  ROBOTIC_TRANSITIONS: [
    "Furthermore",
    "Moreover",
    "In addition",
    "Additionally",
    "Consequently",
    "Nevertheless",
    "Nonetheless",
    "Henceforth",
    "Heretofore",
    "Notwithstanding",
  ],
};

/**
 * Humanization techniques with specific instructions
 */
export const HUMANIZATION_TECHNIQUES = {
  SENTENCE_VARIETY: {
    instruction:
      "Vary sentence length dramatically. Mix short punchy sentences (5-8 words) with longer complex ones (20-30 words). Avoid monotonous rhythm.",
    rationale:
      "AI tends to produce similar-length sentences in predictable patterns",
  },

  BURSTINESS: {
    instruction:
      "Create burstiness: follow predictable sentences with unexpected structures. Use occasional fragments. Questions? Yes. Vary paragraph lengths too.",
    rationale:
      "Low burstiness (uniform sentence length) is a key AI detection metric",
  },

  ACTIVE_VOICE: {
    instruction:
      "Prefer active voice in 70-80% of sentences. Use 'Researchers conducted' not 'The study was conducted by researchers'.",
    rationale: "AI defaults to passive voice more than humans do",
  },

  NATURAL_TRANSITIONS: {
    instruction:
      "Use natural transitions instead of robotic 'Furthermore', 'Moreover'",
    alternatives: [
      "This suggests",
      "Building on this",
      "The evidence shows",
      "Notably",
      "What's interesting is",
      "Consider this",
      "This reveals",
      "The data indicates",
      "Looking at this",
      "From this we see",
    ],
    rationale: "Robotic transitions are a major AI tell",
  },

  SPECIFICITY: {
    instruction:
      "Replace generic descriptions with specific facts. Say '23% reduction' not 'significant decrease'. Use concrete numbers and examples.",
    rationale:
      "AI tends toward vague, generic descriptions instead of specific details",
  },

  EM_DASH_USAGE: {
    instruction:
      "Avoid em-dashes (—) where commas, parentheses, or colons work better. Use sparingly (max 1-2 per 1000 words).",
    rationale:
      "ChatGPT and similar models overuse em-dashes in places where humans would use commas or parentheses",
  },

  KEYWORD_STUFFING: {
    instruction:
      "Don't repeat the same keywords or phrases unnaturally. Use varied phrasing and synonyms.",
    rationale: "AI tools tend to overuse keywords, making text sound robotic",
  },
};

/**
 * Configuration for humanization by academic level
 */
export interface HumanizationLevel {
  formality: "high" | "medium" | "low";
  personalElements: boolean;
  rhetoricalQuestionsAllowed: boolean;
  toneDescription: string;
}

/**
 * Academic level-specific humanization configs
 * Balances natural writing with appropriate scholarly tone
 */
export const HUMANIZATION_BY_ACADEMIC_LEVEL: Record<
  AcademicLevel,
  HumanizationLevel
> = {
  [AcademicLevel.UNDERGRADUATE]: {
    formality: "medium",
    personalElements: true,
    rhetoricalQuestionsAllowed: true,
    toneDescription:
      "Clear, accessible, moderately formal but not robotic. Explain concepts naturally without sounding like a textbook AI.",
  },

  [AcademicLevel.GRADUATE]: {
    formality: "high",
    personalElements: true,
    rhetoricalQuestionsAllowed: true,
    toneDescription:
      "Scholarly and rigorous, but not detached. Show critical thinking voice with phrases like 'we argue', 'our analysis reveals'. Sound like an engaged researcher, not an information-assembly bot.",
  },

  [AcademicLevel.POSTGRADUATE]: {
    formality: "high",
    personalElements: true,
    rhetoricalQuestionsAllowed: true,
    toneDescription:
      "Authoritative expert voice with subtle personality. Challenge assumptions naturally. Use 'we propose', 'our findings reveal'. Write like a seasoned academic, not a content generator.",
  },

  [AcademicLevel.PROFESSIONAL]: {
    formality: "medium",
    personalElements: true,
    rhetoricalQuestionsAllowed: true,
    toneDescription:
      "Professional but conversational. Clear, direct, action-oriented. Data-driven storytelling with human insight, not corporate jargon assembly.",
  },
};

/**
 * Get full humanization prompt for content generation
 *
 * @param documentType - Type of document being generated
 * @param academicLevel - Academic level for appropriate tone
 * @param includeDetailed - Whether to include full detailed guidelines (true) or compact version (false)
 * @returns Formatted humanization guidelines as string
 */
export function getHumanizationPrompt(
  documentType: DocumentType,
  academicLevel: AcademicLevel,
  includeDetailed: boolean = true
): string {
  const levelConfig = HUMANIZATION_BY_ACADEMIC_LEVEL[academicLevel];

  let prompt = `\n\n--- CRITICAL: WRITE LIKE A HUMAN, NOT AN AI ---\n\n`;

  prompt += `TONE REQUIREMENT: ${levelConfig.toneDescription}\n\n`;

  // What to AVOID
  prompt += `STRICTLY AVOID (AI Detection Patterns):\n`;
  prompt += `- Banned opening phrases: ${AI_DETECTION_AVOIDANCE.BANNED_PHRASES.slice(
    0,
    8
  ).join(", ")}, etc.\n`;
  prompt += `- Overused AI words: ${AI_DETECTION_AVOIDANCE.OVERUSED_WORDS.slice(
    0,
    12
  ).join(", ")}, etc.\n`;
  prompt += `- Robotic transitions: ${AI_DETECTION_AVOIDANCE.ROBOTIC_TRANSITIONS.join(
    ", "
  )}\n`;
  prompt += `- Em-dashes where commas/parentheses work (max 1-2 per 1000 words)\n`;
  prompt += `- Passive voice as default construction\n`;
  prompt += `- Generic vague descriptions ("significant impact" → "23% increase")\n`;
  prompt += `- Keyword stuffing and repetitive phrasing\n`;
  prompt += `- Markdown syntax (*, **, #, --) - use HTML tags instead\n\n`;

  // What to DO
  if (includeDetailed) {
    prompt += `HUMANIZATION TECHNIQUES (Critical for Natural Writing):\n\n`;

    prompt += `1. SENTENCE VARIETY & BURSTINESS:\n`;
    prompt += `   ${HUMANIZATION_TECHNIQUES.SENTENCE_VARIETY.instruction}\n`;
    prompt += `   ${HUMANIZATION_TECHNIQUES.BURSTINESS.instruction}\n`;
    prompt += `   Example: "The study found three key patterns. First, participants showed increased engagement when..." (short + long)\n\n`;

    prompt += `2. ACTIVE VOICE:\n`;
    prompt += `   ${HUMANIZATION_TECHNIQUES.ACTIVE_VOICE.instruction}\n`;
    prompt += `   Good: "Researchers analyzed 200 samples"\n`;
    prompt += `   Bad: "200 samples were analyzed by researchers"\n\n`;

    prompt += `3. NATURAL TRANSITIONS:\n`;
    prompt += `   Instead of robotic "Furthermore/Moreover", use:\n`;
    prompt += `   "${HUMANIZATION_TECHNIQUES.NATURAL_TRANSITIONS.alternatives
      .slice(0, 8)
      .join('", "')}"\n`;
    prompt += `   These flow naturally in human academic writing.\n\n`;

    prompt += `4. SPECIFICITY OVER GENERALITY:\n`;
    prompt += `   ${HUMANIZATION_TECHNIQUES.SPECIFICITY.instruction}\n`;
    prompt += `   Good: "Costs decreased by 23% over six months"\n`;
    prompt += `   Bad: "There was a significant decrease in costs"\n\n`;

    prompt += `5. VARIED VOCABULARY:\n`;
    prompt += `   ${HUMANIZATION_TECHNIQUES.KEYWORD_STUFFING.instruction}\n`;
    prompt += `   Don't repeat "the study shows" five times - vary it.\n\n`;

    prompt += `6. HTML FORMATTING (NOT MARKDOWN):\n`;
    prompt += `   - Use <strong>bold text</strong> NOT **bold**\n`;
    prompt += `   - Use <em>italic text</em> NOT *italic*\n`;
    prompt += `   - Use <h1>, <h2>, <h3> for headings NOT # or ##\n`;
    prompt += `   - Use proper em-dash HTML entity (&mdash;) or just avoid overusing them\n`;
    prompt += `   - Paragraphs wrapped in <p> tags with proper line breaks\n\n`;
  } else {
    // Compact version
    prompt += `KEY TECHNIQUES:\n`;
    prompt += `- ${HUMANIZATION_TECHNIQUES.SENTENCE_VARIETY.instruction}\n`;
    prompt += `- ${HUMANIZATION_TECHNIQUES.ACTIVE_VOICE.instruction}\n`;
    prompt += `- Use natural transitions: "${HUMANIZATION_TECHNIQUES.NATURAL_TRANSITIONS.alternatives
      .slice(0, 5)
      .join('", "')}"\n`;
    prompt += `- Be specific and concrete, not generic\n`;
    prompt += `- Vary vocabulary, avoid keyword stuffing\n`;
    prompt += `- Use HTML tags (<strong>, <em>, <h1>) NOT markdown (*, **, #)\n\n`;
  }

  // Level-specific allowances
  if (levelConfig.personalElements) {
    prompt += `- Personal academic voice encouraged: Use "we", "our research", "this study" naturally\n`;
  }
  if (levelConfig.rhetoricalQuestionsAllowed) {
    prompt += `- Rhetorical questions allowed strategically for engagement\n`;
  }

  prompt += `\nCRITICAL: Write like a knowledgeable human scholar with personality and insight, not like an AI assembling information. Show critical thinking, not just information organization.\n`;

  return prompt;
}

/**
 * Get compact humanization guidance for system messages
 *
 * @param academicLevel - Academic level for appropriate tone
 * @returns Compact humanization guidelines as string
 */
export function getCompactHumanizationGuidance(
  academicLevel: AcademicLevel
): string {
  const levelConfig = HUMANIZATION_BY_ACADEMIC_LEVEL[academicLevel];

  return `
HUMANIZATION REQUIREMENTS (Avoid AI Detection):
Tone: ${levelConfig.toneDescription}

Critical patterns to avoid:
- Opening phrases: ${AI_DETECTION_AVOIDANCE.BANNED_PHRASES.slice(0, 4).join(
    ", "
  )}, etc.
- Overused words: ${AI_DETECTION_AVOIDANCE.OVERUSED_WORDS.slice(0, 8).join(
    ", "
  )}, etc.
- Robotic transitions: ${AI_DETECTION_AVOIDANCE.ROBOTIC_TRANSITIONS.slice(
    0,
    4
  ).join(", ")}, etc.

Write naturally:
- Vary sentence length dramatically (mix short 5-8 word sentences with long 20-30 word ones)
- Use active voice (70-80% of sentences)
- Natural transitions ("This suggests", "Notably"), not "Furthermore"/"Moreover"
- Be specific and concrete ("23% reduction"), not generic ("significant decrease")
- Show critical thinking voice, not just information assembly
- Use HTML formatting (<strong>, <em>, <h1>) NOT markdown (*, **, #)
${
  levelConfig.personalElements
    ? '- Use personal academic voice: "we", "our research", "this study"'
    : ""
}
`.trim();
}
