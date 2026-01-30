/**
 * Dataset-Enhanced AI Detection Analysis
 *
 * Uses academic datasets to perform advanced AI detection:
 * - LLM-specific fingerprinting
 * - Domain-aware detection
 * - Linguistic feature analysis
 * - Word frequency scoring
 * - Mixed authorship detection
 */

import {
  getAllAIMarkers,
  getDomainMarkers,
  getLLMMarkers,
  estimateLLM,
  getWordFrequencyAIScore,
  hasMixedAuthorshipIndicators,
  LINGUISTIC_PATTERNS,
  AIGTXT_MARKERS,
} from "@/lib/config/datasets";

// ============================================
// LINGUISTIC FEATURE ANALYSIS
// ============================================

export interface LinguisticFeatures {
  averageSentenceLength: number;
  sentenceLengthVariance: number;
  passiveVoicePercentage: number;
  emDashCount: number;
  adverbPercentage: number;
  contractionPercentage: number;
  transitionWordRatio: number;
}

/**
 * Analyze linguistic features of text and compare against known patterns
 */
export function analyzeLinguisticFeatures(text: string): LinguisticFeatures {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const paragraphs = text.split(/\n\n+/);

  // Calculate sentence lengths
  const sentenceLengths = sentences.map(
    (s) => s.split(/\s+/).length
  );
  const avgLength =
    sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length || 0;
  const variance =
    sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
      sentenceLengths.length || 0;

  // Calculate passive voice percentage
  const passivePattern = /\b(am|is|are|was|were|be|been|being)\s+\w+ed\b/gi;
  const passiveMatches = text.match(passivePattern) || [];
  const passivePercentage = (passiveMatches.length / sentences.length) * 100 || 0;

  // Count em-dashes
  const emDashPattern = /—/g;
  const emDashMatches = text.match(emDashPattern) || [];
  const emDashCount = emDashMatches.length;

  // Calculate adverb percentage
  const adverbPattern = /\b\w+ly\b/gi;
  const adverbMatches = text.match(adverbPattern) || [];
  const adverbPercentage = (adverbMatches.length / words.length) * 100 || 0;

  // Calculate contraction percentage
  const contractionPattern = /\b(don't|won't|can't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|doesn't|shouldn't|wouldn't|couldn't|mightn't|mustn't|I'm|you're|he's|she's|it's|we're|they're|I've|you've|we've|they've|I'll|you'll|he'll|she'll|it'll|we'll|they'll)\b/gi;
  const contractionMatches = text.match(contractionPattern) || [];
  const contractionPercentage = (contractionMatches.length / words.length) * 100 || 0;

  // Calculate transition word ratio
  const transitionWords = [
    "furthermore",
    "moreover",
    "additionally",
    "however",
    "nevertheless",
    "consequently",
    "therefore",
    "thus",
    "meanwhile",
    "ultimately",
  ];
  const transitionPattern = new RegExp(
    `\\b(${transitionWords.join("|")})\\b`,
    "gi"
  );
  const transitionMatches = text.match(transitionPattern) || [];
  const transitionRatio = (transitionMatches.length / sentences.length) || 0;

  return {
    averageSentenceLength: avgLength,
    sentenceLengthVariance: Math.sqrt(variance),
    passiveVoicePercentage: passivePercentage,
    emDashCount,
    adverbPercentage,
    contractionPercentage,
    transitionWordRatio: transitionRatio,
  };
}

/**
 * Score text against AI linguistic patterns
 * Returns a score 0-100 where 100 is "most likely AI"
 */
export function scoreLinguisticAILikelihood(text: string): number {
  const features = analyzeLinguisticFeatures(text);
  let score = 0;
  let weightSum = 0;

  // Sentence length analysis (humans: ~16.5, AI: ~19.2)
  const sentenceLengthDiff = Math.abs(
    features.averageSentenceLength - LINGUISTIC_PATTERNS.sentenceLengthHuman.average
  );
  const sentenceLengthScore =
    sentenceLengthDiff < 5
      ? 20 // Close to AI pattern
      : sentenceLengthDiff > 10
        ? 5 // More human
        : 15;
  score += sentenceLengthScore * 1.2;
  weightSum += 1.2;

  // Sentence length variance (humans: 11.2, AI: 6.8)
  const varianceDiff = Math.abs(
    features.sentenceLengthVariance - LINGUISTIC_PATTERNS.sentenceLengthAI.sdv
  );
  const varianceScore =
    varianceDiff < 3
      ? 20 // Consistent like AI
      : varianceDiff > 6
        ? 5 // Variable like humans
        : 15;
  score += varianceScore * 1.5; // More important indicator
  weightSum += 1.5;

  // Passive voice percentage (humans: 12.3%, AI: 22.5%)
  const passiveDiff = Math.abs(
    features.passiveVoicePercentage -
      LINGUISTIC_PATTERNS.passiveVoicePercentageHuman.average
  );
  const passiveScore =
    passiveDiff < 5
      ? 20 // Close to AI
      : passiveDiff > 10
        ? 5 // Like human
        : 15;
  score += passiveScore * 1.3;
  weightSum += 1.3;

  // Em-dash usage (humans: 1.1 per 1000 words, AI: 4.2)
  const wordsPerThousand = 1000 / (text.split(/\s+/).length / features.emDashCount);
  const emDashScore =
    features.emDashCount === 0
      ? 5 // Good, no em-dashes
      : wordsPerThousand > 200
        ? 10 // Few em-dashes
        : wordsPerThousand > 100
          ? 20 // Some em-dashes
          : 30; // Many em-dashes (AI)
  score += emDashScore * 1.4;
  weightSum += 1.4;

  // Adverb frequency (humans: 4.2%, AI: 8.5%)
  const adverbScore =
    features.adverbPercentage > 7
      ? 25 // High like AI
      : features.adverbPercentage > 5
        ? 15
        : 5; // Low like human
  score += adverbScore * 1.1;
  weightSum += 1.1;

  // Contraction usage (humans: 8.7%, AI: 1.2%)
  const contractionScore =
    features.contractionPercentage < 2
      ? 25 // Rare like AI
      : features.contractionPercentage < 5
        ? 15
        : 5; // Frequent like human
  score += contractionScore * 1.2;
  weightSum += 1.2;

  // Transition word overuse (humans: <0.5 per sentence, AI: ~0.7+)
  const transitionScore =
    features.transitionWordRatio > 0.6
      ? 20 // High like AI
      : features.transitionWordRatio > 0.4
        ? 12
        : 5; // Low like human
  score += transitionScore * 1.1;
  weightSum += 1.1;

  return Math.round((score / weightSum / 25) * 100);
}

// ============================================
// LLM-SPECIFIC DETECTION
// ============================================

export interface LLMDetectionResult {
  likelyLLM: string;
  confidence: number;
  markerMatches: Array<{ marker: string; count: number }>;
  alternativeLLMs: Array<{ model: string; confidence: number }>;
}

/**
 * Detect which LLM likely generated the text
 */
export function detectLLMModel(text: string): LLMDetectionResult {
  const lowerText = text.toLowerCase();
  const result = estimateLLM(text);

  // Get all LLM signatures
  const allLLMs = getLLMMarkers("gpt-4o") && Object.keys({
    "gpt-4o": [],
    "mistral-7b": [],
    "qwen-2-72b": [],
    "llama-8b": [],
    "yi-large": [],
    "gemma-2-9b": [],
  });

  const markerMatches: Array<{ marker: string; count: number }> = [];
  const llmScores: Array<{ model: string; confidence: number }> = [];

  // Score each LLM
  allLLMs.forEach((llmName) => {
    const markers = getLLMMarkers(llmName);
    let matchCount = 0;

    markers.forEach((marker) => {
      const matches =
        (lowerText.match(
          new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
        ) || []).length || 0;
      if (matches > 0) {
        markerMatches.push({ marker, count: matches });
        matchCount += matches;
      }
    });

    const confidence = (matchCount / markers.length) * 100;
    llmScores.push({ model: llmName, confidence });
  });

  // Sort by confidence
  llmScores.sort((a, b) => b.confidence - a.confidence);

  return {
    likelyLLM: llmScores[0]?.model || "unknown",
    confidence: Math.min(llmScores[0]?.confidence || 0, 100),
    markerMatches,
    alternativeLLMs: llmScores.slice(1, 3),
  };
}

// ============================================
// DOMAIN-AWARE DETECTION
// ============================================

/**
 * Detect AI markers specific to a domain
 */
export function detectDomainSpecificAI(
  text: string,
  domain: string
): {
  isAILikely: boolean;
  confidence: number;
  foundMarkers: string[];
  reasonsForFlag: string[];
} {
  const lowerText = text.toLowerCase();
  const domainMarkers = getDomainMarkers(domain);

  const foundMarkers: string[] = [];
  domainMarkers.forEach((marker) => {
    if (lowerText.includes(marker.toLowerCase())) {
      foundMarkers.push(marker);
    }
  });

  const confidence = (foundMarkers.length / domainMarkers.length) * 100;
  const reasonsForFlag: string[] = [];

  if (foundMarkers.length >= domainMarkers.length * 0.5) {
    reasonsForFlag.push(
      `Found ${foundMarkers.length} domain-specific AI markers for ${domain}`
    );
  }

  // Check for excessive use
  if (foundMarkers.length > domainMarkers.length * 0.7) {
    reasonsForFlag.push(
      "Unusually high concentration of domain-specific technical language"
    );
  }

  return {
    isAILikely: foundMarkers.length >= domainMarkers.length * 0.4,
    confidence: Math.min(confidence, 100),
    foundMarkers,
    reasonsForFlag,
  };
}

// ============================================
// COMPREHENSIVE DATASET ANALYSIS
// ============================================

export interface ComprehensiveDatasetAnalysis {
  overallAILikelihood: number; // 0-100
  linguisticScore: number;
  wordFrequencyScore: number;
  llmDetection: LLMDetectionResult;
  mixedAuthorship: boolean;
  domainAnalysis?: {
    domain: string;
    isAILikely: boolean;
    confidence: number;
  };
  flags: string[];
  summary: string;
}

/**
 * Comprehensive analysis using all dataset methods
 */
export function comprehensiveDatasetAnalysis(
  text: string,
  domain?: string
): ComprehensiveDatasetAnalysis {
  const linguisticScore = scoreLinguisticAILikelihood(text);
  const wordFrequencyScore = getWordFrequencyAIScore(text);
  const llmDetection = detectLLMModel(text);
  const mixedAuthorship = hasMixedAuthorshipIndicators(text);

  const flags: string[] = [];

  if (linguisticScore > 70) {
    flags.push("⚠️ High linguistic AI markers detected");
  }
  if (wordFrequencyScore > 70) {
    flags.push("⚠️ High AI word frequency bias detected");
  }
  if (llmDetection.confidence > 60) {
    flags.push(`⚠️ Likely generated by ${llmDetection.likelyLLM}`);
  }
  if (mixedAuthorship) {
    flags.push("⚠️ Potential mixed human/AI authorship detected");
  }

  const overallLikelihood = (linguisticScore + wordFrequencyScore) / 2;
  let summary = "";

  if (overallLikelihood > 75) {
    summary =
      "🚨 HIGHLY LIKELY AI-GENERATED - Multiple strong indicators detected";
  } else if (overallLikelihood > 60) {
    summary =
      "⚠️ LIKELY AI-GENERATED - Several AI markers present (confidence: ~60-75%)";
  } else if (overallLikelihood > 40) {
    summary =
      "📊 POSSIBLE AI - Some markers present but not conclusive (confidence: ~40-60%)";
  } else {
    summary = "✅ LIKELY HUMAN-WRITTEN - Few AI markers detected";
  }

  const result: ComprehensiveDatasetAnalysis = {
    overallAILikelihood: Math.round(overallLikelihood),
    linguisticScore,
    wordFrequencyScore,
    llmDetection,
    mixedAuthorship,
    flags,
    summary,
  };

  if (domain) {
    const domainAnalysis = detectDomainSpecificAI(text, domain);
    result.domainAnalysis = {
      domain,
      isAILikely: domainAnalysis.isAILikely,
      confidence: Math.round(domainAnalysis.confidence),
    };

    if (domainAnalysis.isAILikely) {
      result.flags.push(
        `⚠️ Domain-specific AI patterns found for ${domain}`
      );
    }
  }

  return result;
}

