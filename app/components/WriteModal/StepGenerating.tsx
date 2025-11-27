'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Eye, ChevronRight, FileText } from 'lucide-react';
import {
  DocumentType,
  ResearchSource,
  DocumentStructure,
  DOCUMENT_TYPE_CONFIGS,
  AcademicLevel,
  WritingStyle,
} from '@/lib/types/document';
import { useEditorContext } from '@/lib/contexts/EditorContext';
import { formatWithCitations } from '@/lib/utils/citations';

interface StepGeneratingProps {
  documentType: DocumentType;
  topic: string;
  instructions: string;
  wordCount: number | null;
  sources: ResearchSource[];
  structure: DocumentStructure;
  academicLevel: AcademicLevel;
  writingStyle: WritingStyle;
  aiProvider: string;
  onComplete: () => void;
}

type ChapterState = 'pending' | 'generating' | 'review' | 'approved' | 'error';

interface ChapterStatus {
  index: number;
  state: ChapterState;
  content: string;
  error?: string;
  wordCount: number;
}

export default function StepGenerating({
  documentType,
  topic,
  instructions,
  wordCount,
  sources,
  structure,
  academicLevel,
  writingStyle,
  aiProvider,
  onComplete,
}: StepGeneratingProps) {
  const { appendContent } = useEditorContext();
  const config = DOCUMENT_TYPE_CONFIGS[documentType];

  // Check if this is a research paper that needs chapter-by-chapter generation
  const isResearchPaper = documentType === DocumentType.RESEARCH_PAPER && academicLevel && writingStyle;
  const useChapterMode = isResearchPaper && structure.sections.length >= 5;

  // State for chapter-by-chapter mode
  const [chapterStatuses, setChapterStatuses] = useState<ChapterStatus[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [allChaptersComplete, setAllChaptersComplete] = useState(false);

  // State for traditional single-generation mode
  const [status, setStatus] = useState<'generating' | 'complete' | 'error'>('generating');
  const [generatedContent, setGeneratedContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (useChapterMode) {
      // Initialize chapter statuses
      const initialStatuses: ChapterStatus[] = structure.sections.map((_, index) => ({
        index,
        state: index === 0 ? 'generating' : 'pending',
        content: '',
        wordCount: 0,
      }));
      setChapterStatuses(initialStatuses);

      // Start generating first chapter
      generateChapter(0);
    } else {
      // Traditional mode: generate entire document at once
      generateDocument();
    }
  }, []);

  // Chapter-by-chapter generation
  const generateChapter = async (chapterIndex: number) => {
    try {
      // Get all previous chapters' content for context
      const previousChaptersText = chapterStatuses
        .slice(0, chapterIndex)
        .filter(ch => ch.state === 'approved')
        .map(ch => ch.content)
        .join('\n\n');

      const response = await fetch('/api/write/generate-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          topic,
          instructions,
          sources,
          chapter: structure.sections[chapterIndex],
          chapterIndex,
          totalChapters: structure.sections.length,
          previousChaptersText,
          academicLevel,
          writingStyle,
          documentTitle: structure.title,
          documentApproach: structure.approach,
          documentTone: structure.tone,
          aiProvider,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate chapter');
      }

      // Read stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Chapter complete - move to review state
          setChapterStatuses(prev =>
            prev.map((ch, idx) =>
              idx === chapterIndex
                ? { ...ch, state: 'review', content: accumulatedContent, wordCount: accumulatedContent.split(/\s+/).length }
                : ch
            )
          );
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.done) {
              setChapterStatuses(prev =>
                prev.map((ch, idx) =>
                  idx === chapterIndex
                    ? { ...ch, state: 'review', content: accumulatedContent, wordCount: accumulatedContent.split(/\s+/).length }
                    : ch
                )
              );
              break;
            }

            if (data.content) {
              accumulatedContent += data.content;
              // Update content in real-time
              setChapterStatuses(prev =>
                prev.map((ch, idx) =>
                  idx === chapterIndex
                    ? { ...ch, content: accumulatedContent, wordCount: accumulatedContent.split(/\s+/).length }
                    : ch
                )
              );
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chapter generation error:', err);
      setChapterStatuses(prev =>
        prev.map((ch, idx) =>
          idx === chapterIndex
            ? { ...ch, state: 'error', error: err.message || 'Failed to generate chapter' }
            : ch
        )
      );
    }
  };

  const handleApproveChapter = (chapterIndex: number) => {
    setChapterStatuses(prev =>
      prev.map((ch, idx) => (idx === chapterIndex ? { ...ch, state: 'approved' } : ch))
    );

    // Check if this is the last chapter
    if (chapterIndex === structure.sections.length - 1) {
      setAllChaptersComplete(true);
    } else {
      // Start generating next chapter
      const nextIndex = chapterIndex + 1;
      setCurrentChapterIndex(nextIndex);
      setChapterStatuses(prev =>
        prev.map((ch, idx) => (idx === nextIndex ? { ...ch, state: 'generating' } : ch))
      );
      generateChapter(nextIndex);
    }
  };

  const handleRegenerateChapter = (chapterIndex: number) => {
    setChapterStatuses(prev =>
      prev.map((ch, idx) =>
        idx === chapterIndex ? { ...ch, state: 'generating', content: '', error: undefined } : ch
      )
    );
    generateChapter(chapterIndex);
  };

  const handleInsertAllChapters = () => {
    // Combine all approved chapters
    const fullDocument = chapterStatuses
      .filter(ch => ch.state === 'approved')
      .map(ch => ch.content)
      .join('\n\n');

    // Add table of contents if available
    let finalContent = '';
    if (structure.tableOfContents) {
      const tocItems = structure.tableOfContents.items
        .map(item => {
          const indent = '  '.repeat((item.level || 1) - 1);
          const number = item.sectionNumber ? `${item.sectionNumber}. ` : '';
          return `${indent}${number}${item.title}`;
        })
        .join('\n');
      finalContent = `## Table of Contents\n\n${tocItems}\n\n`;
    }

    finalContent += fullDocument;

    // Format with citations
    const formattedContent = formatWithCitations(finalContent, sources, config.citationStyle);

    // Append to editor
    appendContent('\n\n' + formattedContent);

    onComplete();
  };

  // Traditional single-generation mode
  const generateDocument = async () => {
    try {
      const response = await fetch('/api/write/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          topic,
          instructions,
          wordCount,
          sources,
          structure,
          academicLevel,
          writingStyle,
          aiProvider,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setStatus('complete');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.done) {
              setStatus('complete');
              break;
            }

            if (data.content) {
              accumulatedContent += data.content;
              setGeneratedContent(accumulatedContent);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate document');
      setStatus('error');
    }
  };

  const handleInsert = () => {
    if (!generatedContent) return;
    const formattedContent = formatWithCitations(generatedContent, sources, config.citationStyle);
    appendContent('\n\n' + formattedContent);
    onComplete();
  };

  // CHAPTER MODE UI
  if (useChapterMode) {
    const currentChapter = chapterStatuses[currentChapterIndex];
    const totalWords = chapterStatuses.reduce((sum, ch) => sum + ch.wordCount, 0);
    const completedChapters = chapterStatuses.filter(ch => ch.state === 'approved').length;

    return (
      <div className="space-y-6">
        {/* Progress Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {allChaptersComplete ? 'All Chapters Complete!' : `Generating Chapter ${currentChapterIndex + 1} of ${structure.sections.length}`}
              </h3>
              <p className="text-sm text-gray-600">
                {completedChapters} chapters approved • {totalWords.toLocaleString()} words written
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((completedChapters / structure.sections.length) * 100)}%
              </div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedChapters / structure.sections.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Chapter Status List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {chapterStatuses.map((chapter, index) => (
            <div
              key={index}
              className={`border rounded-lg p-3 transition-all ${chapter.state === 'generating'
                  ? 'border-blue-400 bg-blue-50'
                  : chapter.state === 'approved'
                    ? 'border-green-300 bg-green-50'
                    : chapter.state === 'review'
                      ? 'border-yellow-400 bg-yellow-50'
                      : chapter.state === 'error'
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {chapter.state === 'generating' && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                  {chapter.state === 'approved' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {chapter.state === 'review' && <Eye className="w-4 h-4 text-yellow-600" />}
                  {chapter.state === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                  {chapter.state === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}

                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      {structure.sections[index].heading}
                    </div>
                    <div className="text-xs text-gray-500">
                      {chapter.wordCount > 0 ? `${chapter.wordCount.toLocaleString()} words` : 'Not started'}
                      {chapter.state === 'generating' && ' • Writing...'}
                      {chapter.state === 'review' && ' • Ready for review'}
                      {chapter.state === 'approved' && ' • Approved'}
                      {chapter.state === 'error' && ` • ${chapter.error}`}
                    </div>
                  </div>
                </div>

                {chapter.state === 'review' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRegenerateChapter(index)}
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={() => handleApproveChapter(index)}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                  </div>
                )}

                {chapter.state === 'error' && (
                  <button
                    onClick={() => handleRegenerateChapter(index)}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Current Chapter Preview (if generating or in review) */}
        {currentChapter && (currentChapter.state === 'generating' || currentChapter.state === 'review') && (
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">
                {structure.sections[currentChapterIndex].heading}
              </h4>
              {currentChapter.state === 'generating' && (
                <span className="text-sm text-gray-500">{currentChapter.wordCount} words...</span>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto prose prose-sm max-w-none text-black">
              {currentChapter.content || 'Starting generation...'}
              {currentChapter.state === 'generating' && (
                <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
              )}
            </div>
          </div>
        )}

        {/* Final Insert Button (when all complete) */}
        {allChaptersComplete && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {totalWords.toLocaleString()} words across {completedChapters} chapters
            </div>
            <button
              onClick={onComplete}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInsertAllChapters}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Insert Complete Document
            </button>
          </div>
        )}
      </div>
    );
  }

  // TRADITIONAL MODE UI (for essays, reports, assignments, or short research papers)
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Generation Failed</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => {
            setStatus('generating');
            setError('');
            generateDocument();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Generating Your {config.label}...</h3>
            <p className="text-sm text-gray-600">
              {generatedContent.length > 0
                ? `${generatedContent.split(/\s+/).length} words written...`
                : 'Starting generation...'}
            </p>
          </div>
        </div>

        {generatedContent.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 max-h-[500px] overflow-y-auto">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {generatedContent}
              <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Processing:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                Analyzing {sources.length} sources
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                Writing {wordCount || 'default'} words
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                Formatting {config.citationStyle} citations
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center mb-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
      </div>

      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Document Generated!</h3>
        <p className="text-gray-600">Your {config.label.toLowerCase()} is ready to be inserted into the editor</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-h-[400px] overflow-y-auto">
        <div
          className="prose prose-sm max-w-none [&_*]:!text-black"
          dangerouslySetInnerHTML={{ __html: generatedContent }}
        />
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">What's included:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
          <li>{sources.length} sources cited using {config.citationStyle} format</li>
          <li>Approximately {wordCount || 'default'} words</li>
          <li>Properly formatted reference list at the end</li>
        </ul>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onComplete}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleInsert}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Insert into Editor
        </button>
      </div>
    </div>
  );
}
