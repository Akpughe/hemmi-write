'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ResearchSource } from '@/lib/types/document';
import SourceCard from './SourceCard';

interface StepResearchReviewProps {
  sources: ResearchSource[];
  isLoading: boolean;
  onConfirm: (selectedSources: ResearchSource[]) => void;
  onBack: () => void;
}

export default function StepResearchReview({ sources, isLoading, onConfirm, onBack }: StepResearchReviewProps) {
  const [localSources, setLocalSources] = useState<ResearchSource[]>(sources);

  // Sync local sources when props change
  useEffect(() => {
    setLocalSources(sources);
  }, [sources]);

  const handleToggle = (id: string) => {
    setLocalSources((prev) =>
      prev.map((source) =>
        source.id === id ? { ...source, selected: !source.selected } : source
      )
    );
  };

  const handleSelectAll = () => {
    setLocalSources((prev) => prev.map((source) => ({ ...source, selected: true })));
  };

  const handleDeselectAll = () => {
    setLocalSources((prev) => prev.map((source) => ({ ...source, selected: false })));
  };

  const handleConfirm = () => {
    const selectedSources = localSources.filter((source) => source.selected);

    if (selectedSources.length === 0) {
      alert('Please select at least one source to continue.');
      return;
    }

    if (selectedSources.length < 3) {
      if (!confirm('You have selected fewer than 3 sources. For better quality, we recommend at least 3-5 sources. Continue anyway?')) {
        return;
      }
    }

    onConfirm(selectedSources);
  };

  const selectedCount = localSources.filter((s) => s.selected).length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 text-lg">Researching sources...</p>
        <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No sources found. Please try a different topic.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 mb-4">
          Review the sources we found and select which ones to include in your document. Selected sources will be cited using numbered markers [1], [2], [3], etc.
        </p>

        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div>
            <p className="font-medium text-gray-900">
              {selectedCount} of {sources.length} sources selected
            </p>
            <p className="text-sm text-gray-600">Recommended: 3-5 sources for best quality</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {localSources.map((source, index) => (
          <SourceCard
            key={source.id}
            source={source}
            index={index}
            selected={source.selected}
            onToggle={handleToggle}
          />
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">How citations work:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>Selected sources will be numbered in the order shown above [1], [2], [3]...</li>
          <li>The AI will reference these sources throughout your document</li>
          <li>A formatted reference list will be added at the end</li>
        </ul>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={selectedCount === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Document ({selectedCount} sources)
        </button>
      </div>
    </div>
  );
}
