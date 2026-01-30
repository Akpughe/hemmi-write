import { AcademicLevel } from "@/lib/types/document";

/**
 * AI Detection Reduction Configuration
 *
 * This module contains banned phrases, alternative suggestions, and writing guidelines
 * to humanize AI-generated content and reduce detection by AI detection tools.
 */

// ============================================
// BANNED PHRASES (NEVER USE)
// ============================================

export const BANNED_PHRASES = {
  openers: [
    "In today's world",
    "In this day and age",
    "In the ever-evolving landscape",
    "Since the dawn of time",
    "It is commonly known that",
    "As we all know",
    "In this modern era",
    "Nowadays",
    "Currently",
    "At the present time",
    "In an era where",
    "As we navigate",
  ],
  transitions: [
    "Furthermore",
    "Moreover",
    "Additionally",
    "Consequently",
    "It is worth noting",
    "In addition",
    "As a matter of fact",
    "In light of this",
    "That said",
    "It should be noted",
    "It goes without saying",
    "Needless to say",
  ],
  vocabulary: [
    "delve",
    "landscape",
    "tapestry",
    "multifaceted",
    "myriad",
    "plethora",
    "pivotal",
    "crucial",
    "holistic",
    "synergy",
    "leverage",
    "robust",
    "seamlessly",
    "cutting-edge",
    "groundbreaking",
    "revolutionary",
    "unprecedented",
    "paradigm shift",
    "state-of-the-art",
    "next-generation",
    "transformative",
    "paramount",
    "essential",
    // NEW: Extended AI-flagged vocabulary (from 100+ word study)
    "meticulous",
    "meticulously",
    "navigating",
    "complexities",
    "realm",
    "dive",
    "shall",
    "tailored",
    "towards",
    "underpins",
    "everchanging",
    "ever-evolving",
    "embark",
    "journey",
    "daunting",
    "elevate",
    "unleash",
    "power",
    "rapidly",
    "expanding",
    "mastering",
    "excels",
    "harness",
    "underscore",
    "foster",
    "endeavor",
    "enlighten",
    "esteemed",
    "treasure trove",
    "testament",
    "peril",
    "amplify",
    "beacon",
    "convey",
    "resonate",
    "interplay",
    "adhere",
    "profound",
    "indelible",
    "bespoke",
    "cognizant",
    "encompass",
    "hitherto",
    "utilize",
  ],
  conclusions: [
    "In conclusion",
    "To sum up",
    "All in all",
    "At the end of the day",
    "In summary",
    "To conclude",
    "Finally",
    "In essence",
    "When all is said and done",
    "Moving forward",
    "Going forward",
  ],
  intensifiers: [
    "very",
    "really",
    "truly",
    "quite",
    "rather",
    "extremely",
    "incredibly",
    "absolutely",
  ],
  // NEW: High-frequency AI phrases (207x+ more common in AI)
  highFrequencyAI: [
    "plays a significant role in shaping",
    "has sparked",
    "has ignited",
    "has been acknowledged",
    "the rising influence of",
    "the growing importance of",
    "it is important to note that",
    "this serves as a reminder that",
  ],
  // NEW: Agentless passive constructions (ChatGPT fingerprint)
  agentlessPassives: [
    "has been shown to",
    "has been demonstrated",
    "has been proven",
    "is considered to be",
    "is widely regarded as",
  ],
  // NEW: AI-flagged phrase patterns (avoid entirely)
  aiPhrasePatterns: [
    "aims to bridge",
    "aims to democratize",
    "aims to foster innovation",
    "becomes increasingly evident",
    "breakthrough has the potential to revolutionize",
    "by harnessing the power",
    "continue to push the boundaries",
    "exciting possibilities",
    "exciting opportunities",
    "exploring new frontiers",
    "groundbreaking advancement",
    "groundbreaking study",
    "groundbreaking technology",
    "have come a long way in recent years",
    "implications are profound",
    "it remains to be seen",
    "opens up exciting possibilities",
    "paving the way for",
    "possibilities are endless",
    "revolutionizing the way",
    "significant step forward",
    "significant milestone",
    "transformative power",
    "unlocking the power",
    "unlocking the potential",
    "shed light",
  ],
};

