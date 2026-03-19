/**
 * Token Middleware
 * Helper functions for token checking and deduction in AI generation routes
 */

import { tokenService } from '@/lib/services/tokenService';
import { NextResponse } from 'next/server';

/**
 * Minimum token thresholds for different operations
 * Operations will start if user has at least this many tokens
 */
export const MIN_TOKENS = {
  RESEARCH: 1000,      // Research can process ~1 paper
  CHAPTER: 2000,       // Chapter generation minimum
  STRUCTURE: 1000,     // Structure generation
  CHAT: 500,           // Chat interaction
  SOURCE_ANALYSIS: 1500, // Source analysis
  DEFAULT: 1000,       // Default minimum
} as const;

/**
 * Check if user has enough tokens before generation
 * Uses "use what you have" approach - only blocks if below minimum threshold
 * Returns null if check passes, otherwise returns error response
 *
 * @param userId - User ID
 * @param estimatedTokens - Estimated tokens (used for logging only)
 * @param minimumRequired - Minimum tokens needed to start (default 1000)
 */
export async function checkTokenBalance(
  userId: string,
  estimatedTokens: number,
  minimumRequired: number = MIN_TOKENS.DEFAULT
): Promise<NextResponse | null> {
  try {
    const balance = await tokenService.getUserTokenBalance(userId);

    // No active subscription
    if (!balance.subscription) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_TOKENS',
          message: 'No active subscription. Please subscribe to continue.',
          required: minimumRequired,
          available: 0,
          code: 'NO_SUBSCRIPTION',
        },
        { status: 402 } // Payment Required
      );
    }

    // Check against minimum required, not estimated total
    // This allows operations to start and use whatever tokens are available
    if (balance.tokens < minimumRequired) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_TOKENS',
          message: `Insufficient tokens. You need at least ${minimumRequired.toLocaleString()} tokens to start this operation. You have ${balance.tokens.toLocaleString()} remaining.`,
          required: minimumRequired,
          estimated: estimatedTokens,
          available: balance.tokens,
          code: 'INSUFFICIENT_BALANCE',
        },
        { status: 402 } // Payment Required
      );
    }

    // Log if user has less than estimated (operation will proceed but may not complete fully)
    if (balance.tokens < estimatedTokens) {
      console.log(
        `[TokenMiddleware] User has ${balance.tokens} tokens, less than estimated ${estimatedTokens}. Operation will use available tokens.`
      );
    }

    // All good - user has at least minimum required
    return null;
  } catch (error) {
    console.error('[TokenMiddleware] Check balance error:', error);
    return NextResponse.json(
      { error: 'Failed to check token balance' },
      { status: 500 }
    );
  }
}

/**
 * Deduct tokens after successful generation
 * Logs usage with metadata
 */
export async function deductTokens(
  userId: string,
  tokensUsed: number,
  operationType: 'research' | 'structure' | 'chapter' | 'chat' | 'generate' | 'source_analysis' | 'query_decomposition' | 're_ranking' | 'argument_summary',
  metadata?: {
    projectId?: string;
    chapterName?: string;
    wordCount?: number;
    model?: string;
    [key: string]: unknown;
  }
): Promise<boolean> {
  try {
    const success = await tokenService.deductTokens(
      userId,
      tokensUsed,
      operationType,
      metadata,
      metadata?.projectId
    );

    if (success) {
      console.log(
        `[TokenMiddleware] Deducted ${tokensUsed} tokens for ${operationType}`
      );
    } else {
      console.error(
        `[TokenMiddleware] Failed to deduct tokens for ${operationType}`
      );
    }

    return success;
  } catch (error) {
    console.error('[TokenMiddleware] Deduct tokens error:', error);
    return false;
  }
}

/**
 * Estimate token usage based on word count
 * Uses the formula: tokens ≈ words * 1.33
 */
export function estimateTokensFromWords(wordCount: number): number {
  return Math.ceil(wordCount * 1.33);
}

/**
 * Estimate tokens for chapter generation
 * Includes input tokens (prompt, sources, context) and output tokens
 */
