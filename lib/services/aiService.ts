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

    const stream = await this.groq.chat.completions.create({
      messages: groqMessages as any,
      model: AI_MODELS[AIProvider.GROQ].model,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { content, done: false };
      }
    }

    yield { content: '', done: true };
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

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield { content: text, done: false };
      }
    }

    yield { content: '', done: true };
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
