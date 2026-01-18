"use client";

import { useRef, useState } from "react";
import type {
  WritingBrief,
  WorkflowStep,
  Source,
  DocumentPlan,
} from "@/lib/types/ui";
import { WorkspaceHeader } from "./workspace-header";
import { LeftPanel } from "./left-panel";
import { EditorPanel } from "./editor-panel";
import { RightPanel, type PersistedMessage } from "./right-panel";
import { SourceAdditionBanner } from "./source-addition-banner";
import {
  SourceImpactAnalysis,
  type ImpactAnalysisResult,
} from "./source-impact-analysis";
import { EditWarningModal } from "./edit-warning-modal";
import { PaywallModal } from "@/app/components/subscription/paywall-modal";
import { hasManualEdits } from "@/lib/utils/contentTracking";
import { useCreateProject } from "@/lib/hooks/use-projects";
import { useRouter } from "next/navigation";
import { mapUIDocumentTypeToEnum } from "@/lib/utils/documentTypeMapper";

interface WorkspaceLayoutProps {
  brief: WritingBrief;
  currentStep: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
  projectId?: string | null;
  initialSources?: Source[];
  initialPlan?: DocumentPlan | null;
  initialContent?: string;
  initialMessages?: PersistedMessage[];
  initialLastSavedAt?: string | null;
  isFetching?: boolean;
}