export function estimateChapterTokens(params: {
  targetWordCount: number;
  sourceCount: number;
  hasContext: boolean;
}): number {
  const { targetWordCount, sourceCount, hasContext } = params;

  // Output tokens (what will be generated)
  const outputTokens = estimateTokensFromWords(targetWordCount);

  // Input tokens (prompt, sources, context)
  const promptTokens = 500; // Base prompt
  const sourceTokens = sourceCount * 400; // Avg 400 tokens per source
  const contextTokens = hasContext ? 2000 : 0; // Previous chapters context

  const totalInput = promptTokens + sourceTokens + contextTokens;

  // Total tokens (input + output)
  // For billing, we typically charge for output tokens only
  // But for estimation, include both to be safe
  return outputTokens + Math.ceil(totalInput * 0.2); // 20% of input for overhead
}

/**
 * Estimate tokens for research operation
 */
export function estimateResearchTokens(params: {
  sourceCount: number;
  depth: 'basic' | 'moderate' | 'deep';
}): number {
  const { sourceCount, depth } = params;

  const baseTokens = {
    basic: 5000,
    moderate: 10000,
    deep: 15000,
  }[depth];

  // Add tokens based on source count
  const sourceTokens = sourceCount * 1000; // Each source adds processing overhead

  return baseTokens + sourceTokens;
}

/**
 * Estimate tokens for structure generation
 */
export function estimateStructureTokens(params: {
  documentType: string;
  targetWordCount: number;
}): number {
  // Structure generation is relatively lightweight
  // Mainly depends on document complexity
  const baseTokens = 2000;

  // Add tokens based on document size (more chapters = more tokens)
  const sizeMultiplier = Math.ceil(params.targetWordCount / 10000);

  return baseTokens + (sizeMultiplier * 500);
}

/**
 * Estimate tokens for chat operations
 */
export function estimateChatTokens(params: {
  messageLength: number;
  historyLength: number;
  hasResearch: boolean;
}): number {
  const { messageLength, historyLength, hasResearch } = params;

  // Message processing
  const messageTokens = estimateTokensFromWords(messageLength / 5); // Rough words estimate

  // Chat history context
  const historyTokens = Math.min(historyLength * 100, 2000); // Cap at 2000

  // Research boost
  const researchTokens = hasResearch ? 3000 : 0;

  // Response generation (typically 200-500 words)
  const responseTokens = 700;

  return messageTokens + historyTokens + researchTokens + responseTokens;
}

/**
 * Calculate actual tokens from generated content
 * This is a rough estimation - in production, you'd get this from the AI provider's response
 */
export function calculateActualTokens(generatedText: string): number {
  const wordCount = generatedText.split(/\s+/).length;
  return estimateTokensFromWords(wordCount);
}

export function estimateSourceAnalysisTokens(params: { sourceCount: number }): number {
  return (params.sourceCount * 900) + 500 + 4000;
}

export function estimateQueryDecompositionTokens(): number {
  return 2000;
}

export function estimateReRankingTokens(params: { candidateCount: number }): number {
  return params.candidateCount * 100 + 500;
}

export function estimateArgumentSummaryTokens(): number {
  return 1500;
}

/**
 * Premium fair use check
 * Returns true if user has exceeded daily soft limit
 */
export async function checkPremiumFairUse(userId: string): Promise<{
  exceeded: boolean;
  dailyUsage: number;
  limit: number;
}> {
  try {
    const isPremium = await tokenService.isPremiumUser(userId);

    if (!isPremium) {
      return { exceeded: false, dailyUsage: 0, limit: 0 };
    }

    const pricing = await tokenService.getPricingConfig();
    const dailyUsage = await tokenService.getDailyTokenUsage(userId);
    const limit = pricing.premiumDailySoftLimit;

    return {
      exceeded: dailyUsage >= limit,
      dailyUsage,
      limit,
    };
  } catch (error) {
    console.error('[TokenMiddleware] Fair use check error:', error);
    return { exceeded: false, dailyUsage: 0, limit: 0 };
  }
}
