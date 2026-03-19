import { AcademicLevel, ACADEMIC_LEVEL_CONFIGS } from "@/lib/types/document";
import {
  ACADEMIC_PERSONAS,
  BURSTINESS_GUIDELINES,
  PERPLEXITY_GUIDELINES,
  PHRASE_ENFORCEMENT,
  PUNCTUATION_GUIDELINES,
  getHumanizationContextForLevel,
  getBannedPhrasesList,
  getEmDashReductionHint,
  getEmDashGuidance,
  analyzeEmDashUsage,
  detectChatGPTFingerprint,
  EM_DASH_BAN,
} from "@/lib/config/humanization";

/**
 * Humanization Prompt Utilities
 *
 * Functions to build and inject humanization instructions into AI prompts
 * at various levels of detail for different writing contexts.
 */

// ============================================
// FULL SYSTEM INSTRUCTIONS (Most Detailed)
// ============================================

/**
 * Build comprehensive humanization system instructions
 * Use in system prompts for full document generation
 */
export function buildHumanizationSystemInstructions(
  academicLevel: AcademicLevel
): string {
  return `
=== AI HUMANIZATION DIRECTIVES ===

CRITICAL: Apply these humanization techniques to reduce AI detection scores while maintaining academic quality.

${getHumanizationContextForLevel(academicLevel)}

${BURSTINESS_GUIDELINES}

${PERPLEXITY_GUIDELINES}

${PHRASE_ENFORCEMENT}

BANNED PHRASES TO NEVER USE:
${getBannedPhrasesList()}

${PUNCTUATION_GUIDELINES}

QUALITY CHECKLIST BEFORE GENERATION:
1. ✓ No banned phrases in output
2. ✓ Sentence lengths vary (short/medium/long mix)
3. ✓ At least 70-80% active voice
4. ✓ Specific details and numbers included
5. ✓ Natural transitions, not formulaic
6. ✓ Matches ${ACADEMIC_PERSONAS[academicLevel].name}
`;
}

// ============================================
// MEDIUM REMINDERS (Balanced Detail)
// ============================================

/**
 * Build humanization reminder for user prompts
 * Use before content generation to reinforce key points
 */
export function buildHumanizationReminder(academicLevel: AcademicLevel): string {
  const persona = ACADEMIC_PERSONAS[academicLevel];

  return `
HUMANIZATION REMINDER:
- Write in the voice of: ${persona.name}
- Vary sentence lengths (short, medium, long)
- Use specific examples and numbers
- Avoid banned phrases: no "Furthermore", "delve", "landscape", "In conclusion", etc.
- Aim for natural, human-like writing with appropriate imperfection
- Mix sentence structures - don't be formulaic
`;
}

// ============================================
// MINIMAL HINTS (Lightweight)
// ============================================

/**
 * Get minimal humanization hint for short-form content
 * Use in improve/explain routes where space is limited
 */
export function getMinimalHumanizationHint(): string {
  return `Write naturally with varied sentence lengths. Avoid: "Furthermore", "Moreover", "delve", "landscape", "In conclusion". NEVER use em-dashes (—) - use commas, parentheses, or colons instead.`;
}

// ============================================
// INJECTION FUNCTIONS
// ============================================

/**
 * Inject humanization guidelines into an existing system message
 * Appends to the end of provided message
 */
export function injectHumanization(
  existingMessage: string,
  academicLevel: AcademicLevel
): string {
  const humanizationBlock = buildHumanizationSystemInstructions(academicLevel);
  return `${existingMessage}\n\n${humanizationBlock}`;
}

/**
 * Inject minimal humanization hint into an existing message
 * Use for lighter-weight integrations
 */
export function injectMinimalHumanization(existingMessage: string): string {
  const hint = getMinimalHumanizationHint();
  return `${existingMessage}\n\n${hint}`;
}

// ============================================
// CONTEXT BUILDERS (For different scenarios)
// ============================================

/**
 * Build humanization context for chapter/section generation
 * Include academic level and full guidelines
 */
export function buildChapterHumanizationContext(
  academicLevel: AcademicLevel
): string {
  return `
CHAPTER/SECTION WRITING GUIDELINES:

${getHumanizationContextForLevel(academicLevel)}

TECHNIQUES FOR THIS SECTION:
- Vary opening sentences (don't start multiple paragraphs the same way)
- Mix paragraph lengths - not every paragraph is 3-4 sentences
- Use transition phrases sparingly - allow ideas to flow naturally
- Include at least one specific example or data point
- Check that no sentences are too similar in length to the previous one

${BURSTINESS_GUIDELINES}
`;
}

/**
 * Build humanization context for report section generation
 * Professional and direct tone
 */
export function buildReportSectionHumanizationContext(): string {
  return `
REPORT SECTION WRITING GUIDELINES:

- Tone: Direct, professional, action-oriented
- Sentence mix: More short sentences for clarity (30-35% short, 50% medium, 15-20% long)
- Active voice: 80%+ of sentences
- Avoid: Corporate clichés, buzzwords, overused phrases
- Include: Specific findings, recommendations, business impact
- Vary transitions - sometimes just start a new sentence with the key point
`;
}