// ============================================
// PHRASE ALTERNATIVES (USE INSTEAD)
// ============================================

export const PHRASE_ALTERNATIVES: Record<string, string[]> = {
  // Openers
  "In today's world": ["Today", "Currently", "Now", "Right now"],
  "In this day and age": ["Today", "At this time"],
  "In the ever-evolving landscape": ["In this field", "In this area"],
  "Since the dawn of time": [
    "Historically",
    "Throughout history",
    "For centuries",
  ],
  "It is commonly known that": [
    "Most recognize that",
    "It's widely accepted that",
  ],
  "As we all know": ["As most understand", "Generally"],

  // Transitions
  Furthermore: [
    "Beyond this",
    "Building on this point",
    "This connects to",
    "Also",
    "Next",
    "Another key point",
  ],
  Moreover: [
    "Also worth noting",
    "A related point",
    "Similarly",
    "In the same way",
    "Equally important",
  ],
  Additionally: ["Also", "Plus", "Further", "Alongside this", "Notably"],
  Consequently: [
    "As a result",
    "This led to",
    "This means",
    "This caused",
    "Because of this",
  ],
  "It is worth noting": [
    "Note that",
    "Worth mentioning",
    "Importantly",
    "Significantly",
  ],

  // Vocabulary
  delve: ["examine", "explore", "investigate", "look at", "analyze", "study"],
  landscape: ["field", "area", "domain", "space", "context", "sector"],
  tapestry: ["collection", "mix", "combination", "fabric", "range"],
  multifaceted: ["complex", "many-sided", "varied", "diverse"],
  myriad: ["many", "numerous", "countless", "a range of"],
  plethora: ["abundance", "wealth", "many", "a lot of"],
  pivotal: ["key", "central", "critical", "turning point"],
  crucial: ["important", "key", "significant", "central", "vital"],
  holistic: ["complete", "comprehensive", "whole", "full"],
  synergy: ["cooperation", "combined effect", "interaction", "collaboration"],
  leverage: ["use", "apply", "utilize", "employ"],
  robust: ["strong", "solid", "reliable", "sturdy"],
  seamlessly: ["smoothly", "easily", "without issues"],
  "cutting-edge": ["latest", "new", "modern", "advanced"],
  groundbreaking: ["significant", "important", "novel", "new"],
  revolutionary: ["major", "significant", "transformative"],
  unprecedented: ["new", "never before seen", "first of its kind"],
  "paradigm shift": ["major change", "fundamental shift", "new approach"],
  "state-of-the-art": ["current best", "most advanced", "latest"],

  // Conclusions
  "In conclusion": ["In short", "To recap", "To summarize"],
  "To sum up": ["In summary", "Briefly"],
  "All in all": ["Overall", "On balance"],
  "At the end of the day": ["Ultimately", "In the end"],
};

// ============================================
// WRITING GUIDELINES
// ============================================

export const BURSTINESS_GUIDELINES = `
SENTENCE LENGTH VARIATION (Critical for humanization):
- Target mix: 20% short (5-10 words), 50% medium (11-20), 30% long (21-35)
- Examples:
  * Short: "This changed everything."
  * Medium: "The research revealed significant findings about the topic."
  * Long: "By combining multiple methodologies and analyzing the resulting data through both qualitative and quantitative frameworks, researchers discovered previously unknown patterns."

SENTENCE STRUCTURE VARIETY:
- Start with different parts of speech: nouns, verbs, adverbs, prepositional phrases, subordinate clauses
- Avoid starting every sentence with "The", "Researchers", "Studies", "This"
- Mix simple, compound, and complex sentences
- Occasional fragments for emphasis (when appropriate): "Absolutely critical. Often overlooked."

PARAGRAPH VARIATION:
- Mix paragraph lengths: some 2-3 sentences, some 5-7 sentences
- Don't maintain uniform paragraph structure throughout
- Allow short paragraphs for emphasis
`;

