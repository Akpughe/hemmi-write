"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { WritingBrief, WorkflowStep } from "@/lib/types/ui";
import { WorkspaceLayout } from "@/app/components/workspace/workspace-layout";

export default function WorkspacePage() {
  const router = useRouter();
  const [brief, setBrief] = useState<WritingBrief | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("research");
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Only run once on mount to prevent redirect loops
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const stored = localStorage.getItem("writingBrief");
    if (stored) {
      setBrief(JSON.parse(stored));
      // Clear localStorage after successfully loading the data
      // This prevents auto-redirect on future homepage visits
      localStorage.removeItem("writingBrief");
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
