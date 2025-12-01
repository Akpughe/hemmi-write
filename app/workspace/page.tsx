"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WritingBrief, WorkflowStep } from "@/lib/types/ui";
import { WorkspaceLayout } from "@/app/components/workspace/workspace-layout";

export default function WorkspacePage() {
  const router = useRouter();
  const [brief, setBrief] = useState<WritingBrief | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("research");

  useEffect(() => {
    const stored = sessionStorage.getItem("writingBrief");
    if (stored) {
      setBrief(JSON.parse(stored));
    } else {
      router.push("/");
    }
  }, [router]);

  if (!brief) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <WorkspaceLayout
      brief={brief}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
    />
  );
}