export const PERPLEXITY_GUIDELINES = `
WORD CHOICE & SPECIFICITY:
- Use unexpected but accurate word pairings
- Include field-specific jargon naturally (don't overuse)
- Prefer concrete specifics over vague generalities:
  * BAD: "a significant increase"
  * GOOD: "a 23% increase" or "increased from 45 to 58 participants"
- Use numbers and specific data points when possible
- Reference specific studies, not just "research shows"

VOICE & NATURAL LANGUAGE:
- Occasional grammar "breaks" (starting with "And", "But")
- Natural contractions in appropriate contexts
- Allow minor imperfections if they sound more human
- Avoid perfect transitions between every sentence
- Let ideas flow naturally, not robotically

ACTIVE VS PASSIVE:
- Target 70-80% active voice construction
- Use passive only when needed for emphasis or when agent is unknown
`;

export const PHRASE_ENFORCEMENT = `
PHRASE USAGE RULES:
- NEVER use banned phrases - every instance should be replaced with alternatives
- Vary the alternatives used - don't repeat the same replacement
- Check output against banned phrase list before completion
- Build phrase checking into prompts with explicit examples
`;

// ============================================
// ACADEMIC LEVEL PERSONAS
// ============================================

export interface HumanizationPersona {
  name: string;
  voiceCharacteristics: string;
  allowedElements: string[];
  sentenceMix: {
    short: number; // percentage
    medium: number;
    long: number;
  };
  emphasis: string;
}

export const ACADEMIC_PERSONAS: Record<AcademicLevel, HumanizationPersona> = {
  [AcademicLevel.UNDERGRADUATE]: {
    name: "Engaged Student Voice",
    voiceCharacteristics:
      "Clear, inquisitive, shows the learning journey. More conversational than formal.",
    allowedElements: [
      "Contractions (don't, isn't, it's)",
      "Occasional casual phrasing",
      "Direct questions to reader",
      "Personal learning moments",
      "Conversational transitions",
    ],
    sentenceMix: { short: 25, medium: 50, long: 25 },
    emphasis:
      "Clarity and accessibility over academic formality. Show curiosity and engagement with material.",
  },

  [AcademicLevel.GRADUATE]: {
    name: "Confident Academic Voice",
    voiceCharacteristics:
      "Professional yet engaged. Critical but not dismissive. Synthesizes sources with confidence.",
    allowedElements: [
      "Subtle contractions (in appropriate contexts)",
      "Field-specific terminology used naturally",
      "Analytical questions",
      "Synthesizing language",
      "Academic but varied transitions",
    ],
    sentenceMix: { short: 20, medium: 50, long: 30 },
    emphasis:
      "Balance between academic rigor and natural human writing. Demonstrate synthesis and critical thinking.",
  },

  [AcademicLevel.POSTGRADUATE]: {
    name: "Authoritative Scholarly Voice",
    voiceCharacteristics:
      "Authoritative, original, contributes to field. Sophisticated but not pretentious.",
    allowedElements: [
      "Rare, sophisticated contractions (in direct statements)",
      "Complex technical terminology",
      "Nuanced discussion of limitations",
      "Original analytical insights",
      "Precise, varied academic transitions",
    ],
    sentenceMix: { short: 15, medium: 45, long: 40 },
    emphasis:
      "Demonstrate mastery and original contribution. Engage deeply with existing literature and propose new perspectives.",
  },

  [AcademicLevel.PROFESSIONAL]: {
    name: "Direct Business Voice",
    voiceCharacteristics:
      "Action-oriented, practical, results-focused. Concise and direct without jargon.",
    allowedElements: [
      "Natural contractions",
      "Business idioms and metaphors",
      "Direct recommendations",
      "Practical examples",
      "Efficient transitions",
      "Short, punchy sentences",
    ],
    sentenceMix: { short: 35, medium: 50, long: 15 },
    emphasis:
      "Practicality and actionability. Clear recommendations and business impact. No unnecessary complexity.",
  },
};

// ============================================
// PUNCTUATION RULES
// ============================================

