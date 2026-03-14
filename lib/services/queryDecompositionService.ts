/**
 * Query Decomposition Service
 * Decomposes academic topics into faceted sub-queries with expanded terms
 */

import { aiService, AIProvider } from '@/lib/services/aiService';

interface DecompositionResult {
  originalTopic: string;
  subQueries: string[];
  expandedTerms: string[];
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

class QueryDecompositionService {
  /**
   * Decompose a topic into 3-5 faceted sub-queries with expanded academic terms
   */
  async decompose(params: {
    topic: string;
    documentType: string;
    instructions?: string;
    provider?: AIProvider;
  }): Promise<DecompositionResult> {
    const { topic, documentType, instructions, provider = AIProvider.OPENAI } = params;

    try {
      const systemMessage = 'You are an academic research analyst. Return ONLY valid JSON, no markdown fences.';

      let userMessage = `Decompose the following academic topic into 3-5 faceted sub-queries for comprehensive literature search. Also provide expanded academic terms (synonyms, related concepts, field-specific terminology) that would help find relevant sources.

Topic: "${topic}"
Document Type: ${documentType}`;

      if (instructions) {
        userMessage += `\nAdditional Instructions: ${instructions}`;
      }

      userMessage += `

Return JSON:
{
  "originalTopic": "${topic}",
  "subQueries": ["sub-query 1", "sub-query 2", ...],
  "expandedTerms": ["term1", "term2", ...]
}

Each sub-query should target a different facet of the topic (e.g., theoretical foundations, empirical evidence, methodological approaches, practical applications, critiques/limitations).`;

      const response = await aiService.getChatCompletion(
        provider,
        [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        0.5,
        1500
      );

      const cleaned = stripMarkdownFences(response);
      const result: DecompositionResult = JSON.parse(cleaned);

      return {
        originalTopic: result.originalTopic || topic,
        subQueries: result.subQueries || [topic],
        expandedTerms: result.expandedTerms || [],
      };
    } catch (error) {
      console.error('[QueryDecompositionService] Decomposition failed, falling back to original topic:', error);
      return {
        originalTopic: topic,
        subQueries: [topic],
        expandedTerms: [],
      };
    }
  }
}

export const queryDecompositionService = new QueryDecompositionService();
