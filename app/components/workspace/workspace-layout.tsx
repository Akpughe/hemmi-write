"use client";

import { useRef, useState, useEffect, useCallback } from "react";
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
import { useDeepResearch } from "@/lib/hooks/useDeepResearch";
import { ResearchModal } from "./research-modal";

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
    initialProjectId || null,
  );
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [plan, setPlan] = useState<DocumentPlan | null>(initialPlan);
  const [editorContent, setEditorContent] = useState(initialContent);

  // Track if we've received initial data to avoid overwriting user edits
  const [hasReceivedInitialData, setHasReceivedInitialData] = useState(
    initialSources.length > 0 || initialPlan !== null || initialContent !== ""
  );

  // Sync initial props to state when they arrive (fixes navigation loading issue)
  useEffect(() => {
    // Only sync if we haven't received data yet and now we have it
    if (!hasReceivedInitialData && initialSources.length > 0) {
      setSources(initialSources);
      setHasReceivedInitialData(true);
    }
  }, [initialSources, hasReceivedInitialData]);

  useEffect(() => {
    if (!hasReceivedInitialData && initialPlan !== null) {
      setPlan(initialPlan);
      setHasReceivedInitialData(true);
    }
  }, [initialPlan, hasReceivedInitialData]);

  useEffect(() => {
    if (!hasReceivedInitialData && initialContent !== "") {
      setEditorContent(initialContent);
      setHasReceivedInitialData(true);
    }
  }, [initialContent, hasReceivedInitialData]);

  const [chapterHandlers, setChapterHandlers] = useState<{
    approve: (index?: number) => void;
    reject: (index?: number) => void;
  } | null>(null);
  const [askAIContext, setAskAIContext] = useState<string | null>(null);
  const [insertRequest, setInsertRequest] = useState<string | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    initialLastSavedAt ? new Date(initialLastSavedAt) : null,
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
  const [paywallReason, setPaywallReason] = useState<
    "insufficient_tokens" | "no_subscription"
  >("insufficient_tokens");
  const [autoApproveEnabled, setAutoApproveEnabled] = useState<boolean>(false);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [isInlineResearchActive, setIsInlineResearchActive] = useState(false);

  // Deep research streaming hook
  const deepResearch = useDeepResearch();

  // Handle streaming research completion - merge papers into sources
  const handleStreamingResearchComplete = useCallback((newSources: Source[]) => {
    setSources((prev) => {
      // Deduplicate by URL
      const existingUrls = new Set(prev.map((s) => s.url.toLowerCase()));
      const uniqueNew = newSources.filter(
        (s) => !existingUrls.has(s.url.toLowerCase())
      );
      return [...prev, ...uniqueNew];
    });
    setShowResearchModal(false);
    setIsInlineResearchActive(false);
  }, []);

  // Check for 402 Payment Required errors from deep research
  useEffect(() => {
    if (deepResearch.error) {
      const errorMsg = deepResearch.error.message || "";
      const errorCode = deepResearch.error.code || "";

      console.log("🔍 [WorkspaceLayout] Deep research error detected:", {
        message: errorMsg,
        code: errorCode,
        fullError: deepResearch.error,
      });

      // Check if it's a payment/subscription error
      const isPaymentError =
        errorMsg.includes("402") ||
        errorMsg.includes("INSUFFICIENT_TOKENS") ||
        errorMsg.includes("NO_SUBSCRIPTION") ||
        errorMsg.includes("no active subscription") ||
        errorMsg.includes("Payment Required") ||
        errorCode === "NO_SUBSCRIPTION";

      if (isPaymentError) {
        console.log("💳 [WorkspaceLayout] Payment Required from research - showing paywall");
        setPaywallReason("no_subscription");
        setShowPaywall(true);
        setIsInlineResearchActive(false);
      }
    }
  }, [deepResearch.error]);

  // Sync deepResearch phase completion with researchStatus
  useEffect(() => {
    if (deepResearch.phase === "complete" && isInlineResearchActive) {
      // Convert papersComplete to Source[] format
      const newSources: Source[] = deepResearch.papersComplete.map((paper) => ({
        id: paper.id,
        title: paper.title,
        url: paper.url || "",
        snippet: paper.abstract || "",
        author: paper.authors,
        publishedDate: paper.year ? `${paper.year}` : undefined,
        selected: true,
        journalName: paper.journalName,
        volume: paper.volume,
        issue: paper.issue,
        pages: paper.pages,
        doi: paper.doi,
        year: paper.year,
        publisher: paper.publisher,
        publicationType: paper.publicationType,
        authorsStructured: paper.authorsStructured,
      }));

      // Call completion handler to merge sources
      handleStreamingResearchComplete(newSources);

      // Update research status to done
      setResearchStatus({
        phase: "done",
        error: null,
        completedAt: new Date(),
      });
    } else if (deepResearch.phase === "error" && isInlineResearchActive) {
      // Handle error state
      setResearchStatus({
        phase: "error",
        error: deepResearch.phaseMessage || "Research failed",
        completedAt: null,
      });
      setIsInlineResearchActive(false);
    }
  }, [deepResearch.phase, deepResearch.papersComplete, deepResearch.phaseMessage, isInlineResearchActive, handleStreamingResearchComplete]);

  // Start inline research for new projects (no sources yet)
  const handleStartInlineResearch = useCallback(async () => {
    if (!brief.topic) return;

    setIsInlineResearchActive(true);

    // Ensure project exists first
    const currentProjectId = await ensureProject();
    if (!currentProjectId) {
      setIsInlineResearchActive(false);
      return;
    }

    // Start streaming research
    await deepResearch.executeWithStream(
      {
        query: brief.topic,
        maxPapers: brief.sourceCount || 5,
        targetCompleteness: 0.8,
      },
      currentProjectId
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief.topic, brief.sourceCount]);

  // Load user preference for auto-approve on workspace mount
  useEffect(() => {
    const loadUserPreference = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.user?.preferences?.autoApproveChapters !== undefined) {
            setAutoApproveEnabled(data.user.preferences.autoApproveChapters);
          }
        }
      } catch (error) {
        console.error("Failed to load user preferences:", error);
      }
    };

    loadUserPreference();
  }, []);

  // Handler to open paywall modal
  const handleUpgradeClick = () => {
    console.log("🔥 [WorkspaceLayout] Upgrade button clicked");
    setPaywallReason("insufficient_tokens");
    setShowPaywall(true);
  };

  // Helper to handle 402 Payment Required errors
  const handle402Error = useCallback((response: Response) => {
    if (response.status === 402) {
      console.log("💳 [WorkspaceLayout] 402 Payment Required - showing paywall");
      setPaywallReason("no_subscription");
      setShowPaywall(true);
      return true;
    }
    return false;
  }, []);

  // Intercept step change to update project status in DB
  const handleStepChange = async (step: WorkflowStep) => {
    onStepChange(step);

    // Update workflow step in DB for every transition
    if (projectId) {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
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

        // Check for 402 Payment Required
        handle402Error(response);
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

      // Check for 402 Payment Required
      if (handle402Error(response)) {
        return;
      }

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

      // Check for 402 Payment Required
      if (handle402Error(response)) {
        return;
      }

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

      // Check for 402 Payment Required
      if (handle402Error(response)) {
        return;
      }

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
                    plan.sections,
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
    sections: DocumentPlan["sections"],
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
      "\\$&",
    );
    const sectionRegex = new RegExp(
      `<h[1-6][^>]*>\\s*${escapedTitle}\\s*<\\/h[1-6]>`,
      "i",
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
          "\\$&",
        );
        const nextRegex = new RegExp(
          `<h[1-6][^>]*>\\s*${escapedNextTitle}\\s*<\\/h[1-6]>`,
          "i",
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
        "\\$&",
      );
      const nextRegex = new RegExp(
        `<h[1-6][^>]*>\\s*${escapedNextTitle}\\s*<\\/h[1-6]>`,
        "i",
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
        autoApprove={autoApproveEnabled}
        onAutoApproveChange={setAutoApproveEnabled}
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
          onFindMoreSources={() => setShowResearchModal(true)}
          onStartInlineResearch={handleStartInlineResearch}
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
          onStartResearch={() => {
            // For new projects (no sources), use inline research
            // For existing projects, use modal
            if (sources.length === 0) {
              handleStartInlineResearch();
            } else {
              setShowResearchModal(true);
            }
          }}
          isInlineResearchActive={isInlineResearchActive}
          structurePhase={structureStatus.phase}
          structureError={structureStatus.error}
          structureCompletedAt={structureStatus.completedAt}
          autoApproveEnabled={autoApproveEnabled}
          streamingResearch={
            deepResearch.isStreaming
              ? {
                  isStreaming: deepResearch.isStreaming,
                  phase: deepResearch.phase,
                  phaseMessage: deepResearch.phaseMessage,
                  papersFound: deepResearch.papersFound,
                  papersEnriching: deepResearch.papersEnriching,
                  papersComplete: deepResearch.papersComplete,
                  papersFailed: deepResearch.papersFailed,
                  targetCount: deepResearch.targetCount,
                  completedCount: deepResearch.completedCount,
                  savedCount: deepResearch.savedCount,
                  tokensUsed: deepResearch.tokensUsed,
                  tokensRemaining: deepResearch.tokensRemaining,
                  tokenWarning: deepResearch.tokenWarning,
                  tokenExhausted: deepResearch.tokenExhausted,
                }
              : undefined
          }
          onCancelResearch={() => {
            deepResearch.cancel();
            setIsInlineResearchActive(false);
          }}
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

      {/* Research Modal - for "Find more sources" */}
      {projectId && (
        <ResearchModal
          open={showResearchModal}
          onOpenChange={setShowResearchModal}
          projectId={projectId}
          existingSources={sources}
          topic={brief.topic || ""}
          targetCount={5}
          onComplete={handleStreamingResearchComplete}
          onUpgrade={() => {
            setPaywallReason("insufficient_tokens");
            setShowPaywall(true);
          }}
        />
      )}
    </div>
  );
}