export const PUNCTUATION_GUIDELINES = `
EM-DASH USAGE (CRITICAL - COMPLETE BAN):
⚠️ NEVER USE EM-DASHES (—) IN ANY GENERATED CONTENT ⚠️
- Em-dashes (—) are a PRIMARY AI DETECTION FINGERPRINT
- AI models overuse em-dashes where humans use commas or parentheses
- Human writing avoids em-dashes in professional/academic contexts
- Replace ALL em-dashes with one of these alternatives:

REPLACEMENTS FOR EM-DASHES:
1. Use COMMAS for brief asides:
   WRONG: "The study—which was groundbreaking—showed..."
   RIGHT: "The study, which was groundbreaking, showed..."

2. Use PARENTHESES for clarifications:
   WRONG: "The results—conducted over three years—were clear"
   RIGHT: "The results (conducted over three years) were clear"

3. Use COLONS for explanations:
   WRONG: "After analysis—we found a pattern"
   RIGHT: "After analysis: we found a pattern"

4. Use PERIODS for complete thoughts:
   WRONG: "The data showed X—the conclusion was Y"
   RIGHT: "The data showed X. The conclusion was Y"

5. Use SEMICOLONS for close connections:
   WRONG: "The study was rigorous—results were clear"
   RIGHT: "The study was rigorous; results were clear"

SEMICOLON USAGE:
- Use sparingly - max 2-3 per 1000 words
- Don't use to simply connect closely related sentences
- Use only when connection is genuinely important

EXCLAMATION MARKS:
- Avoid completely (makes content sound informal)
- Occasional question marks for rhetorical effect are okay

COMMA USAGE:
- Vary comma patterns
- Don't use Oxford commas consistently (vary style)
`;

// ============================================
// EM-DASH DETECTION & BAN SYSTEM
// ============================================

/**
 * ⚠️ EM-DASH BAN: NEVER use em-dashes (—) in generated content
 * This is a PRIMARY AI DETECTION FINGERPRINT
 * Replace with: commas, parentheses, colons, periods, or semicolons
 */
export const EM_DASH_BAN = true; // Global flag: em-dashes are completely banned

/**
 * Get the ban status for em-dashes (for backward compatibility)
 * @param wordCount - Unused parameter kept for backward compatibility
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getEmDashLimit(wordCount: number): number {
  // Em-dashes are now BANNED entirely, not limited
  // This function returns 0 to indicate zero em-dashes allowed
  return 0;
}

/**
 * Count em-dashes in text (handles different em-dash representations)
 * Matches: — (em-dash), – (en-dash when used as em-dash), -- (double hyphen)
 */
export function countEmDashes(text: string): number {
  const emDashPattern = /—|(?:—(?!—))|(?:—{2})|(?:--)/g;
  const matches = text.match(emDashPattern) || [];
  return matches.length;
}

/**
 * Analyze em-dash usage (returns ban status, not compliance)
 * Em-dashes are now completely banned (limit = 0)
 */
export function analyzeEmDashUsage(text: string): {
  count: number;
  wordCount: number;
  density: number; // em-dashes per 500 words
  limit: number;
  isCompliant: boolean;
} {
  const count = countEmDashes(text);
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  const density = (count / wordCount) * 500;
  const limit = 0; // Zero em-dashes allowed (complete ban)
  const isCompliant = count === 0; // Only compliant if NO em-dashes found

  return {
    count,
    wordCount,
    density,
    limit,
    isCompliant,
  };
}

/**
 * Get em-dash ban warning for prompts
 * CRITICAL: Em-dashes are a PRIMARY AI detection fingerprint
 */
export function getEmDashReductionHint(): string {
  return `⚠️ CRITICAL: NEVER use em-dashes (—) in any generated content. This is a PRIMARY AI detection fingerprint. Replace with: commas, parentheses, colons, periods, or semicolons instead.`;
}

/**
 * Get detailed em-dash ban guidance for prompts
 * Em-dashes are completely banned - not limited
 */
