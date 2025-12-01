"use client";

import { useState } from "react";
import type {
  WritingBrief,
  WorkflowStep,
  Source,
  DocumentPlan,
} from "@/lib/types";
import { WorkspaceHeader } from "./workspace-header";
import { LeftPanel } from "./left-panel";
import { EditorPanel } from "./editor-panel";
import { RightPanel } from "./right-panel";

interface WorkspaceLayoutProps {
  brief: WritingBrief;
  currentStep: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
}

export function WorkspaceLayout({
  brief,
  currentStep,
  onStepChange,
}: WorkspaceLayoutProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [plan, setPlan] = useState<DocumentPlan | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [chapterHandlers, setChapterHandlers] = useState<{
    approve: () => void;
    reject: () => void;
  } | null>(null);

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
          onStepChange={onStepChange}
          brief={brief}
          chapterHandlers={chapterHandlers}
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
          onStepChange={onStepChange}
        />

        {/* Right Panel - Brief & Chat */}
        <RightPanel brief={brief} currentStep={currentStep} />
      </div>
    </div>
  );
}
