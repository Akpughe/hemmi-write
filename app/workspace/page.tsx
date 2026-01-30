"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
import { useProject } from "@/lib/hooks/use-projects";

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

  console.log("[WorkspaceContent] Mounted:", {
    projectId,
    isSessionLoading,
    hasSession: !!session,
  });

  // Use React Query to fetch project data (only when projectId exists and session is ready)
  const {
    data: projectData,
    isLoading: isLoadingProject,
    isFetching: isFetchingProject,
    error: projectError,
  } = useProject(projectId && session ? projectId : null);

  const [localStorageBrief, setLocalStorageBrief] =
    useState<WritingBrief | null>(null);
  const [hasCheckedLocalStorage, setHasCheckedLocalStorage] = useState(false);

  // Load localStorage brief (only when no projectId, and only once)
  useEffect(() => {
    if (projectId || hasCheckedLocalStorage || isSessionLoading) {
      return;
    }

    setHasCheckedLocalStorage(true);
    const stored = localStorage.getItem("writingBrief");
    if (stored) {
      console.log("Loaded brief from localStorage");
      const parsed = JSON.parse(stored);
      localStorage.removeItem("writingBrief");
      setLocalStorageBrief(parsed);
    } else {
      console.log("No brief found - redirecting to home");
      router.push("/");
    }
  }, [projectId, hasCheckedLocalStorage, isSessionLoading, router]);

  // Transform project data from React Query using useMemo
  const { brief, initialData } = useMemo(() => {
    if (!projectData) {
      return {
        brief: localStorageBrief,
        initialData: null,
      };
    }

    const { project, sources, structure, document, messages } = projectData;

    // Map project to brief
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
      includeSources: true,
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
          structure.sections
            ?.map((s: any) => {
              const rawKeyPoints = s.key_points || s.keyPoints;
              let keyPoints: string[] = [];

              if (Array.isArray(rawKeyPoints)) {
                keyPoints = rawKeyPoints;
              } else if (rawKeyPoints && Array.isArray(rawKeyPoints.points)) {
                keyPoints = rawKeyPoints.points;
              }

              return {
                id: s.id,
                title: s.heading,
                keyPoints: keyPoints,
                estimatedWordCount: s.estimated_word_count || undefined,
                status: (s.status || "pending") as
                  | "pending"
                  | "writing"
                  | "review"
                  | "complete",
              };
            })
            .sort((a: any, b: any) => {
              const titleA = (a.title || "").trim();
              const titleB = (b.title || "").trim();
              const lowerA = titleA.toLowerCase();
              const lowerB = titleB.toLowerCase();

              // Abstract always first
              if (lowerA.includes("abstract")) return -1;
              if (lowerB.includes("abstract")) return 1;

              // References/Bibliography always last
              const isRefA =
                lowerA.includes("reference") ||
                lowerA.includes("works cited") ||
                lowerA.includes("bibliography");
              const isRefB =
                lowerB.includes("reference") ||
                lowerB.includes("works cited") ||
                lowerB.includes("bibliography");

              if (isRefA && !isRefB) return 1;
              if (!isRefA && isRefB) return -1;

              // Extract chapter numbers for numerical sort
              const getNumber = (str: string) => {
                const match =
                  str.match(/^(?:chapter|section)\s+(\d+)/i) ||
                  str.match(/^(\d+)\./);
                return match ? parseInt(match[1], 10) : 9999;
              };

              const numA = getNumber(titleA);
              const numB = getNumber(titleB);

              if (numA !== 9999 || numB !== 9999) {
                return numA - numB;
              }

              return 0;
            }) || [],
      };
    }

    // Map sources with academic metadata
    const mappedSources: Source[] = sources.map((s: any) => {
      let parsedAuthorsStructured: any = undefined;
      if (s.authors_structured) {
        try {
          parsedAuthorsStructured =
            typeof s.authors_structured === "string"
              ? JSON.parse(s.authors_structured)
              : s.authors_structured;
        } catch (e) {
          console.error("[Workspace] Failed to parse authors_structured:", e);
        }
      }
      return {
        id: s.id,
        title: s.title,
        url: s.url,
        snippet: s.excerpt || "",
        selected: true,
        author: s.author,
        publishedDate: s.published_date,
        // Academic metadata
        journalName: s.journal_name,
        volume: s.volume,
        issue: s.issue,
        pages: s.pages,
        doi: s.doi,
        year: s.year,
        publisher: s.publisher,
        publicationType: s.publication_type,
        authorsStructured: parsedAuthorsStructured,
      };
    });

    return {
      brief: mappedBrief,
      initialData: {
        sources: mappedSources,
        plan: mappedPlan,
        content: document?.content || "",
        lastSavedAt: document?.updated_at || null,
        messages: messages || [],
      },
    };
  }, [projectData, localStorageBrief]);

  // Initialize currentStep - WorkspaceLayout can update it
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("research");

  // Sync currentStep when projectData loads
  useEffect(() => {
    if (projectData?.project?.workflow_step) {
      setCurrentStep(projectData.project.workflow_step as WorkflowStep);
    }
  }, [projectData]);

  // Handle authentication redirect
  useEffect(() => {
    console.log("[WorkspacePage] Auth check:", {
      isSessionLoading,
      projectId,
      hasSession: !!session,
    });
    if (!isSessionLoading && projectId && !session) {
      console.log(
        "[WorkspacePage] Project requires authentication - redirecting to home"
      );
      router.push("/");
    }
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

  // Show loading state when fetching project data
  if (projectId && (isLoadingProject || (!projectData && !projectError))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading workspace...
        </div>
      </div>
    );
  }

  // Show error state
  if (projectError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-destructive">
          Error loading project. Please try again.
        </div>
      </div>
    );
  }

  // Show loading state when waiting for localStorage (no projectId case)
  if (
    !projectId &&
    !hasCheckedLocalStorage &&
    !localStorageBrief &&
    !isSessionLoading
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading workspace...
        </div>
      </div>
    );
  }

  // If no brief after all loading attempts, show error
  if (!brief) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-destructive">
          Unable to load workspace. Please try again.
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
      isFetching={isFetchingProject}
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
