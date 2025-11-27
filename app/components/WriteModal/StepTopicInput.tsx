'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  DocumentType,
  DOCUMENT_TYPE_CONFIGS,
  MIN_WORD_COUNT,
  MAX_WORD_COUNT,
  AcademicLevel,
  WritingStyle,
  ACADEMIC_LEVEL_CONFIGS,
  WRITING_STYLE_CONFIGS,
} from '@/lib/types/document';
import { AIProvider, AI_MODELS } from '@/lib/config/aiModels';
import { getWordCountGuidance, getDefaultWordCount } from '@/lib/utils/documentStructure';

interface StepTopicInputProps {
  documentType: DocumentType;
  academicLevel: AcademicLevel;
  writingStyle: WritingStyle;
  aiProvider: AIProvider;
  onSubmit: (
    topic: string,
    instructions: string,
    wordCount: number | null,
    numSources: number,
    academicLevel?: AcademicLevel,
    writingStyle?: WritingStyle,
    aiProvider?: AIProvider
  ) => void;
  onBack: () => void;
}

export default function StepTopicInput({
  documentType,
  academicLevel: initialAcademicLevel,
  writingStyle: initialWritingStyle,
  aiProvider: initialAiProvider,
  onSubmit,
  onBack,
}: StepTopicInputProps) {
  const config = DOCUMENT_TYPE_CONFIGS[documentType];
  const suggestedRange = getWordCountGuidance(documentType);
  const defaultCount = getDefaultWordCount(documentType);
  const isResearchPaper = documentType === DocumentType.RESEARCH_PAPER;

  const [topic, setTopic] = useState('');
  const [instructions, setInstructions] = useState('');
  const [wordCount, setWordCount] = useState<string>('');
  const [numSources, setNumSources] = useState<number>(20);
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>(initialAcademicLevel);
  const [writingStyle, setWritingStyle] = useState<WritingStyle>(initialWritingStyle);
  const [aiProvider, setAiProvider] = useState<AIProvider>(initialAiProvider);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (topic.trim().length < 5) {
      setError('Topic must be at least 5 characters');
      return;
    }

    // Validate custom word count if provided
    if (wordCount) {
      const count = parseInt(wordCount, 10);
      if (isNaN(count) || count < MIN_WORD_COUNT || count > MAX_WORD_COUNT) {
        setError(`Word count must be between ${MIN_WORD_COUNT} and ${MAX_WORD_COUNT}`);
        return;
      }
      onSubmit(
        topic.trim(),
        instructions.trim(),
        count,
        numSources,
        isResearchPaper ? academicLevel : undefined,
        isResearchPaper ? writingStyle : undefined,
        aiProvider
      );
    } else {
      // Use default word count for the document type
      onSubmit(
        topic.trim(),
        instructions.trim(),
        defaultCount,
        numSources,
        isResearchPaper ? academicLevel : undefined,
        isResearchPaper ? writingStyle : undefined,
        aiProvider
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{config.label}</h3>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Academic Level Selector - Research Papers Only */}
      {isResearchPaper && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Academic Level <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {Object.values(AcademicLevel).map((level) => {
              const levelConfig = ACADEMIC_LEVEL_CONFIGS[level];
              const isSelected = academicLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setAcademicLevel(level)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{levelConfig.icon}</span>
                    <span className="font-semibold text-gray-900 text-sm">
                      {levelConfig.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{levelConfig.description}</p>
                  <p className="text-xs text-gray-500">
                    {levelConfig.citationsPerSection} citations/section
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Writing Style Selector - Research Papers Only */}
      {isResearchPaper && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Writing Style <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(WritingStyle).map((style) => {
              const styleConfig = WRITING_STYLE_CONFIGS[style];
              const isSelected = writingStyle === style;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => setWritingStyle(style)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{styleConfig.icon}</span>
                    <span className="font-semibold text-gray-900 text-sm">
                      {styleConfig.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{styleConfig.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Model Provider Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          AI Model <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {Object.values(AIProvider).map((provider) => {
            const modelConfig = AI_MODELS[provider];
            const isSelected = aiProvider === provider;
            return (
              <button
                key={provider}
                type="button"
                onClick={() => setAiProvider(provider)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{modelConfig.icon}</span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {modelConfig.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-1">{modelConfig.description}</p>
                <p className="text-xs text-gray-500">
                  {modelConfig.maxTokens.toLocaleString()} tokens • {(modelConfig.contextWindow / 1000).toFixed(0)}K context
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
          Topic <span className="text-red-500">*</span>
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            setError('');
          }}
          placeholder="e.g., The impact of climate change on biodiversity"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-black"
          required
        />
        <p className="mt-1 text-sm text-gray-500">Enter the main topic or subject of your {config.label.toLowerCase()}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="wordCount" className="block text-sm font-medium text-gray-700 mb-2">
            Word Count (optional)
          </label>
          <input
            id="wordCount"
            type="number"
            value={wordCount}
            onChange={(e) => {
              setWordCount(e.target.value);
              setError('');
            }}
            placeholder={`Default: ${defaultCount}`}
            min={MIN_WORD_COUNT}
            max={MAX_WORD_COUNT}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-black"
          />
          <p className="mt-1 text-sm text-gray-500">
            Suggested: {suggestedRange}
          </p>
        </div>

        <div>
          <label htmlFor="numSources" className="block text-sm font-medium text-gray-700 mb-2">
            Number of Sources <span className="text-red-500">*</span>
          </label>
          <input
            id="numSources"
            type="number"
            value={numSources}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= 5 && val <= 30) {
                setNumSources(val);
                setError('');
              }
            }}
            min={5}
            max={30}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-black"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            5-30 sources (default: 20)
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
          Additional Instructions (optional)
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g., Focus on recent research from the last 5 years, include case studies, emphasize environmental policy..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-black"
          rows={4}
        />
        <p className="mt-1 text-sm text-gray-500">Provide any specific requirements, focus areas, or constraints</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>We'll search the web for credible sources on your topic</li>
          <li>You'll review and select the sources to include</li>
          <li>We'll generate your {config.label.toLowerCase()} with proper {config.citationStyle} citations</li>
        </ol>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Research Sources
        </button>
      </div>
    </form>
  );
}
