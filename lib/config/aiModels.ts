// AI Model Configuration

export enum AIProvider {
  GROQ = 'GROQ',
  GEMINI = 'GEMINI',
  ANTHROPIC = 'ANTHROPIC',
  OPENAI = 'OPENAI',
}

export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  label: string;
  description: string;
  maxTokens: number;
  contextWindow: number;
  icon: string;
}

export const AI_MODELS: Record<AIProvider, AIModelConfig> = {
  [AIProvider.GROQ]: {
    provider: AIProvider.GROQ,
    model: 'openai/gpt-oss-120b',
    label: 'Groq (GPT-OSS 120B)',
    description: 'Fast inference with 8K token output',
    maxTokens: 12000,
    contextWindow: 32000,
    icon: '⚡',
  },
  [AIProvider.GEMINI]: {
    provider: AIProvider.GEMINI,
    model: 'gemini-2.0-flash-exp',
    label: 'Google Gemini 2.0 Flash',
    description: 'Advanced reasoning with 8K token output',
    maxTokens: 12000,
    contextWindow: 1000000,
    icon: '🤖',
  },
  [AIProvider.ANTHROPIC]: {
    provider: AIProvider.ANTHROPIC,
    model: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku',
    description: 'Fast, efficient assistant for chat and analysis',
    maxTokens: 4000,
    contextWindow: 48000,
    icon: '✦',
  },
  [AIProvider.OPENAI]: {
    provider: AIProvider.OPENAI,
    model: 'gpt-5-mini',
    label: 'GPT-5 Mini',
    description: 'Fast, cost-effective model for research and writing',
    maxTokens: 16000,
    contextWindow: 400000,
    icon: '🔷',
  },
};

export const DEFAULT_AI_PROVIDER = AIProvider.ANTHROPIC;
