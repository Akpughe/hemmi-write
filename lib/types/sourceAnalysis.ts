export interface AnalyzedSource {
  sourceId: string;
  keyClaims: string[];
  methodology: string;
  keyFindings: string;
  limitations: string;
  themes: string[];
  bestUsedFor: string;
  yearCategory: 'recent' | 'established' | 'seminal';
}

export interface ThematicCluster {
  themeId: string;
  label: string;
  sourceIds: string[];
  consensusView: string;
  tensions: string;
}

export interface SourceAnalysis {
  sources: AnalyzedSource[];
  thematicClusters: ThematicCluster[];
  researchGaps: string[];
  suggestedCentralArgument: string;
}

export interface SectionMapping {
  sectionHeading: string;
  relevantSourceIds: string[];
  sectionThesis: string;
  argumentRole: 'establishes_context' | 'builds_evidence' | 'addresses_counterarguments' | 'synthesizes';
  suggestedApproach: string;
}

export interface ChapterArgumentSummary {
  chapterHeading: string;
  thesisAdvanced: string;
  keyEvidence: string[];
  connectionToNext: string;
}
