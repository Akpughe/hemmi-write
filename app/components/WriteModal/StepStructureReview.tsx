"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  DocumentType,
  ResearchSource,
  DocumentStructure,
  RegenerationReport as RegenerationReportType,
  DOCUMENT_TYPE_CONFIGS,
  AcademicLevel,
  WritingStyle,
} from "@/lib/types/document";
import ProgressStep from "./ProgressStep";
import RegenerationReport from "./RegenerationReport";

interface StepStructureReviewProps {
  documentType: DocumentType;
  topic: string;
  instructions: string;
  wordCount: number | null;
  sources: ResearchSource[];
  academicLevel: AcademicLevel;
  writingStyle: WritingStyle;
  aiProvider: string;
  onConfirm: (
    structure: DocumentStructure,
    updatedSources?: ResearchSource[]
  ) => void;
  onBack: () => void;
}

type RegenerationPhase =
  | "analyzing"
  | "researching"
  | "regenerating"
  | "complete";

export default function StepStructureReview({
  documentType,
  topic,
  instructions,
  wordCount,
  sources,
  academicLevel,
  writingStyle,
  aiProvider,
  onConfirm,
  onBack,
}: StepStructureReviewProps) {
  const [structure, setStructure] = useState<DocumentStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationPhase, setRegenerationPhase] =
    useState<RegenerationPhase>("analyzing");
  const [regenerationReport, setRegenerationReport] =
    useState<RegenerationReportType | null>(null);
  const [currentSources, setCurrentSources] =
    useState<ResearchSource[]>(sources);

  const config = DOCUMENT_TYPE_CONFIGS[documentType];

  // Generate initial structure on mount
  useEffect(() => {
    generateStructure();
  }, []);

  const generateStructure = async (userFeedback?: string) => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/write/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          topic,
          instructions,
          wordCount: wordCount || config.suggestedWordCountMin,
          sources,
          userFeedback,
          academicLevel,
          writingStyle,
          aiProvider,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate structure");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setStructure(data.structure);
      if (userFeedback) {
        setFeedback(""); // Clear feedback after successful regeneration
      }
    } catch (err: any) {
      console.error("Structure generation error:", err);
      setError(err.message || "Failed to generate structure");
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!feedback.trim()) {
      alert(
        "Please provide feedback on what you want to change in the structure."
      );
      return;
    }

    if (!structure) {
      return;
    }

    setIsRegenerating(true);
    setRegenerationReport(null);
    await deepRegenerateStructure(feedback);
  };

  const deepRegenerateStructure = async (userFeedback: string) => {
    try {
      // Phase 1: Analyzing
      setRegenerationPhase("analyzing");
      await delay(500); // Small delay for UX

      // Phase 2: Researching
      setRegenerationPhase("researching");

      const response = await fetch("/api/write/structure/deep-regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          topic,
          instructions,
          wordCount: wordCount || config.suggestedWordCountMin,
          currentStructure: structure,
          existingSources: currentSources,
          userFeedback,
          academicLevel,
          writingStyle,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate structure");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Phase 3: Complete
      setRegenerationPhase("complete");

      // Update structure and sources
      setStructure(data.structure);
      setRegenerationReport(data.regenerationReport);

      // Merge new sources with existing ones
      if (data.regenerationReport.newSourcesAdded.length > 0) {
        const allSources = [
          ...currentSources,
          ...data.regenerationReport.newSourcesAdded,
        ];
        setCurrentSources(allSources);
      }

      // Clear feedback
      setFeedback("");
    } catch (err: any) {
      console.error("Deep regeneration error:", err);
      setError(err.message || "Failed to regenerate structure");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Helper delay function
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const handleApprove = () => {
    if (structure) {
      onConfirm(structure, currentSources);
    }
  };

  const handleSourceToggle = (id: string) => {
    setCurrentSources((prev) =>
      prev.map((source) =>
        source.id === id ? { ...source, selected: !source.selected } : source
      )
    );
  };

  if (error && !structure) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Structure Generation Failed
        </h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => generateStructure()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading || !structure) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
        <p className="text-muted-foreground text-lg">
          Planning your document structure...
        </p>
        <p className="text-muted-foreground/70 text-sm mt-2">
          Analyzing sources and creating outline
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
              Review the Writing Plan
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This is our approach for writing your {config.label.toLowerCase()}
              . You can provide feedback to refine the structure before we start
              writing.
            </p>
          </div>
        </div>
      </div>

      {/* Display Structure */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        {/* Title */}
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {structure.title}
          </h3>
          <div className="text-sm text-muted-foreground">
            {config.label} • {structure.estimatedWordCount} words •{" "}
            {structure.sections.length} sections
          </div>
        </div>

        {/* Approach & Tone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold text-foreground/80 text-sm mb-2">
              Writing Approach
            </h4>
            <p className="text-sm text-foreground">{structure.approach}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold text-foreground/80 text-sm mb-2">Tone</h4>
            <p className="text-sm text-foreground">{structure.tone}</p>
          </div>
        </div>

        {/* Sections */}
        <div>
          <h4 className="font-semibold text-foreground/80 mb-3">
            Document Structure
          </h4>

          {/* Table of Contents Preview */}
          {(structure.tableOfContents || structure.sections.length > 0) && (
            <div className="mb-6 bg-muted/50 rounded-lg p-4 border border-border">
              <h5 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Table of Contents
              </h5>
              <div className="space-y-1 pl-1">
                {(
                  structure.tableOfContents?.items ||
                  structure.sections.map((section, index) => ({
                    level: 1,
                    title: section.heading,
                    sectionNumber:
                      documentType === "RESEARCH_PAPER"
                        ? `${index + 1}`
                        : undefined,
                  }))
                ).map((item, idx) => (
                  <div key={idx} className="text-sm text-foreground/80 font-mono">
                    <span className="text-muted-foreground mr-2">
                      {item.sectionNumber || "•"}
                    </span>
                    {item.title}
                  </div>
                ))}
                {/* Always show References for Research Papers if not already in list */}
                {documentType === "RESEARCH_PAPER" &&
                  !(structure.tableOfContents?.items || []).some((i) =>
                    i.title.toLowerCase().includes("references")
                  ) && (
                    <div className="text-sm text-foreground/80 font-mono">
                      <span className="text-muted-foreground mr-2">•</span>
                      References
                    </div>
                  )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {structure.sections.map((section, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <h5 className="font-semibold text-foreground mb-1">
                  {index + 1}. {section.heading}
                </h5>
                <p className="text-sm text-muted-foreground mb-2">
                  {section.description}
                </p>
                <ul className="space-y-1">
                  {(section.keyPoints ?? []).map((point, pointIndex) => (
                    <li
                      key={pointIndex}
                      className="text-sm text-foreground/80 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regeneration Progress */}
      {isRegenerating && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-foreground mb-4">
            Deep Regeneration in Progress...
          </h4>
          <ProgressStep
            status={regenerationPhase === "analyzing" ? "active" : "completed"}
            title="Analyzing your feedback"
            description="Identifying specific requests and knowledge gaps"
          />
          <ProgressStep
            status={
              regenerationPhase === "analyzing"
                ? "pending"
                : regenerationPhase === "researching"
                ? "active"
                : "completed"
            }
            title="Researching additional sources"
            description="Conducting targeted web searches to fill gaps"
          />
          <ProgressStep
            status={
              regenerationPhase === "complete"
                ? "completed"
                : regenerationPhase === "regenerating" ||
                  regenerationPhase === "researching"
                ? "active"
                : "pending"
            }
            title="Regenerating structure"
            description="Creating improved outline with new information"
          />
        </div>
      )}

      {/* Regeneration Report */}
      {regenerationReport && !isRegenerating && (
        <RegenerationReport
          report={regenerationReport}
          onSourceToggle={handleSourceToggle}
        />
      )}

      {/* Feedback Section */}
      {!isRegenerating && (
        <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
          <label
            htmlFor="feedback"
            className="block text-sm font-medium text-foreground">
            Want to make changes? Provide feedback:
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g., Add a section on case studies, expand the methodology section, change the tone to be more persuasive, include more analysis on environmental impacts..."
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-card text-foreground"
            rows={3}
          />
          <button
            onClick={handleRegenerate}
            disabled={!feedback.trim()}
            className="w-full px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            Deep Regenerate Structure
          </button>
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleApprove}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Approve & Generate Document
        </button>
      </div>
    </div>
  );
}
