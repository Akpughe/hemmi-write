'use client';

import { useReducer, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  DocumentType,
  ResearchSource,
  DocumentStructure,
  AcademicLevel,
  WritingStyle,
} from '@/lib/types/document';
import { AIProvider, DEFAULT_AI_PROVIDER } from '@/lib/config/aiModels';
import StepDocumentType from './StepDocumentType';
import StepTopicInput from './StepTopicInput';
import StepResearchReview from './StepResearchReview';
import StepStructureReview from './StepStructureReview';
import StepGenerating from './StepGenerating';

interface WriteModalState {
  step: 1 | 2 | 3 | 4 | 5;
  documentType: DocumentType | null;
  topic: string;
  instructions: string;
  wordCount: number | null;
  numSources: number;                // Number of sources to fetch
  academicLevel: AcademicLevel;      // NEW: Default GRADUATE
  writingStyle: WritingStyle;        // NEW: Default CHAPTER_BASED
  aiProvider: AIProvider;            // NEW: AI model provider
  sources: ResearchSource[];
  selectedSources: ResearchSource[];
  structure: DocumentStructure | null;
  // Block generation state
  isBlockGeneration: boolean;
  currentBlock: number;
  totalBlocks: number;
  generatedBlocks: string[];
  blockReviewMode: boolean;
  isLoading: boolean;
  error: string | null;
}