export function getEmDashGuidance(): string {
  return `
⚠️ EM-DASH BAN (CRITICAL FOR AI DETECTION):

RULE: NEVER USE EM-DASHES (—) IN ANY GENERATED CONTENT

Why? Em-dashes are a PRIMARY AI DETECTION FINGERPRINT. AI models overuse em-dashes
where human writers use commas or parentheses. This is one of the top ChatGPT fingerprints.

REPLACEMENTS (Use ALWAYS):

1. COMMAS for brief asides:
   ✗ WRONG: "The study—which was groundbreaking—showed results"
   ✓ RIGHT: "The study, which was groundbreaking, showed results"

2. PARENTHESES for clarifications:
   ✗ WRONG: "The results—conducted over three years—reveal trends"
   ✓ RIGHT: "The results (conducted over three years) reveal trends"

3. COLONS for explanations:
   ✗ WRONG: "After analysis—we discovered patterns"
   ✓ RIGHT: "After analysis: we discovered patterns"

4. PERIODS for complete thoughts:
   ✗ WRONG: "The data showed X—the conclusion was Y"
   ✓ RIGHT: "The data showed X. The conclusion was Y"

5. SEMICOLONS for close connections:
   ✗ WRONG: "The study was rigorous—results were clear"
   ✓ RIGHT: "The study was rigorous; results were clear"

VERIFICATION: Check your output for ANY instances of — or -- and replace them immediately.
`;
}

// ============================================
// OVERALL HUMANIZATION STRATEGY
// ============================================

export const HUMANIZATION_SUMMARY = `
KEY PRINCIPLES:
1. PHRASE ENFORCEMENT: Replace all banned phrases with alternatives
2. SENTENCE VARIATION: Mix sentence lengths to create natural rhythm (avoid ChatGPT's 16-19 word average)
3. SPECIFICITY: Use concrete details, numbers, and specific examples
4. VOICE CONSISTENCY: Match academic level persona throughout
5. NATURAL FLOW: Allow imperfect transitions and unexpected connections
6. ACTIVE VOICE: Prefer active construction (70-80%)
7. NO EM-DASHES: Never use em-dashes (—) - use commas, parentheses, colons instead
8. EQUIVOCAL LANGUAGE: Use "but", "however", "although" to show nuance
9. NATURAL CONNECTORS: Use "that said", "on the flip side", "here's the thing"
10. EMOTIONAL VARIATION: Include occasional frustration, surprise, strong opinions
11. VARIED PARAGRAPH LENGTH: Don't default to 3-4 sentences per paragraph
12. RHETORICAL QUESTIONS: Mix in to break declarative monotony
13. FIELD AUTHENTICITY: Use domain-specific terminology naturally
14. AVOID CHATGPT FINGERPRINT: Never have 3+ AI-flagged phrases in one paragraph

TRANSFORMATION TARGETS:
- Reduce perplexity scores (word choice unpredictability)
- Increase burstiness (sentence length variation)
- Decrease AI detection triggers (formulaic patterns)
- Eliminate ChatGPT writing fingerprints
- Maintain readability and academic standards
- Keep content coherent and well-structured
`;

// ============================================
// HELPER FUNCTION
// ============================================

/**
 * Get the humanization guidelines for a specific academic level
 */
export function getHumanizationContextForLevel(
  academicLevel: AcademicLevel
): string {
  const persona = ACADEMIC_PERSONAS[academicLevel];

  return `
WRITING VOICE: ${persona.name}
${persona.voiceCharacteristics}

ALLOWED ELEMENTS:
${persona.allowedElements.map((el) => `- ${el}`).join("\n")}

TARGET SENTENCE MIX:
- Short sentences (5-10 words): ${persona.sentenceMix.short}%
- Medium sentences (11-20 words): ${persona.sentenceMix.medium}%
- Long sentences (21-35+ words): ${persona.sentenceMix.long}%

EMPHASIS: ${persona.emphasis}
`;
}

/**
 * Get all banned phrases as a flat string for prompt injection
 */
export function getBannedPhrasesList(): string {
  const allBanned = [
    ...BANNED_PHRASES.openers,
    ...BANNED_PHRASES.transitions,
    ...BANNED_PHRASES.vocabulary,
    ...BANNED_PHRASES.conclusions,
    ...BANNED_PHRASES.intensifiers,
  ];

  return allBanned
    .map((phrase) => {
      const alternatives = PHRASE_ALTERNATIVES[phrase];
      const altText = alternatives ? ` → use: ${alternatives[0]}` : "";
      return `- "${phrase}"${altText}`;
    })
    .join("\n");
}

/**
 * Detect ChatGPT fingerprint: 3+ AI-flagged phrases per paragraph
 * This is a CRITICAL detection pattern from recent research
 */