export function WorkspaceLayout({
  brief,
  currentStep,
  onStepChange,
  projectId: initialProjectId,
  initialSources = [],
  initialPlan = null,
  initialContent = "",
  initialMessages = [],
  initialLastSavedAt = null,
  isFetching = false,
}: WorkspaceLayoutProps) {
  const router = useRouter();
  const createProject = useCreateProject();
  const [projectId, setProjectId] = useState<string | null>(
    initialProjectId || null
  );
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [plan, setPlan] = useState<DocumentPlan | null>(initialPlan);
  const [editorContent, setEditorContent] = useState(initialContent);
  const [chapterHandlers, setChapterHandlers] = useState<{
    approve: (index?: number) => void;
    reject: (index?: number) => void;
  } | null>(null);
  const [askAIContext, setAskAIContext] = useState<string | null>(null);
  const [insertRequest, setInsertRequest] = useState<string | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    initialLastSavedAt ? new Date(initialLastSavedAt) : null
  );
  const [newSourceAdded, setNewSourceAdded] = useState<{
    sourceId: string;
    title: string;
    workflowStep: WorkflowStep;
  } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [impactAnalysisResults, setImpactAnalysisResults] = useState<{
    sourceName: string;
    results: ImpactAnalysisResult[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [pendingRegenerationSections, setPendingRegenerationSections] =
    useState<string[]>([]);
  const [currentDocument, setCurrentDocument] = useState<{
    created_at: string;
    updated_at: string;
  } | null>(null);
  const [researchStatus, setResearchStatus] = useState<{
    phase: "idle" | "loading" | "done" | "error";
    error: string | null;
    completedAt: Date | null;
  }>({ phase: "idle", error: null, completedAt: null });
  const [structureStatus, setStructureStatus] = useState<{
    phase: "idle" | "loading" | "done" | "error";
    error: string | null;
    completedAt: Date | null;
  }>({ phase: "idle", error: null, completedAt: null });
  const generateStructureRef = useRef<null | (() => void)>(null);
  const [canGenerateStructure, setCanGenerateStructure] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'insufficient_tokens' | 'no_subscription'>('insufficient_tokens');

  // Handler to open paywall modal
  const handleUpgradeClick = () => {
    console.log('🔥 [WorkspaceLayout] Upgrade button clicked');
    setPaywallReason('insufficient_tokens');
    setShowPaywall(true);
  };

  // Intercept step change to update project status in DB
  const handleStepChange = async (step: WorkflowStep) => {
    onStepChange(step);

    // Update workflow step in DB for every transition
    if (projectId) {
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflow_step: step,
            is_complete: step === "complete",
            ...(step === "complete" && {
              completed_at: new Date().toISOString(),
            }),
          }),
        });
      } catch (error) {
        console.error("Failed to update project workflow step:", error);
      }
    }
  };

  const handleAskAI = (text: string) => {
    setAskAIContext(text);
  };

  const handleInsert = (text: string) => {
    setInsertRequest(text);
  };

  const handleSourceAdded = (data: {
    sourceId: string;
    title: string;
    workflowStep: WorkflowStep;
  }) => {
    setNewSourceAdded(data);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      setNewSourceAdded(null);
    }, 10000);
  };

  const handleRegenerateStructure = async () => {
    if (!newSourceAdded || !plan || !projectId) return;

    setIsRegenerating(true);
    try {
      const response = await fetch("/api/write/structure/deep-regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: mapUIDocumentTypeToEnum(brief.documentType),
          topic: brief.topic,
          instructions: brief.instructions,
          wordCount: brief.wordCount,
          currentStructure: {
            title: plan.title,
            approach: plan.approach,
            tone: plan.tone,
            sections: plan.sections.map((s) => ({
              heading: s.title,
              description: "",
              keyPoints: s.keyPoints,
            })),
            estimatedWordCount: brief.wordCount || 3000,
          },
          existingSources: sources.map((s) => ({
            id: s.id,
            title: s.title,
            url: s.url,
            excerpt: s.snippet || "",
            author: s.author,
            publishedDate: s.publishedDate,
            selected: s.selected,
          })),
          userFeedback: `Incorporate the newly added source: "${newSourceAdded.title}"`,
          projectId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate structure");
      }

      type RegeneratedSection = {
        heading: string;
        keyPoints?: string[];
        id?: string;
      };
      type RegeneratedSource = {
        id?: string;
        title: string;
        url: string;
        excerpt?: string;
        author?: string;
        publishedDate?: string;
      };
      const result: {
        structure: {
          title: string;
          approach: string;
          tone: string;
          sections: RegeneratedSection[];
        };
        regenerationReport?: { newSourcesAdded?: RegeneratedSource[] };
      } = await response.json();

      // Update plan with regenerated structure
      setPlan({
        title: result.structure.title,
        approach: result.structure.approach,
        tone: result.structure.tone,
        sections: result.structure.sections.map((s, index: number) => ({
          id: s.id || `section-${index}`,
          title: s.heading,
          keyPoints: s.keyPoints || [],
          status: "pending" as const,
        })),
        tableOfContents: undefined,
      });

      // Update sources if new ones were added
      const addedSources = result.regenerationReport?.newSourcesAdded;
      if (addedSources && addedSources.length > 0) {
        const newSources: Source[] = addedSources.map((s) => ({
          id: s.id || Math.random().toString(36).slice(2, 11),
          title: s.title,
          url: s.url,
          snippet: s.excerpt || "",
          author: s.author,
          publishedDate: s.publishedDate,
          selected: true,
        }));
        setSources([...sources, ...newSources]);
      }

      setNewSourceAdded(null);
    } catch (error) {
      console.error("Structure regeneration error:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAnalyzeImpact = async () => {
    if (!newSourceAdded || !plan || !projectId) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/write/analyze-source-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          sourceId: newSourceAdded.sourceId,
          documentType: brief.documentType,
          topic: brief.topic,
          currentStructure: {
            sections: plan.sections.map((s) => ({
              id: s.id,
              title: s.title,
              description: "",
              keyPoints: s.keyPoints,
            })),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze source impact");
      }

      const result = await response.json();

      setImpactAnalysisResults({
        sourceName: result.sourceTitle,
        results: result.analysis,
      });

      setNewSourceAdded(null);
    } catch (error) {
      console.error("Impact analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRegenerateSections = async (sectionIds: string[]) => {
    if (
      !impactAnalysisResults ||
      sectionIds.length === 0 ||
      !plan ||
      !projectId
    )
      return;

    // Check if document has manual edits
    if (projectId && !currentDocument) {
      // Fetch document metadata
      try {
        const response = await fetch(`/api/projects/${projectId}/content`);
        if (response.ok) {
          const data = await response.json();
          if (data.document) {
            setCurrentDocument({
              created_at: data.document.created_at,
              updated_at: data.document.updated_at,
            });

            // Check if we should show warning
            if (hasManualEdits(data.document)) {
              setPendingRegenerationSections(sectionIds);
              setShowEditWarning(true);
              return;
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch document metadata:", error);
      }
    } else if (currentDocument && hasManualEdits(currentDocument)) {
      // Show warning if edits exist
      setPendingRegenerationSections(sectionIds);
      setShowEditWarning(true);
      return;
    }

    // Proceed with regeneration
    await performSectionRegeneration(sectionIds);
  };

  const handleConfirmRegeneration = async () => {
    if (!pendingRegenerationSections.length || !projectId) return;

    // Create version snapshot if document has manual edits
    if (currentDocument && hasManualEdits(currentDocument)) {
      try {
        await fetch(`/api/projects/${projectId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkpoint_type: "before_source_regeneration",
            structure_snapshot: {
              title: plan?.title,
              approach: plan?.approach,
              tone: plan?.tone,
              sections: plan?.sections,
            },
            sources_snapshot: sources,
            content_snapshot: editorContent,
            description: `Before regenerating ${pendingRegenerationSections.length} section(s) with new source`,
          }),
        });
      } catch (error) {
        console.error("Failed to create version snapshot:", error);
      }
    }

    setShowEditWarning(false);
    await performSectionRegeneration(pendingRegenerationSections);
    setPendingRegenerationSections([]);
  };

  const performSectionRegeneration = async (sectionIds: string[]) => {
    if (!impactAnalysisResults || !plan || !projectId) return;

    setIsRegenerating(true);

    try {
      // Get all source IDs (existing + new)
      const sourceIds = sources.filter((s) => s.selected).map((s) => s.id);

      const response = await fetch("/api/write/regenerate-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          sectionIds,
          sourceIds,
          brief: {
            documentType: mapUIDocumentTypeToEnum(brief.documentType),
            topic: brief.topic,
            instructions: brief.instructions,
            wordCount: brief.wordCount,
            academicLevel: brief.academicLevel,
            writingStyle: brief.writingStyle,
            citationStyle: brief.citationStyle,
          },
          currentStructure: {
            title: plan.title,
            approach: plan.approach,
            tone: plan.tone,
            sections: plan.sections.map((s) => ({
              id: s.id,
              title: s.title,
              keyPoints: s.keyPoints,
              estimatedWordCount: 500,
            })),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate sections");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Process streaming updates
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.done) {
                break;
              }

              if (data.sectionId && data.content) {
                // Replace section content
                const sectionTitle = data.sectionTitle;
                const newSectionContent = data.content;

                setEditorContent((prevContent) => {
                  // Find and replace section
                  return replaceSectionInContent(
                    prevContent,
                    sectionTitle,
                    newSectionContent,
                    plan.sections
                  );
                });
              }
            } catch {
              console.warn("Failed to parse SSE data:", line);
            }
          }
        }
      }

      setImpactAnalysisResults(null);
    } catch (error) {
      console.error("Section regeneration error:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Helper function to replace a section in the content
  const replaceSectionInContent = (
    currentContent: string,
    sectionTitle: string,
    newSectionContent: string,
    sections: DocumentPlan["sections"]
  ): string => {
    // Find the section index
    const sectionIndex = sections.findIndex((s) => s.title === sectionTitle);
    if (sectionIndex === -1) {
      // Section not found, append to end
      return currentContent + "\n\n" + newSectionContent;
    }

    const currentSection = sections[sectionIndex];
    const nextSection = sections[sectionIndex + 1];

    // Find start of current section
    const escapedTitle = currentSection.title.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    const sectionRegex = new RegExp(
      `<h[1-6][^>]*>\\s*${escapedTitle}\\s*<\\/h[1-6]>`,
      "i"
    );
    const match = currentContent.match(sectionRegex);

    let startIndex = 0;
    if (match && match.index !== undefined) {
      startIndex = match.index;
    } else {
      // Section header not found, try to insert before next section
      if (nextSection) {
        const escapedNextTitle = nextSection.title.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        const nextRegex = new RegExp(
          `<h[1-6][^>]*>\\s*${escapedNextTitle}\\s*<\\/h[1-6]>`,
          "i"
        );
        const nextMatch = currentContent.match(nextRegex);
        if (nextMatch && nextMatch.index !== undefined) {
          startIndex = nextMatch.index;
        } else {
          startIndex = currentContent.length;
        }
      } else {
        startIndex = currentContent.length;
      }
    }

    // Find end of current section (start of next section or end of content)
    let endIndex = currentContent.length;
    if (nextSection) {
      const escapedNextTitle = nextSection.title.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const nextRegex = new RegExp(
        `<h[1-6][^>]*>\\s*${escapedNextTitle}\\s*<\\/h[1-6]>`,
        "i"
      );
      const nextMatch = currentContent.slice(startIndex).match(nextRegex);
      if (nextMatch && nextMatch.index !== undefined) {
        endIndex = startIndex + nextMatch.index;
      }
    }

    // Replace the section
    const prefix = currentContent.slice(0, startIndex);
    const suffix = currentContent.slice(endIndex);
    const separator = prefix && !prefix.endsWith("\n") ? "\n\n" : "";

    return prefix + separator + newSectionContent + suffix;
  };

  // Create project if not exists when saving or moving steps
  const ensureProject = async () => {
    if (projectId) return projectId;

    try {
      const result = await createProject.mutateAsync({
        title: brief.topic || "Untitled Project",
        topic: brief.topic || "",
        document_type: brief.documentType || "research-paper",
        academic_level: brief.academicLevel,
        writing_style: brief.writingStyle,
        citation_style: brief.citationStyle,
        target_word_count: brief.wordCount || undefined,
      });

      const newProjectId = result.project.id;
      setProjectId(newProjectId);

      // Update URL without reload
      router.replace(`/workspace?projectId=${newProjectId}`);

      return newProjectId;
    } catch (error) {
      console.error("Failed to create project:", error);
      return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <WorkspaceHeader
        brief={brief}
        currentStep={currentStep}
        isFetching={isFetching}
        onUpgradeClick={handleUpgradeClick}
      />

      {/* Source Addition Notification Banner */}
      {newSourceAdded && (
        <SourceAdditionBanner
          sourceName={newSourceAdded.title}
          workflowStep={newSourceAdded.workflowStep}
          onRegenerateStructure={handleRegenerateStructure}
          onAnalyzeImpact={handleAnalyzeImpact}
          onDismiss={() => setNewSourceAdded(null)}
          isProcessing={isRegenerating || isAnalyzing}
        />
      )}

      {/* Impact Analysis Results */}
      {impactAnalysisResults && (
        <div className="px-4 py-3 bg-background">
          <SourceImpactAnalysis
            sourceName={impactAnalysisResults.sourceName}
            results={impactAnalysisResults.results}
            onRegenerateSections={handleRegenerateSections}
            onDismiss={() => setImpactAnalysisResults(null)}
            isRegenerating={isRegenerating}
          />
        </div>
      )}

      {/* Edit Warning Modal */}
      <EditWarningModal
        isOpen={showEditWarning}
        sectionsToRegenerate={
          plan?.sections
            .filter((s) => pendingRegenerationSections.includes(s.id))
            .map((s) => s.title) || []
        }
        onConfirm={handleConfirmRegeneration}
        onCancel={() => {
          setShowEditWarning(false);
          setPendingRegenerationSections([]);
        }}
        hasManualEdits={
          currentDocument ? hasManualEdits(currentDocument) : false
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Research/Outline */}
        <LeftPanel
          currentStep={currentStep}
          sources={sources}
          setSources={setSources}
          plan={plan}
          setPlan={setPlan}
          onStepChange={handleStepChange}
          brief={brief}
          chapterHandlers={chapterHandlers}
          projectId={projectId}
          onEnsureProject={ensureProject}
          onSourceAdded={handleSourceAdded}
          onResearchStatusChange={(status) => {
            setResearchStatus({
              phase: status.phase,
              error: status.error ?? null,
              completedAt: status.completedAt
                ? new Date(status.completedAt)
                : null,
            });
          }}
          onStructureStatusChange={(status) => {
            setStructureStatus({
              phase: status.phase,
              error: status.error ?? null,
              completedAt: status.completedAt
                ? new Date(status.completedAt)
                : null,
            });
          }}
          onRegisterGenerateStructure={(handler) => {
            generateStructureRef.current = handler;
            setCanGenerateStructure(Boolean(handler));
          }}
        />

        {/* Center - Editor */}
        <EditorPanel
          content={editorContent}
          setContent={setEditorContent}
          plan={plan}
          setPlan={setPlan}
          currentStep={currentStep}
          brief={brief}
          sources={sources}
          setChapterHandlers={setChapterHandlers}
          onStepChange={handleStepChange}
          onAskAI={handleAskAI}
          insertRequest={insertRequest}
          onInsertComplete={() => setInsertRequest(null)}
          projectId={projectId}
          onEnsureProject={ensureProject}
          onSave={setLastSavedAt}
          lastSavedAt={lastSavedAt}
          researchPhase={researchStatus.phase}
          researchError={researchStatus.error}
          researchCompletedAt={researchStatus.completedAt}
          canGenerateStructure={canGenerateStructure}
          onGenerateStructure={() => generateStructureRef.current?.()}
          structurePhase={structureStatus.phase}
          structureError={structureStatus.error}
          structureCompletedAt={structureStatus.completedAt}
        />

        {/* Right Panel - Brief & Chat */}
        <div className="relative">
          <RightPanel
            brief={brief}
            currentStep={currentStep}
            askAIContext={askAIContext}
            onClearContext={() => setAskAIContext(null)}
            sources={sources}
            currentContent={editorContent}
            onInsert={handleInsert}
            isOpen={isRightPanelOpen}
            onToggle={() => setIsRightPanelOpen(!isRightPanelOpen)}
            projectId={projectId}
            initialMessages={initialMessages}
            onRefreshSources={async () => {
              // Trigger a refetch of the project data
              if (projectId) {
                window.location.reload(); // Simple reload for now
              }
            }}
          />
        </div>
      </div>

      {/* Paywall Modal - triggered from header or low balance */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        reason={paywallReason}
      />
    </div>
  );
}