type WriteModalAction =
  | { type: 'SET_DOCUMENT_TYPE'; payload: DocumentType }
  | { type: 'SET_ACADEMIC_LEVEL'; payload: AcademicLevel }
  | { type: 'SET_WRITING_STYLE'; payload: WritingStyle }
  | { type: 'SET_AI_PROVIDER'; payload: AIProvider }
  | { type: 'SET_TOPIC_AND_INSTRUCTIONS'; payload: { topic: string; instructions: string; wordCount: number | null; numSources?: number; academicLevel?: AcademicLevel; writingStyle?: WritingStyle; aiProvider?: AIProvider } }
  | { type: 'SET_SOURCES'; payload: ResearchSource[] }
  | { type: 'UPDATE_SOURCES'; payload: ResearchSource[] }
  | { type: 'SET_SELECTED_SOURCES'; payload: ResearchSource[] }
  | { type: 'SET_STRUCTURE'; payload: DocumentStructure }
  | { type: 'START_BLOCK_GENERATION'; payload: { totalBlocks: number } }
  | { type: 'COMPLETE_BLOCK'; payload: { blockIndex: number; content: string } }
  | { type: 'APPROVE_BLOCK_CONTINUE' }
  | { type: 'REGENERATE_CURRENT_BLOCK' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' };

function modalReducer(state: WriteModalState, action: WriteModalAction): WriteModalState {
  switch (action.type) {
    case 'SET_DOCUMENT_TYPE':
      return { ...state, documentType: action.payload };
    case 'SET_ACADEMIC_LEVEL':
      return { ...state, academicLevel: action.payload };
    case 'SET_WRITING_STYLE':
      return { ...state, writingStyle: action.payload };
    case 'SET_AI_PROVIDER':
      return { ...state, aiProvider: action.payload };
    case 'SET_TOPIC_AND_INSTRUCTIONS':
      return {
        ...state,
        topic: action.payload.topic,
        instructions: action.payload.instructions,
        wordCount: action.payload.wordCount,
        numSources: action.payload.numSources || state.numSources,
        academicLevel: action.payload.academicLevel || state.academicLevel,
        writingStyle: action.payload.writingStyle || state.writingStyle,
        aiProvider: action.payload.aiProvider || state.aiProvider,
      };
    case 'SET_SOURCES':
      return { ...state, sources: action.payload, selectedSources: action.payload };
    case 'UPDATE_SOURCES':
      return { ...state, sources: action.payload };
    case 'SET_SELECTED_SOURCES':
      return { ...state, selectedSources: action.payload };
    case 'SET_STRUCTURE':
      return { ...state, structure: action.payload };
    case 'START_BLOCK_GENERATION':
      return {
        ...state,
        isBlockGeneration: true,
        totalBlocks: action.payload.totalBlocks,
        currentBlock: 0,
        generatedBlocks: [],
        blockReviewMode: false,
      };
    case 'COMPLETE_BLOCK':
      return {
        ...state,
        currentBlock: action.payload.blockIndex,
        generatedBlocks: [...state.generatedBlocks, action.payload.content],
        blockReviewMode: true,
      };
    case 'APPROVE_BLOCK_CONTINUE':
      return {
        ...state,
        blockReviewMode: false,
      };
    case 'REGENERATE_CURRENT_BLOCK':
      return {
        ...state,
        blockReviewMode: false,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'NEXT_STEP':
      return { ...state, step: (Math.min(state.step + 1, 5) as 1 | 2 | 3 | 4 | 5), error: null };
    case 'PREV_STEP':
      return { ...state, step: (Math.max(state.step - 1, 1) as 1 | 2 | 3 | 4 | 5), error: null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const initialState: WriteModalState = {
  step: 1,
  documentType: null,
  topic: '',
  instructions: '',
  wordCount: null,
  numSources: 20,                             // DEFAULT: 20 sources
  academicLevel: AcademicLevel.GRADUATE,      // DEFAULT
  writingStyle: WritingStyle.CHAPTER_BASED,   // DEFAULT
  aiProvider: DEFAULT_AI_PROVIDER,            // DEFAULT
  sources: [],
  selectedSources: [],
  structure: null,
  isBlockGeneration: false,
  currentBlock: 0,
  totalBlocks: 0,
  generatedBlocks: [],
  blockReviewMode: false,
  isLoading: false,
  error: null,
};

interface WriteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WriteModal({ isOpen, onClose }: WriteModalProps) {
  const [state, dispatch] = useReducer(modalReducer, initialState);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      dispatch({ type: 'RESET' });
    }
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    // Confirm if user is in progress
    if (state.step > 1 && state.step < 5) {
      if (!confirm('Are you sure you want to close? Your progress will be lost.')) {
        return;
      }
    }
    onClose();
  };

  const handleDocumentTypeSelect = (type: DocumentType) => {
    dispatch({ type: 'SET_DOCUMENT_TYPE', payload: type });
    dispatch({ type: 'NEXT_STEP' });
  };

  const handleTopicSubmit = async (
    topic: string,
    instructions: string,
    wordCount: number | null,
    numSources: number,
    academicLevel?: AcademicLevel,
    writingStyle?: WritingStyle,
    aiProvider?: AIProvider
  ) => {
    dispatch({ type: 'SET_TOPIC_AND_INSTRUCTIONS', payload: { topic, instructions, wordCount, numSources, academicLevel, writingStyle, aiProvider } });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'NEXT_STEP' });

    // Fetch research sources
    try {
      const response = await fetch('/api/write/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          documentType: state.documentType,
          numSources,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch research sources');
      }

      const data = await response.json();
      dispatch({ type: 'SET_SOURCES', payload: data.sources });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch sources' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleSourcesConfirm = (selectedSources: ResearchSource[]) => {
    dispatch({ type: 'SET_SELECTED_SOURCES', payload: selectedSources });
    dispatch({ type: 'NEXT_STEP' });
  };

  const handleStructureConfirm = (structure: DocumentStructure, updatedSources?: ResearchSource[]) => {
    dispatch({ type: 'SET_STRUCTURE', payload: structure });
    // Update sources if new ones were added during regeneration
    if (updatedSources) {
      dispatch({ type: 'SET_SELECTED_SOURCES', payload: updatedSources.filter(s => s.selected) });
    }
    dispatch({ type: 'NEXT_STEP' });
  };

  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
  };

  if (!isOpen) return null;

  const getStepTitle = () => {
    switch (state.step) {
      case 1:
        return 'Select Document Type';
      case 2:
        return 'Enter Topic & Details';
      case 3:
        return 'Review Research Sources';
      case 4:
        return 'Review Document Structure';
      case 5:
        return 'Generating Document';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold text-gray-900">{getStepTitle()}</h2>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNum === state.step
                      ? 'bg-blue-600 text-white'
                      : stepNum < state.step
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {stepNum}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {state.error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {state.error}
            </div>
          )}

          {state.step === 1 && (
            <StepDocumentType onSelect={handleDocumentTypeSelect} />
          )}

          {state.step === 2 && state.documentType && (
            <StepTopicInput
              documentType={state.documentType}
              academicLevel={state.academicLevel}
              writingStyle={state.writingStyle}
              aiProvider={state.aiProvider}
              onSubmit={handleTopicSubmit}
              onBack={handleBack}
            />
          )}

          {state.step === 3 && (
            <StepResearchReview
              sources={state.sources}
              isLoading={state.isLoading}
              onConfirm={handleSourcesConfirm}
              onBack={handleBack}
            />
          )}

          {state.step === 4 && state.documentType && (
            <StepStructureReview
              documentType={state.documentType}
              topic={state.topic}
              instructions={state.instructions}
              wordCount={state.wordCount}
              sources={state.selectedSources}
              academicLevel={state.academicLevel}
              writingStyle={state.writingStyle}
              aiProvider={state.aiProvider}
              onConfirm={handleStructureConfirm}
              onBack={handleBack}
            />
          )}

          {state.step === 5 && state.documentType && state.structure && (
            <StepGenerating
              documentType={state.documentType}
              topic={state.topic}
              instructions={state.instructions}
              wordCount={state.wordCount}
              sources={state.selectedSources}
              structure={state.structure}
              academicLevel={state.academicLevel}
              writingStyle={state.writingStyle}
              aiProvider={state.aiProvider}
              onComplete={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
