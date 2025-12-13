// Unified AI Service for multiple providers

import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AI_MODELS } from '@/lib/config/aiModels';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamChunk {
  content: string;
  done: boolean;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  truncated?: boolean;
  tokensUsed?: number;
}

export class AIService {
  private groq: Groq | null = null;
  private gemini: GoogleGenerativeAI | null = null;

  constructor() {
    // Initialize Groq if API key exists
    if (process.env.GROQ_API_KEY) {
      this.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
    }

    // Initialize Gemini if API key exists
    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  /**
   * Stream chat completion from selected provider
   */
  async *streamChatCompletion(
    provider: AIProvider,
    messages: ChatMessage[],
    temperature: number = 0.7,
    maxTokens: number = 8000
  ): AsyncGenerator<StreamChunk> {
    const modelConfig = AI_MODELS[provider];

    if (provider === AIProvider.GROQ) {
      yield* this.streamGroqCompletion(messages, temperature, maxTokens);
    } else if (provider === AIProvider.GEMINI) {
      yield* this.streamGeminiCompletion(messages, temperature, maxTokens);
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Groq streaming implementation
   */
  private async *streamGroqCompletion(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<StreamChunk> {
    if (!this.groq) {
      throw new Error('Groq API key not configured');
    }

    const groqMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    console.log(`[Groq] Starting generation with model: ${AI_MODELS[AIProvider.GROQ].model}, max_tokens: ${maxTokens}`);

    const stream = await this.groq.chat.completions.create({
      messages: groqMessages as any,
      model: AI_MODELS[AIProvider.GROQ].model,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    let lastFinishReason: 'stop' | 'length' | 'tool_calls' | 'function_call' | null = null;
    let outputTokens = 0;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      const content = choice?.delta?.content;
      const finishReason = choice?.finish_reason;

      // Track finish reason
      if (finishReason) {
        lastFinishReason = finishReason;
        console.log(`[Groq] Stream finished with reason: ${finishReason}`);
      }

      // Track token usage if available (may be in final chunk)
      if ((chunk as any).usage) {
        outputTokens = (chunk as any).usage.completion_tokens || 0;
      }

      if (content) {
        yield { content, done: false, finishReason: null };
      }
    }

    // Check if content was truncated
    const wasTruncated = lastFinishReason === 'length';

    if (wasTruncated) {
      console.error(`[Groq] ⚠️  WARNING: Content was TRUNCATED due to token limit!`);
      console.error(`[Groq] Requested: ${maxTokens} tokens, Used: ${outputTokens} tokens`);
    } else {
      console.log(`[Groq] ✓ Generation completed naturally. Tokens used: ${outputTokens}/${maxTokens}`);
    }

    yield {
      content: '',
      done: true,
      finishReason: lastFinishReason as 'stop' | 'length' | 'tool_calls' | 'content_filter' | null,
      truncated: wasTruncated,
      tokensUsed: outputTokens
    };
  }

  /**
   * Gemini streaming implementation
   */
  private async *streamGeminiCompletion(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<StreamChunk> {
    if (!this.gemini) {
      throw new Error('Gemini API key not configured');
    }

    console.log(`[Gemini] Starting generation with model: ${AI_MODELS[AIProvider.GEMINI].model}, maxOutputTokens: ${maxTokens}`);

    const model = this.gemini.getGenerativeModel({
      model: AI_MODELS[AIProvider.GEMINI].model,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    // Combine system and user messages for Gemini
    // Gemini doesn't have a separate system role, so we prepend it to the first user message
    let combinedPrompt = '';
    const systemMessages = messages.filter((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role === 'user');

    if (systemMessages.length > 0) {
      combinedPrompt = systemMessages.map((m) => m.content).join('\n\n') + '\n\n';
    }
    if (userMessages.length > 0) {
      combinedPrompt += userMessages.map((m) => m.content).join('\n\n');
    }

    const result = await model.generateContentStream(combinedPrompt);

    let outputTokens = 0;
    let finishReason: string | null = null;

    for await (const chunk of result.stream) {
      const text = chunk.text();

      // Gemini candidates may have finish reason
      if (chunk.candidates?.[0]?.finishReason) {
        finishReason = chunk.candidates[0].finishReason;
      }

      if (text) {
        yield { content: text, done: false, finishReason: null };
      }
    }

    // Get final metadata after stream completes
    try {
      const response = await result.response;
      const usageMetadata = response.usageMetadata;
      if (usageMetadata?.candidatesTokenCount) {
        outputTokens = usageMetadata.candidatesTokenCount;
      }

      // Check finish reason from final response
      if (response.candidates?.[0]?.finishReason) {
        finishReason = response.candidates[0].finishReason;
      }
    } catch (e) {
      console.warn('[Gemini] Could not retrieve usage metadata:', e);
    }

    // Gemini uses different finish reasons: STOP, MAX_TOKENS, SAFETY, RECITATION, etc.
    const wasTruncated = finishReason === 'MAX_TOKENS' || finishReason === 'SAFETY';

    if (wasTruncated) {
      console.error(`[Gemini] ⚠️  WARNING: Content was TRUNCATED! Finish reason: ${finishReason}`);
      console.error(`[Gemini] Requested: ${maxTokens} tokens, Used: ${outputTokens} tokens`);
    } else {
      console.log(`[Gemini] ✓ Generation completed. Finish reason: ${finishReason}, Tokens used: ${outputTokens}/${maxTokens}`);
    }

    yield {
      content: '',
      done: true,
      finishReason: finishReason as any,
      truncated: wasTruncated,
      tokensUsed: outputTokens
    };
  }

  /**
   * Non-streaming completion (for structure generation that expects JSON)
   */
  async getChatCompletion(
    provider: AIProvider,
    messages: ChatMessage[],
    temperature: number = 0.7,
    maxTokens: number = 2000
  ): Promise<string> {
    const modelConfig = AI_MODELS[provider];

    if (provider === AIProvider.GROQ) {
      return this.getGroqCompletion(messages, temperature, maxTokens);
    } else if (provider === AIProvider.GEMINI) {
      return this.getGeminiCompletion(messages, temperature, maxTokens);
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Groq non-streaming completion
   */
  private async getGroqCompletion(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    if (!this.groq) {
      throw new Error('Groq API key not configured');
    }

    const groqMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const completion = await this.groq.chat.completions.create({
      messages: groqMessages as any,
      model: AI_MODELS[AIProvider.GROQ].model,
      temperature,
      max_tokens: maxTokens,
    });

    return completion.choices[0]?.message?.content || '';
  }

  /**
   * Gemini non-streaming completion
   */
  private async getGeminiCompletion(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    if (!this.gemini) {
      throw new Error('Gemini API key not configured');
    }

    const model = this.gemini.getGenerativeModel({
      model: AI_MODELS[AIProvider.GEMINI].model,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    // Combine system and user messages
    let combinedPrompt = '';
    const systemMessages = messages.filter((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role === 'user');

    if (systemMessages.length > 0) {
      combinedPrompt = systemMessages.map((m) => m.content).join('\n\n') + '\n\n';
    }
    if (userMessages.length > 0) {
      combinedPrompt += userMessages.map((m) => m.content).join('\n\n');
    }

    const result = await model.generateContent(combinedPrompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Check which providers are available
   */
  getAvailableProviders(): AIProvider[] {
    const available: AIProvider[] = [];

    if (this.groq) {
      available.push(AIProvider.GROQ);
    }

    if (this.gemini) {
      available.push(AIProvider.GEMINI);
    }

    return available;
  }
}

// Singleton instance
export const aiService = new AIService();