/**
 * Build humanization context for improvement/editing
 * Lightweight but effective
 */
export function buildImprovementHumanizationContext(): string {
  return `
EDITING GUIDELINES:
- Vary sentence structures in the revision
- Replace any corporate/academic clichés
- Use more active voice
- Add specifics where possible
- Check for: "Furthermore", "Moreover", "delve", "landscape" - replace if found
`;
}

// ============================================
// PROMPT TEMPLATES (Ready-to-use snippets)
// ============================================

/**
 * Get a reusable sentence structure variation prompt
 * Insert into any generation prompt for variety emphasis
 */
export function getSentenceVariationPrompt(): string {
  return `
SENTENCE STRUCTURE VARIATION:
Create sentences with different lengths and structures:
- Start some with nouns: "Research shows..."
- Start some with verbs: "Analysis revealed..."
- Start some with adverbs: "Significantly, the data..."
- Start some with phrases: "Based on these findings..."
- Include occasional short sentences for impact: "This matters."
- Include complex sentences with subordinate clauses.
Mix these throughout - don't follow a pattern.
`;
}

/**
 * Get a reusable specificity emphasis prompt
 */
export function getSpecificityPrompt(): string {
  return `
SPECIFICITY REQUIREMENT:
- Use numbers: "23% of respondents" not "many respondents"
- Use specific examples: "Smith et al. (2022) found..." not "research shows"
- Use precise terminology: "18-24 age group" not "younger people"
- Include data points: "from 45 to 58 participants" not "increased"
- Reference specific sources, studies, and findings by name
- Provide concrete details throughout
`;
}

/**
 * Get a reusable phrase checking prompt
 * Reminds AI to check for banned phrases
 */
