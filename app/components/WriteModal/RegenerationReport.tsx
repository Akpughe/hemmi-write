'use client';

import { CheckCircle2, ExternalLink, Search } from 'lucide-react';
import { RegenerationReport as RegenerationReportType } from '@/lib/types/document';
import SourceCard from './SourceCard';

interface RegenerationReportProps {
  report: RegenerationReportType;
  onSourceToggle?: (id: string) => void;
}

export default function RegenerationReport({ report, onSourceToggle }: RegenerationReportProps) {
  const { feedbackAnalysis, researchConducted, newSourcesAdded, changesSummary } = report;

  return (
    <div className="space-y-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
        <h3 className="text-lg font-semibold text-foreground">Structure Regenerated</h3>
      </div>

      {/* What We Did Section */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" />
          What We Did
        </h4>
        <div className="space-y-2 text-sm text-foreground/80">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-medium">•</span>
            <span>Analyzed feedback and identified {feedbackAnalysis.intents.length} intent{feedbackAnalysis.intents.length !== 1 && 's'}: {feedbackAnalysis.intents.join(', ')}</span>
          </div>
          {researchConducted.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-medium">•</span>
              <span>Conducted {researchConducted.length} targeted search{researchConducted.length !== 1 && 'es'}</span>
            </div>
          )}
          {newSourcesAdded.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-medium">•</span>
              <span>Added {newSourcesAdded.length} new source{newSourcesAdded.length !== 1 && 's'}</span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-medium">•</span>
            <span>Regenerated structure with enhanced information</span>
          </div>
        </div>
      </div>

      {/* Research Conducted */}
      {researchConducted.length > 0 && (
        <div className="bg-card rounded-lg p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-3">Research Conducted</h4>
          <div className="space-y-3">
            {researchConducted.map((search, index) => (
              <div key={index} className="text-sm">
                <div className="flex items-start gap-2 text-foreground/80">
                  <span className="text-purple-600 dark:text-purple-400 font-medium">{index + 1}.</span>
                  <div>
                    <span className="font-medium">"{search.query}"</span>
                    <p className="text-muted-foreground mt-1">{search.rationale}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Sources Added */}
      {newSourcesAdded.length > 0 && (
        <div className="bg-card rounded-lg p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-3">
            New Sources Added ({newSourcesAdded.length})
          </h4>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {newSourcesAdded.map((source, index) => (
              <div key={source.id} className="relative">
                <div className="absolute -top-2 -right-2 z-10">
                  <span className="inline-block px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">
                    NEW
                  </span>
                </div>
                <SourceCard
                  source={source}
                  index={index}
                  selected={source.selected}
                  onToggle={onSourceToggle || (() => {})}
                />
              </div>
            ))}
          </div>
          {onSourceToggle && (
            <p className="text-xs text-muted-foreground mt-2">
              💡 You can deselect new sources if they're not relevant
            </p>
          )}
        </div>
      )}

      {/* Changes Made */}
      {changesSummary && (
        <div className="bg-card rounded-lg p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-3">Changes Made</h4>
          <div className="text-sm text-foreground/80 whitespace-pre-line">
            {changesSummary}
          </div>
        </div>
      )}
    </div>
  );
}
