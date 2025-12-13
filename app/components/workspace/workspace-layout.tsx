"use client";

import { useState } from "react";
import type {
  WritingBrief,
  WorkflowStep,
  Source,
  DocumentPlan,
} from "@/lib/types/ui";
import { WorkspaceHeader } from "./workspace-header";
import { LeftPanel } from "./left-panel";
import { EditorPanel } from "./editor-panel";
import { RightPanel } from "./right-panel";
import { useCreateProject } from "@/lib/hooks/use-projects";
import { useRouter } from "next/navigation";

interface WorkspaceLayoutProps {
  brief: WritingBrief;
  currentStep: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
  projectId?: string | null;
  initialSources?: Source[];
  initialPlan?: DocumentPlan | null;
  initialContent?: string;
  initialMessages?: any[];
  initialLastSavedAt?: string | null;
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

  // Intercept step change to update project status in DB
  const handleStepChange = async (step: WorkflowStep) => {
    onStepChange(step);

    // If moving to complete, update the project in DB
    if (step === "complete" && projectId) {
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflow_step: "complete",
            is_complete: true,
          }),
        });
      } catch (error) {
        console.error("Failed to update project status:", error);
      }
    }
  };

  const handleAskAI = (text: string) => {
    setAskAIContext(text);
  };

  const handleInsert = (text: string) => {
    setInsertRequest(text);
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
      <WorkspaceHeader brief={brief} currentStep={currentStep} />

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
          />
        </div>
      </div>
    </div>
  );
}