export function getPhraseCheckingPrompt(): string {
  return `
PHRASE CHECKING:
Before finishing, verify your text contains NONE of these phrases:
${getBannedPhrasesList()}

If you used any of these, rewrite those sentences using alternatives from the list above.
`;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Build a validation checklist to include in prompts
 * Helps AI self-validate before responding
 */
export function buildValidationChecklist(academicLevel: AcademicLevel): string {
  const persona = ACADEMIC_PERSONAS[academicLevel];

  return `
VALIDATION CHECKLIST (check your work):
[ ] No banned phrases used - verified against list
[ ] Sentence lengths vary throughout (not all medium-length)
[ ] Mostly active voice (70-80%)
[ ] Specific examples and numbers included
[ ] Tone matches: ${persona.name}
[ ] No repeated sentence structures
[ ] Natural transitions, not robotic
[ ] No em-dashes overused (max 2 per 500 words)
`;
}

// ============================================
// EM-DASH CONTROL HELPERS
// ============================================

/**
 * Get em-dash reduction hint for minimal insertion
 * Quick reminder about em-dash limits
 */
export function getEmDashHint(): string {
  return getEmDashReductionHint();
}

/**
 * Get full em-dash guidance for detailed control
 */
export function getEmDashFullGuidance(): string {
  return getEmDashGuidance();
}

/**
 * Build em-dash warning for specific word counts
 */
export function buildEmDashWarning(targetWordCount: number): string {
  const allowedCount = Math.ceil((targetWordCount / 500) * 2);
  return `EM-DASH LIMIT: For ~${targetWordCount} words, use maximum ${allowedCount} em-dash${allowedCount === 1 ? "" : "es"}. Prefer periods or semicolons for transitions.`;
}

/**
 * Inject em-dash guidance into existing prompt
 */
export function injectEmDashGuidance(existingMessage: string, targetWordCount?: number): string {
  const guidance = targetWordCount 
    ? buildEmDashWarning(targetWordCount)
    : getEmDashHint();
  return `${existingMessage}\n\n${guidance}`;
}

/**
 * Validate content for em-dash compliance
 * Returns analysis object with compliance status
 */
export function validateEmDashUsage(text: string): {
  analysis: ReturnType<typeof analyzeEmDashUsage>;
  message: string;
  compliant: boolean;
} {
  const analysis = analyzeEmDashUsage(text);
  
  let message = "";
  if (analysis.isCompliant) {
    message = `✓ Em-dash usage compliant: ${analysis.count} em-dashes (limit: ${analysis.limit}) in ${analysis.wordCount} words`;
  } else {
    message = `✗ Em-dash usage EXCEEDS limit: ${analysis.count} em-dashes used (limit: ${analysis.limit}) in ${analysis.wordCount} words. Remove ${analysis.count - analysis.limit} em-dash${analysis.count - analysis.limit === 1 ? "" : "es"}.`;
  }

  return {
    analysis,
    message,
    compliant: analysis.isCompliant,
  };
}

// ============================================
// DIAGNOSTIC HELPERS
// ============================================

/**
 * Generate a prompt snippet that asks AI to explain its humanization approach
 * Useful for debugging or understanding AI compliance
 */
export function getDiagnosticPrompt(): string {
  return `
DIAGNOSTIC: After writing, briefly note:
- How did you vary sentence lengths?
- What specific examples or data did you include?
- Did you avoid all banned phrases?
- How does the tone match the target academic level?
- Em-dash count: How many em-dashes did you use? (target: max 1-2 per 500 words)
`;
}

// ============================================
// ENHANCED WRITING TECHNIQUES
// ============================================

/**
 * Get enhanced writing techniques guidance
 * Addresses ChatGPT fingerprints and human-like patterns
 */
export function getEnhancedWritingTechniques(): string {
  return `
ENHANCED WRITING TECHNIQUES (to match human-written content):

1. EQUIVOCAL LANGUAGE - Show nuance like scientists do:
   Use: "but", "however", "although", "yet", "admittedly"
   Example: "While the results are promising, they should be interpreted carefully."

2. NATURAL CONNECTORS (avoid transitions):
   Use: "that said", "on the flip side", "here's the thing", "look"
   Example: "That said, we should consider alternative explanations."

3. EMOTIONAL VARIATION - Include human emotions:
   Use: Frustration, surprise, strong opinions, uncertainty
   Example: "Surprisingly, the data contradicts previous assumptions."

4. VARIED PARAGRAPH LENGTH - Don't default to 3-4 sentences:
   Mix: 2-sentence paragraphs, 5-paragraph sections, occasional single-sentence emphasis
   Example: Avoid uniform 3-4 sentence blocks

5. RHETORICAL QUESTIONS - Break declarative monotony:
   Use: "What does this mean?", "How should we interpret this?"
   Example: "But what accounts for this discrepancy?"

6. MINOR IMPERFECTIONS - Sound more human:
   Use: Starting sentences with "And", "But", fragments
   Example: "And yet. The evidence suggests otherwise."

7. CONTRACTIONS - Show conversational tone:
   Use: "doesn't" vs "does not", "I'm" vs "I am"
   Example: "This doesn't necessarily mean the theory is wrong."

8. AVOID CHATGPT FINGERPRINT:
   NEVER have 3+ AI-flagged phrases in a single paragraph
   If detected, rewrite the paragraph completely
`;
}

/**
 * Detect and warn about ChatGPT fingerprints
 */
export function buildChatGPTFingerprintWarning(): string {
  return `
⚠️ CHATGPT FINGERPRINT WARNING:
Never use 3+ AI-flagged phrases in a single paragraph. If detected, rewrite completely.

Flagged phrases include:
- "plays a significant role in shaping"
- "has sparked", "has ignited", "has been acknowledged"
- "groundbreaking advancement", "transformative power"
- "unlocking the potential", "paving the way for"
- And 20+ other high-frequency AI patterns

Check each paragraph - if 3+ patterns appear, that's a ChatGPT fingerprint!
`;
}

/**
 * Build comprehensive enhanced humanization guidance
 */
export function buildEnhancedHumanizationGuidance(academicLevel: AcademicLevel): string {
  return `
${buildHumanizationSystemInstructions(academicLevel)}

${getEnhancedWritingTechniques()}

${buildChatGPTFingerprintWarning()}
`;
}

// ============================================
// EXPORT SUMMARY
// ============================================

/**
 * Get all humanization utilities as a single object
 * Useful for import/export or dependency injection
 */
/**
 * Get compact humanization rules for system messages
 * Used in chapter generation where humanization should be in system message, not user prompt
 */
export function getCompactHumanizationSystemRules(academicLevel: AcademicLevel): string {
  const levelConfig = ACADEMIC_LEVEL_CONFIGS[academicLevel];

  return `Your writing demonstrates:
- ${levelConfig.analysisStyle}
- Natural sentence variation (mix short, medium, long)
- Active voice (70-80%)
- Specific data points and examples over vague claims
- No em-dashes — use commas, parentheses, or colons
- None of these words: "Furthermore", "Moreover", "delve", "landscape", "tapestry", "multifaceted", "myriad", "plethora", "pivotal", "crucial"
- No 3+ AI-flagged phrases per paragraph

Write with authority. Every claim supported by evidence.`;
}

export const HumanizationUtilities = {
  buildHumanizationSystemInstructions,
  buildHumanizationReminder,
  getMinimalHumanizationHint,
  injectHumanization,
  injectMinimalHumanization,
  buildChapterHumanizationContext,
  buildReportSectionHumanizationContext,
  buildImprovementHumanizationContext,
  getSentenceVariationPrompt,
  getSpecificityPrompt,
  getPhraseCheckingPrompt,
  buildValidationChecklist,
  getDiagnosticPrompt,
  getEmDashHint,
  getEmDashFullGuidance,
  buildEmDashWarning,
  injectEmDashGuidance,
  validateEmDashUsage,
  // NEW: Enhanced techniques and ChatGPT fingerprint detection
  getEnhancedWritingTechniques,
  buildChatGPTFingerprintWarning,
  buildEnhancedHumanizationGuidance,
};

