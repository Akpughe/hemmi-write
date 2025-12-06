"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspaceLayout } from "@/app/components/workspace/workspace-layout";
import {
  WritingBrief,
  WorkflowStep,
  Source,
  DocumentPlan,
} from "@/lib/types/ui";
import { useSupabase } from "@/lib/context/SupabaseContext";
import {
  mapEnumToUIDocumentType,
  mapEnumAcademicLevelToUI,
  mapEnumWritingStyleToUI,
} from "@/lib/utils/documentTypeMapper";

// Define locally if not exported from UI types, or if it is a DB type
interface DocumentStructure {
  id: string;
  title: string;
  approach: string;
  tone: string;
  sections: any[];
  table_of_contents?: any;
}

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const { session, isLoading: isSessionLoading } = useSupabase();

  const [brief, setBrief] = useState<WritingBrief | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("research");
  const [initialData, setInitialData] = useState<{
    sources: Source[];
    plan: DocumentPlan | null;
    content: string;
    lastSavedAt: string | null;
    messages: any[];
  } | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  useEffect(() => {
    // Wait for session to be initialized before proceeding
    if (isSessionLoading) {
      console.log("Waiting for session to initialize...");
      return;
    }

    async function loadData() {
      setIsLoadingProject(true);

      // Scenario 1: Loading existing project by ID with authenticated user
      if (projectId && session) {
        console.log("Loading existing project:", projectId);
        try {
          const response = await fetch(`/api/projects/${projectId}`);
          if (!response.ok) throw new Error("Failed to load project");

          const data = await response.json();
          const { project, sources, structure, document, messages } = data;

          // Map project to brief
          // Ensure we map from DB enum values (e.g. RESEARCH_PAPER) back to UI strings (e.g. research-paper)
          const mappedBrief: WritingBrief = {
            documentType: mapEnumToUIDocumentType(
              project.document_type as any
            ) as any,
            topic: project.topic,
            instructions: project.instructions || "",
            academicLevel: mapEnumAcademicLevelToUI(
              project.academic_level as any
            ).toLowerCase() as any,
            writingStyle: mapEnumWritingStyleToUI(
              project.writing_style as any
            ).toLowerCase() as any,
            citationStyle: project.citation_style || "APA",
            includeSources: true, // Default to true for now
            chapters: project.chapters || structure?.sections?.length || 0,
          };

          // Map structure to plan
          let mappedPlan: DocumentPlan | null = null;
          if (structure) {
            mappedPlan = {
              title: structure.title,
              approach: structure.approach,
              tone: structure.tone,
              tableOfContents: structure.table_of_contents,
              sections:
                structure.sections?.map((s: any) => {
                  const rawKeyPoints = s.key_points || s.keyPoints;
                  let keyPoints: string[] = [];

                  if (Array.isArray(rawKeyPoints)) {
                    keyPoints = rawKeyPoints;
                  } else if (
                    rawKeyPoints &&
                    Array.isArray(rawKeyPoints.points)
                  ) {
                    keyPoints = rawKeyPoints.points;
                  }

                  return {
                    id: s.id,
                    title: s.heading,
                    keyPoints: keyPoints,
                    status: "complete", // Default to complete for loaded projects? Or pending if no content?
                  };
                }) || [],
            };
          }

          // Map sources
          const mappedSources: Source[] = sources.map((s: any) => ({
            id: s.id,
            title: s.title,
            url: s.url,
            snippet: s.excerpt || "",
            selected: true, // If saved in DB, it is selected/used
          }));

          setBrief(mappedBrief);
          setInitialData({
            sources: mappedSources,
            plan: mappedPlan,
            content: document?.content || "",
            lastSavedAt: document?.updated_at || null,
            messages: messages || [],
          });
          setCurrentStep((project.workflow_step as WorkflowStep) || "research");
        } catch (error) {
          console.error("Error loading project:", error);
          // On error, try localStorage fallback
          loadFromLocalStorage();
        }
      }
      // Scenario 2: ProjectId exists but no session - redirect to login
      else if (projectId && !session) {
        console.log("Project requires authentication - redirecting to home");
        router.push("/");
      }
      // Scenario 3: No projectId, check localStorage
      else {
        console.log("No projectId - checking localStorage");
        loadFromLocalStorage();
      }

      setIsLoadingProject(false);
    }

    function loadFromLocalStorage() {
      const stored = localStorage.getItem("writingBrief");
      if (stored) {
        console.log("Loaded brief from localStorage");
        setBrief(JSON.parse(stored));
        // Clear localStorage after successful load to prevent reuse
        localStorage.removeItem("writingBrief");
      } else if (!projectId) {
        // No project ID and no localStorage - redirect to home
        console.log("No brief found - redirecting to home");
        router.push("/");
      }
    }

    loadData();
  }, [projectId, session, isSessionLoading, router]);

  // Show different loading states
  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Initializing session...
        </div>
      </div>
    );
  }

  if (isLoadingProject || !brief) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <WorkspaceLayout
      key={projectId || "new"} // Force remount on project change
      brief={brief}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      projectId={projectId}
      initialSources={initialData?.sources}
      initialPlan={initialData?.plan}
      initialContent={initialData?.content}
      initialLastSavedAt={initialData?.lastSavedAt}
      initialMessages={initialData?.messages}
    />
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }>
      <WorkspaceContent />
    </Suspense>
  );
}
