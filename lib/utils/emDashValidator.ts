/**
 * Em-Dash Content Validator
 * 
 * Post-generation validation tool to check content for em-dash compliance
 * Use after AI generation to ensure humanization standards are met
 */

import {
  countEmDashes,
  analyzeEmDashUsage,
  getEmDashLimit,
  detectChatGPTFingerprint,
} from "@/lib/config/humanization";

export interface EmDashValidationResult {
  isValid: boolean;
  count: number;
  limit: number;
  wordCount: number;
  density: number; // em-dashes per 500 words
  violation: number; // How many em-dashes over limit (0 if compliant)
  message: string;
  suggestions: string[];
}

/**
 * Comprehensive validation result including all humanization checks
 */
export interface ComprehensiveValidationResult {
  emDashCompliant: boolean;
  chatGPTFingerprintDetected: boolean;
  bannedPhrasesFound: number;
  overall: "PASS" | "FAIL";
  details: {
    emDashes: { count: number; limit: number };
    fingerprintParagraphs: number;
    bannedPhraseCount: number;
  };
  suggestions: string[];
}

/**
 * Validate content for em-dash compliance
 */
export function validateEmDashCompliance(
  text: string,
  targetWordCount?: number
): EmDashValidationResult {
  const count = countEmDashes(text);
  const analysis = analyzeEmDashUsage(text);
  const limit = getEmDashLimit(analysis.wordCount);
  const violation = Math.max(0, count - limit);

  const suggestions: string[] = [];

  if (!analysis.isCompliant) {
    suggestions.push(`Remove ${violation} em-dash${violation === 1 ? "" : "es"} to comply with the limit of ${limit}`);

    if (count > 0) {
      suggestions.push("Review uses of em-dashes and replace with periods, semicolons, or commas where possible");
      suggestions.push("Em-dashes should only be used for genuine emphasis or clarification, not as default transitions");
    }

    if (analysis.density > 4) {
      suggestions.push(`Current density is ${analysis.density.toFixed(1)} em-dashes per 500 words - drastically reduce usage`);
    } else if (analysis.density > 2) {
      suggestions.push(`Current density is ${analysis.density.toFixed(1)} em-dashes per 500 words - reduce to 2 or below`);
    }
  } else {
    suggestions.push("✓ Em-dash usage is compliant with humanization standards");
  }

  return {
    isValid: analysis.isCompliant,
    count,
    limit,
    wordCount: analysis.wordCount,
    density: analysis.density,
    violation,
    message: analysis.isCompliant
      ? `✓ Compliant: ${count} em-dash${count === 1 ? "" : "es"} (limit: ${limit}) in ${analysis.wordCount} words`
      : `✗ Non-compliant: ${count} em-dashes used (limit: ${limit}) - exceeds by ${violation}`,
    suggestions,
  };
}

/**
 * Get em-dash usage report for debugging
 */
export function getEmDashReport(text: string): {
  summary: string;
  analysis: ReturnType<typeof analyzeEmDashUsage>;
  positions: Array<{ index: number; context: string }>;
  recommendations: string;
} {
  const analysis = analyzeEmDashUsage(text);
  const positions: Array<{ index: number; context: string }> = [];

  // Find all em-dash positions
  const emDashRegex = /—|(?:—(?!—))|(?:—{2})|(?:--)/g;
  let match;

  while ((match = emDashRegex.exec(text)) !== null) {
    const start = Math.max(0, match.index - 30);
    const end = Math.min(text.length, match.index + 30);
    const context = text.substring(start, end).replace(/\n/g, " ");

    positions.push({
      index: match.index,
      context: `...${context}...`,
    });
  }

  let recommendations = "";
  if (analysis.isCompliant) {
    recommendations = "Content meets em-dash compliance standards.";
  } else {
    const excess = analysis.count - analysis.limit;
    recommendations = `Remove ${excess} em-dash${excess === 1 ? "" : "es"} to meet compliance. Consider these replacements:\n`;
    recommendations += "- Replace em-dashes with periods for full stops\n";
    recommendations += "- Replace em-dashes with semicolons for close connections\n";
    recommendations += "- Replace em-dashes with commas for brief asides\n";
    recommendations += "- Use parentheses for clarifications instead of em-dashes";
  }

  return {
    summary: `Found ${analysis.count} em-dashes in ${analysis.wordCount} words (density: ${analysis.density.toFixed(1)} per 500 words)`,
    analysis,
    positions,
    recommendations,
  };
}