export function detectChatGPTFingerprint(text: string): {
  hasFingerprint: boolean;
  paragraphsWithViolation: number;
  details: Array<{ paragraph: number; count: number; phrases: string[] }>;
} {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const allAIFlaggedPhrases = [
    ...(BANNED_PHRASES.highFrequencyAI || []),
    ...(BANNED_PHRASES.aiPhrasePatterns || []),
  ];

  const details: Array<{
    paragraph: number;
    count: number;
    phrases: string[];
  }> = [];
  let paragraphsWithViolation = 0;

  paragraphs.forEach((paragraph, index) => {
    const lowerParagraph = paragraph.toLowerCase();
    const foundPhrases: string[] = [];

    allAIFlaggedPhrases.forEach((phrase) => {
      if (lowerParagraph.includes(phrase.toLowerCase())) {
        foundPhrases.push(phrase);
      }
    });

    if (foundPhrases.length >= 3) {
      paragraphsWithViolation++;
      details.push({
        paragraph: index + 1,
        count: foundPhrases.length,
        phrases: foundPhrases,
      });
    }
  });

  return {
    hasFingerprint: paragraphsWithViolation > 0,
    paragraphsWithViolation,
    details,
  };
}

/**
 * Check if a text contains banned phrases
 * Returns array of found phrases with their positions
 */
export function checkForBannedPhrases(text: string): Array<{
  phrase: string;
  count: number;
  category: string;
}> {
  const found: Array<{ phrase: string; count: number; category: string }> = [];
  const lowerText = text.toLowerCase();

  const checkCategory = (category: keyof typeof BANNED_PHRASES) => {
    BANNED_PHRASES[category].forEach((phrase) => {
      const escapedPhrase = phrase.replaceAll(
        /[.*+?^${}()|[\]\\]/g,
        String.raw`\$&`
      );
      const regexPattern = String.raw`\b${escapedPhrase}\b`;
      const regex = new RegExp(regexPattern, "gi");
      const matches = lowerText.match(regex);
      if (matches) {
        found.push({
          phrase,
          count: matches.length,
          category,
        });
      }
    });
  };

  checkCategory("openers");
  checkCategory("transitions");
  checkCategory("vocabulary");
  checkCategory("conclusions");
  checkCategory("intensifiers");
  checkCategory("highFrequencyAI");
  checkCategory("agentlessPassives");
  checkCategory("aiPhrasePatterns");

  return found;
}

// ============================================
// ACADEMIC DATASETS INTEGRATION
// ============================================

/**
 * Dataset-enhanced markers note:
 * Import from lib/config/datasets.ts for markers from academic datasets:
 * - AIGTxt: 10,821 scientific texts
 * - LLMTrace: Large-scale bilingual corpus
 * - NYT Comprehensive: 58,000 multi-LLM samples
 *
 * Usage: import { getAllAIMarkers } from "@/lib/config/datasets"
 */
export function getDatasetEnhancedMarkers(): Array<{
  phrase: string;
  source: string;
  confidence: number;
}> {
  // Returns empty array - implement in humanizationPrompt.ts
  // to avoid circular imports and lazy-load datasets
  return [];
}

/**
 * Get markers specifically from academic datasets combined with our current markers
 */
export function getCombinedAIMarkers(): string[] {
  const currentMarkers = new Set<string>();

  // Add all current banned phrases
  Object.values(BANNED_PHRASES).forEach((categoryValue) => {
    if (Array.isArray(categoryValue)) {
      categoryValue.forEach((phrase: string) => {
        currentMarkers.add(phrase.toLowerCase());
      });
    } else if (typeof categoryValue === "object" && categoryValue !== null) {
      Object.values(categoryValue).forEach((subcategoryValue) => {
        if (Array.isArray(subcategoryValue)) {
          subcategoryValue.forEach((phrase: string) => {
            currentMarkers.add(phrase.toLowerCase());
          });
        }
      });
    }
  });

  // Add dataset markers
  getDatasetEnhancedMarkers().forEach((marker) => {
    currentMarkers.add(marker.phrase.toLowerCase());
  });

  return Array.from(currentMarkers);
}