/**
 * Highlight em-dash usage in text (useful for debugging)
 * Wraps em-dashes with markers: [EM-DASH]
 */
export function highlightEmDashes(text: string): string {
  return text.replace(/—|(?:—(?!—))|(?:—{2})|(?:--)/g, "[EM-DASH]");
}

/**
 * Generate a detailed compliance report for content
 */
export function generateComplianceReport(
  content: string,
  contentName: string = "Content"
): string {
  const validation = validateEmDashCompliance(content);
  const report = getEmDashReport(content);

  let reportText = `
=== EM-DASH COMPLIANCE REPORT ===
Content: ${contentName}

SUMMARY:
${report.summary}

VALIDATION STATUS:
${validation.message}

COMPLIANCE: ${validation.isValid ? "✓ PASS" : "✗ FAIL"}

RECOMMENDATIONS:
${validation.suggestions.map((s) => `- ${s}`).join("\n")}

DETAILED FINDINGS:
${report.recommendations}

${report.positions.length > 0 ? `\nEM-DASH POSITIONS:\n${report.positions.map((p) => `[Position ${p.index}] ${p.context}`).join("\n")}` : ""}
`;

  return reportText;
}

/**
 * Batch validate multiple content pieces
 */
export function validateMultipleContents(
  contents: Array<{ name: string; text: string }>
): Array<{ name: string; result: EmDashValidationResult }> {
  return contents.map((item) => ({
    name: item.name,
    result: validateEmDashCompliance(item.text),
  }));
}

/**
 * Summary statistics across multiple contents
 */
export function getSummaryStatistics(
  validationResults: Array<{ name: string; result: EmDashValidationResult }>
) {
  const totalCompliant = validationResults.filter((r) => r.result.isValid).length;
  const totalViolations = validationResults.reduce((sum, r) => sum + r.result.violation, 0);
  const avgDensity =
    validationResults.reduce((sum, r) => sum + r.result.density, 0) / validationResults.length;

  return {
    totalItems: validationResults.length,
    compliantItems: totalCompliant,
    complianceRate: `${((totalCompliant / validationResults.length) * 100).toFixed(1)}%`,
    totalViolations,
    averageDensity: avgDensity.toFixed(2),
    allCompliant: totalCompliant === validationResults.length,
  };
}

/**
 * Comprehensive validation for all humanization rules including ChatGPT fingerprint detection
 * Checks: em-dashes, ChatGPT fingerprints, banned phrases
 */
export function comprehensiveHumanizationCheck(
  text: string,
  targetWordCount?: number
): ComprehensiveValidationResult {
  const emDashAnalysis = validateEmDashCompliance(text, targetWordCount);
  const fingerprintAnalysis = detectChatGPTFingerprint(text);

  const suggestions: string[] = [];

  // Check em-dashes
  if (!emDashAnalysis.isValid) {
    suggestions.push(`Remove ${emDashAnalysis.violation} em-dash${emDashAnalysis.violation === 1 ? "" : "es"}`);
  }

  // Check ChatGPT fingerprint
  if (fingerprintAnalysis.hasFingerprint) {
    suggestions.push(`${fingerprintAnalysis.paragraphsWithViolation} paragraph(s) have 3+ AI-flagged phrases - rewrite these completely`);
    fingerprintAnalysis.details.forEach((detail) => {
      suggestions.push(`Paragraph ${detail.paragraph}: Found phrases: ${detail.phrases.slice(0, 3).join(", ")}`);
    });
  }

  const overall: "PASS" | "FAIL" = emDashAnalysis.isValid && !fingerprintAnalysis.hasFingerprint ? "PASS" : "FAIL";

  return {
    emDashCompliant: emDashAnalysis.isValid,
    chatGPTFingerprintDetected: fingerprintAnalysis.hasFingerprint,
    bannedPhrasesFound: fingerprintAnalysis.paragraphsWithViolation,
    overall,
    details: {
      emDashes: {
        count: emDashAnalysis.count,
        limit: emDashAnalysis.limit,
      },
      fingerprintParagraphs: fingerprintAnalysis.paragraphsWithViolation,
      bannedPhraseCount: fingerprintAnalysis.details.reduce((sum, d) => sum + d.count, 0),
    },
    suggestions,
  };
}


