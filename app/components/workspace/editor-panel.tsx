"use client";

import {
  useEffect,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
  useRef,
} from "react";
import type {
  DocumentPlan,
  WorkflowStep,
  Source,
  WritingBrief,
} from "@/lib/types/ui";
import { TiptapEditor } from "./tiptap-editor";
import {
  Check,
  X,
  Loader2,
  Download,
  FileText,
  Cloud,
  CloudOff,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  mapUIDocumentTypeToEnum,
  mapUIAcademicLevelToEnum,
  mapUIWritingStyleToEnum,
} from "@/lib/utils/documentTypeMapper";
import {
  AcademicLevel,
  WritingStyle,
  CitationStyle,
  ResearchSource,
} from "@/lib/types/document";
import { generateReferenceList } from "@/lib/utils/citations";
import { marked } from "marked";

interface EditorPanelProps {
  content: string;
  setContent: (content: string) => void;
  plan: DocumentPlan | null;
  setPlan: Dispatch<SetStateAction<DocumentPlan | null>>;
  currentStep: WorkflowStep;
  brief: WritingBrief;
  sources: Source[];
  onChapterApprove?: () => void;
  onChapterReject?: () => void;
  setChapterHandlers?: (handlers: {
    approve: (index?: number) => void;
    reject: (index?: number) => void;
  }) => void;
  onStepChange: (step: WorkflowStep) => void;
  onAskAI?: (text: string) => void;
  insertRequest?: string | null;
  onInsertComplete?: () => void;
  projectId: string | null;
  onEnsureProject: () => Promise<string | null>;
  onSave?: (date: Date) => void;
  lastSavedAt?: Date | null;
}

export function EditorPanel({
  content,
  setContent,
  plan,
  setPlan,
  currentStep,
  brief,
  sources,
  setChapterHandlers,
  onStepChange,
  onAskAI,
  insertRequest,
  onInsertComplete,
  projectId,
  onEnsureProject,
  onSave,
  lastSavedAt,
}: EditorPanelProps) {
  const [isWriting, setIsWriting] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentChapterContent, setCurrentChapterContent] = useState("");
  const [showChapterReview, setShowChapterReview] = useState(false);
  const [approvedContent, setApprovedContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved"
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update word count whenever content changes
  useEffect(() => {
    const text = content.replace(/<[^>]*>/g, "");
    setWordCount(text.trim().split(/\s+/).length);
  }, [content]);

  // Autosave content to database
  const saveContent = useCallback(async () => {
    if (!projectId || !content) return;

    try {
      setSaveStatus("saving");

      const response = await fetch(`/api/projects/${projectId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          wordCount,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save content");
      }

      const data = await response.json();

      setSaveStatus("saved");
      if (onSave && data.document?.updated_at) {
        onSave(new Date(data.document.updated_at));
      } else if (onSave) {
        onSave(new Date());
      }
    } catch (error) {
      console.error("Autosave error:", error);
      setSaveStatus("unsaved");
    }
  }, [projectId, content, wordCount, onSave]);

  // Debounced autosave - trigger 2 seconds after content changes
  useEffect(() => {
    // Skip autosave if:
    // 1. No project ID (unsaved project)
    // 2. Currently writing (being generated)
    // 3. No content to save
    if (!projectId || isWriting || !content) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Mark as unsaved immediately when content changes
    setSaveStatus("unsaved");

    // Set new timeout for 2 seconds
    saveTimeoutRef.current = setTimeout(() => {
      saveContent();
    }, 2000);

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, projectId, isWriting, saveContent]);

  // Configure marked for better formatting
  marked.use({
    breaks: true, // Convert \n to <br>
    gfm: true, // GitHub Flavored Markdown
  });

  // Helper to check if a section is an abstract
  const isAbstractSection = (sectionTitle: string) => {
    return sectionTitle.toLowerCase().includes("abstract");
  };

  // Helper to generate Table of Contents HTML
  const generateTOCHtml = useCallback(() => {
    if (!plan?.tableOfContents?.items) return "";

    let tocHtml =
      '<div class="table-of-contents" style="margin-bottom: 2rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;">';
    tocHtml +=
      '<h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">Table of Contents</h2>';
    tocHtml += '<div style="line-height: 1.8;">';

    plan.tableOfContents.items.forEach((item) => {
      if (item.level === 1) {
        // Main chapter/section
        const numberPrefix = item.sectionNumber
          ? `${item.sectionNumber}. `
          : "";
        tocHtml += `<div style="font-weight: 600; margin-top: 0.75rem;">${numberPrefix}${item.title}</div>`;
      } else if (item.level === 2) {
        // Subsection
        tocHtml += `<div style="margin-left: 1.5rem; color: #6b7280;">${item.title}</div>`;
      }
    });

    tocHtml += "</div></div>";
    return tocHtml;
  }, [plan]);

  // Helper to get display name for a section
  const getSectionDisplayName = (index: number) => {
    if (!plan) return "";
    const section = plan.sections[index];
    // Return the actual section title
    return section.title || `Section ${index + 1}`;
  };

  // Check if we should use chapter-by-chapter generation
  const shouldUseChapterMode = () => {
    if (!plan) return false;
    // Enable section-by-section generation for all structured documents
    return plan.sections && plan.sections.length > 0;
  };

  // Update section status in the left panel
  const updateSectionStatus = useCallback(
    (index: number, status: "pending" | "writing" | "review" | "complete") => {
      setPlan((prevPlan) => {
        if (!prevPlan) return prevPlan;
        return {
          ...prevPlan,
          sections: prevPlan.sections.map((section, i) =>
            i === index ? { ...section, status } : section
          ),
        };
      });
    },
    [setPlan]
  );

  // Helper to find range of a section in the content
  const getSectionRange = useCallback(
    (currentContent: string, sectionIndex: number) => {
      if (!plan || !currentContent)
        return {
          start: 0,
          end: currentContent?.length || 0,
          prefix: "",
          suffix: "",
        };

      // Helper to execute regex and get index
      const findHeaderIndex = (title: string, startIndex = 0) => {
        // Look for h1-h6 tags containing the title, case insensitive
        // We match explicitly on the title text to avoid false positives
        const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(
          `<h[1-6][^>]*>\\s*${escapedTitle}\\s*<\\/h[1-6]>`,
          "i"
        );
        const match = currentContent.slice(startIndex).match(regex);
        return match ? startIndex + match.index! : -1;
      };

      const currentSection = plan.sections[sectionIndex];
      const nextSection = plan.sections[sectionIndex + 1];

      // Find start of current section
      let startIndex = 0;
      if (sectionIndex > 0) {
        // If not first section, look for its header
        startIndex = findHeaderIndex(currentSection.title);
        // If not found (e.g. user deleted header), approximate by end of previous section?
        // For now, if not found, we might have an issue. Fallback to appending?
        // Let's assume content flow: Preamble ... Section Header ...
        if (startIndex === -1) {
          // Fallback: This is tricky. If we can't find our own header,
          // we might just append to the very end if it's the last chapter,
          // or we have lost context.
          // Let's try to find the previous section's header and guess?
          // Simpler fallback: If looking for Ch 2 and can't find it, but we can find Ch 3,
          // then Ch 2 spot is before Ch 3.
          if (nextSection) {
            const nextIndex = findHeaderIndex(nextSection.title);
            if (nextIndex !== -1) startIndex = nextIndex; // Insert before next
            else startIndex = currentContent.length; // Append
          } else {
            startIndex = currentContent.length; // Append
          }
        }
      }

      // Find end of current section (start of next section)
      let endIndex = currentContent.length;
      if (nextSection) {
        const nextHeaderIndex = findHeaderIndex(
          nextSection.title,
          startIndex > 0 ? startIndex : 0
        );
        if (nextHeaderIndex !== -1) {
          endIndex = nextHeaderIndex;
        }
      }

      return {
        start: startIndex,
        end: endIndex,
        prefix: currentContent.slice(0, startIndex),
        suffix: currentContent.slice(endIndex),
      };
    },
    [plan]
  );

  // Generate a single chapter
  const generateChapter = useCallback(
    async (chapterIndex: number, startTextOverride?: string) => {
      if (!plan) return;

      setIsWriting(true);
      setCurrentChapterContent("");
      setShowChapterReview(false);
      updateSectionStatus(chapterIndex, "writing");

      const section = plan.sections[chapterIndex];
      const isReferencesSection =
        section.title.toLowerCase().includes("references") ||
        section.title.toLowerCase().includes("works cited") ||
        section.title.toLowerCase().includes("bibliography");

      // Handle References section specially
      if (isReferencesSection) {
        try {
          // Convert UI sources to ResearchSource format
          const apiSources: ResearchSource[] = sources
            .filter((s) => s.selected)
            .map((s) => ({
              id: s.id,
              title: s.title,
              url: s.url,
              excerpt: s.snippet || "",
              author: s.author,
              publishedDate: s.publishedDate,
              selected: true, // All filtered sources are selected
            }));

          // Get citation style from brief, default to APA
          const citationStyleMap: Record<string, CitationStyle> = {
            APA: CitationStyle.APA,
            MLA: CitationStyle.MLA,
            HARVARD: CitationStyle.HARVARD,
            CHICAGO: CitationStyle.CHICAGO,
          };
          const citationStyle = citationStyleMap[brief.citationStyle || "APA"];

          // Generate references HTML (no markdown parsing needed)
          const htmlContent = generateReferenceList(apiSources, citationStyle);

          setCurrentChapterContent(htmlContent);

          // Smart replacement
          const { prefix, suffix } = getSectionRange(content, chapterIndex);

          // Update editor with approved + references
          setContent(prefix + htmlContent + suffix);

          // Set status to review
          updateSectionStatus(chapterIndex, "review");
          setShowChapterReview(true);
          setIsWriting(false);
          return;
        } catch (error) {
          console.error("References generation error:", error);
          setIsWriting(false);
          updateSectionStatus(chapterIndex, "pending");
          return;
        }
      }

      // Start async generation for regular chapters
      try {
        // Ensure project exists
        const currentProjectId = await onEnsureProject();

        const apiSources = sources
          .filter((s) => s.selected)
          .map((s) => ({
            id: s.id,
            title: s.title,
            url: s.url,
            excerpt: s.snippet,
            author: s.author,
            publishedDate: s.publishedDate,
            selected: s.selected,
          }));

        const apiSection = {
          heading: section.title,
          description: "",
          keyPoints: section.keyPoints,
          estimatedWordCount: Math.floor(
            (brief.wordCount || 5000) / plan.sections.length
          ),
        };

        const isReport = brief.documentType === "report";
        const endpoint = isReport
          ? "/api/write/generate-report-section"
          : "/api/write/generate-chapter";

        // Determine context for API (what came before)
        const { prefix, suffix } = getSectionRange(content, chapterIndex);

        // For API context, we prefer the 'prefix' which contains all text before this chapter
        // If prefix is empty (e.g. first chapter), we fall back to startTextOverride or empty
        const contextText = prefix || startTextOverride || "";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentType: mapUIDocumentTypeToEnum(brief.documentType),
            topic: brief.topic,
            instructions: brief.instructions || "",
            sources: apiSources,
            chapter: apiSection,
            chapterIndex,
            totalChapters: plan.sections.length,
            previousChaptersText: contextText, // Use calculated prefix
            academicLevel:
              mapUIAcademicLevelToEnum(brief.academicLevel) ||
              AcademicLevel.GRADUATE,
            writingStyle:
              mapUIWritingStyleToEnum(brief.writingStyle) ||
              WritingStyle.ANALYTICAL,
            documentTitle: plan.title,
            documentApproach: plan.approach,
            documentTone: plan.tone,
            aiProvider: brief.aiProvider,
            projectId: currentProjectId, // Pass projectId
          }),
        });

        if (!response.ok) throw new Error("Failed to generate chapter");
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

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

                if (data.content) {
                  accumulated += data.content;
                  setCurrentChapterContent(accumulated);
                  // Don't update editor during streaming - we'll convert and render when complete
                }
              } catch (_e) {
                console.warn("Failed to parse SSE data:", line);
              }
            }
          }
        }

        // Chapter generation complete - AI outputs HTML directly now
        const htmlContent = accumulated; // No markdown parsing needed
        setCurrentChapterContent(htmlContent);

        // If this is the first chapter (Abstract), prepend the Table of Contents
        let finalContent = htmlContent;
        if (chapterIndex === 0) {
          const tocHtml = generateTOCHtml();
          if (tocHtml) {
            finalContent = tocHtml + "\n\n" + htmlContent;
          }
        }

        // Update editor with prefix + new content + suffix
        // Ensure newlines/spacing is preserved if prefix exists
        const separator = prefix && !prefix.endsWith("\n") ? "\n\n" : "";
        setContent(prefix + separator + finalContent + suffix);

        // Set status to review
        updateSectionStatus(chapterIndex, "review");
        setShowChapterReview(true);
        setIsWriting(false);
      } catch (error) {
        console.error("Chapter generation error:", error);
        setIsWriting(false);
        updateSectionStatus(chapterIndex, "pending");
      }
    },
    [
      plan,
      content,
      sources,
      brief,
      updateSectionStatus,
      setContent,
      setCurrentChapterContent,
      setShowChapterReview,
      setIsWriting,
      onEnsureProject,
      getSectionRange,
      generateTOCHtml,
    ]
  );

  // Handle chapter approval
  const handleApproveChapter = useCallback(() => {
    if (!plan) return;

    // Mark current section as complete
    updateSectionStatus(currentChapterIndex, "complete");

    // Add current chapter to approved content using state callback
    setApprovedContent((_prev) => {
      // If this is the first chapter, 'prev' might be empty but we might have a preamble in 'content'
      // However, since we are appending to 'approvedContent', we need to be careful.
      // Simplify: Editor content is source of truth
      return content;
    });

    setShowChapterReview(false);
    setCurrentChapterContent("");

    // Trigger immediate save after chapter approval
    if (projectId) {
      saveContent();
    }

    // Check if there are more chapters
    if (currentChapterIndex < plan.sections.length - 1) {
      const nextIndex = currentChapterIndex + 1;
      setCurrentChapterIndex(nextIndex);
      // Pass the current 'content' (which is now the approved content) explicitly
      // to avoid reading stale 'approvedContent' state in the next render cycle
      generateChapter(nextIndex, content);
    } else {
      // All chapters complete
      setIsWriting(false);
      onStepChange("complete");
    }
  }, [
    plan,
    currentChapterIndex,
    content,
    projectId,
    updateSectionStatus,
    generateChapter,
    onStepChange,
    saveContent,
    setApprovedContent,
    setShowChapterReview,
    setCurrentChapterContent,
    setCurrentChapterIndex,
    setIsWriting,
  ]);

  // Handle chapter rejection (regenerate)
  const handleRejectChapter = useCallback(
    (index?: number) => {
      if (typeof index === "number") {
        setCurrentChapterIndex(index);
        generateChapter(index);
      } else {
        generateChapter(currentChapterIndex);
      }
    },
    [currentChapterIndex, generateChapter]
  );

  const generateDocument = async () => {
    if (!plan) return;
    setIsWriting(true);

    // Capture current content (preamble) to append to
    const startContent = content;

    try {
      // Ensure project exists
      const currentProjectId = await onEnsureProject();

      const apiSources = sources
        .filter((s) => s.selected)
        .map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          excerpt: s.snippet,
          author: s.author,
          publishedDate: s.publishedDate,
          selected: s.selected,
        }));

      const apiStructure = {
        title: plan.title,
        approach: plan.approach,
        tone: plan.tone,
        sections: plan.sections.map((s) => ({
          heading: s.title,
          description: "",
          keyPoints: s.keyPoints,
        })),
        estimatedWordCount: brief.wordCount || 3000,
      };

      const response = await fetch("/api/write/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: mapUIDocumentTypeToEnum(brief.documentType),
          topic: brief.topic,
          instructions: brief.instructions,
          wordCount: brief.wordCount,
          sources: apiSources,
          structure: apiStructure,
          academicLevel: mapUIAcademicLevelToEnum(brief.academicLevel),
          writingStyle: mapUIWritingStyleToEnum(brief.writingStyle),
          projectId: currentProjectId, // Pass projectId
        }),
      });

      if (!response.ok) throw new Error("Failed to generate content");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

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

              if (data.content) {
                accumulated += data.content;
                // Don't update editor during streaming
              }
            } catch (e) {
              console.warn("Failed to parse SSE data:", line);
            }
          }
        }
      }

      // Convert accumulated markdown to HTML and display
      const htmlContent = await marked.parse(accumulated);

      // Append to startContent (preamble)
      setContent(
        startContent ? startContent + "\n\n" + htmlContent : htmlContent
      );

      // Mark ALL sections as complete since this is single-pass generation
      const completedPlan = {
        ...plan,
        sections: plan.sections.map((s) => ({
          ...s,
          status: "complete" as const,
        })),
      };
      setPlan(completedPlan);
      onStepChange("complete");
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsWriting(false);
    }
  };

  // Set up chapter handlers for external control
  // Use a ref to store the latest handlers so we can pass stable functions to the parent
  const handlersRef = useRef({
    approve: handleApproveChapter,
    reject: handleRejectChapter,
  });

  // Update the ref whenever handlers change
  useEffect(() => {
    handlersRef.current = {
      approve: handleApproveChapter,
      reject: handleRejectChapter,
    };
  }, [handleApproveChapter, handleRejectChapter]);

  // Set up chapter handlers for external control - ONLY once (or when setChapterHandlers changes)
  useEffect(() => {
    if (setChapterHandlers) {
      setChapterHandlers({
        approve: (_index?: number) => handlersRef.current.approve(),
        reject: (index?: number) => handlersRef.current.reject(index),
      });
    }
  }, [setChapterHandlers]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "docx" | "pdf") => {
    if (isExporting) return;

    setIsExporting(true);
    const filename = plan?.title?.replace(/[^a-zA-Z0-9]/g, "_") || "document";

    try {
      const { exportToDocx, exportToPdfFromHtml } = await import(
        "@/lib/utils/documentExport"
      );

      if (format === "docx") {
        await exportToDocx(content, filename);
      } else {
        await exportToPdfFromHtml(content, filename);
      }
    } catch (error) {
      console.error(`${format.toUpperCase()} export error:`, error);
      alert(`Failed to export as ${format.toUpperCase()}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  if (currentStep === "research") {
    return (
      <main className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📚</span>
          </div>
          <h2 className="text-lg font-medium mb-2">Gathering Research</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve sources in the left panel to continue with
            document planning.
          </p>
        </div>
      </main>
    );
  }

  if (currentStep === "planning") {
    return (
      <main className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">Clipboard</span>
          </div>
          <h2 className="text-lg font-medium mb-2">Blueprint Ready</h2>
          <p className="text-sm text-muted-foreground">
            Review the document structure in the left panel. Approve when ready
            to begin writing.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-background overflow-hidden relative">
      {/* Editor header - Sticky Toolbar */}
      <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-card shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Document Editor</span>
          <div className="h-4 w-px bg-border" />
          <span className="text-xs text-muted-foreground">
            {wordCount.toLocaleString()} words
          </span>
          {projectId && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5 text-xs">
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    <span className="text-muted-foreground">Saving...</span>
                  </>
                ) : saveStatus === "unsaved" ? (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-orange-600" />
                    <span className="text-muted-foreground">Unsaved</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-muted-foreground">
                      {lastSavedAt
                        ? `Saved ${lastSavedAt.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : "Saved"}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isWriting && plan && (
            <div className="flex items-center gap-2 text-xs text-accent mr-4">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>
                Writing {getSectionDisplayName(currentChapterIndex)}...
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExport("docx")}
            disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            DOCX
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExport("pdf")}
            disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            PDF
          </Button>

          {/* Manual Start Button - Hide if all sections are complete */}
          {!isWriting &&
            !showChapterReview &&
            plan &&
            currentStep === "writing" &&
            !plan.sections.every((s) => s.status === "complete") && (
              <Button
                size="sm"
                onClick={() => {
                  if (shouldUseChapterMode()) {
                    // If we are at the start (index 0) or resuming
                    // When manually starting/resuming, we rely on state, so no override needed
                    generateChapter(currentChapterIndex);
                  } else {
                    generateDocument();
                  }
                }}
                className="gap-2 bg-accent hover:bg-accent/90 ml-2">
                <Loader2 className="w-4 h-4" />
                {currentChapterIndex === 0 && !content
                  ? "Start Generating"
                  : "Continue Generating"}
              </Button>
            )}
        </div>
      </div>

      {/* TipTap Editor - Scrollable */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="min-h-full">
          <TiptapEditor
            content={content}
            onChange={setContent}
            editable={!isWriting && !showChapterReview}
            onAskAI={onAskAI}
            brief={brief}
            sources={sources}
            insertRequest={insertRequest}
            onInsertComplete={onInsertComplete}
          />
        </div>

        {/* Loading overlay while generating */}
        {isWriting && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-accent animate-spin" />
              <div className="text-center">
                <p className="text-lg font-medium">
                  Generating{" "}
                  {plan && getSectionDisplayName(currentChapterIndex)}...
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Writing with full formatting
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Accept/Reject buttons overlay - Fixed at bottom */}
        {showChapterReview && plan && (
          <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-20 pb-6 z-30">
            <div className="max-w-3xl mx-auto px-8">
              <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {getSectionDisplayName(currentChapterIndex)} Complete
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Review the{" "}
                      {isAbstractSection(
                        plan.sections[currentChapterIndex].title
                      )
                        ? "abstract"
                        : "chapter"}{" "}
                      above and approve to continue or regenerate if needed
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectChapter()}
                      className="gap-2">
                      <X className="w-4 h-4" />
                      Regenerate
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApproveChapter}
                      className="gap-2 bg-accent hover:bg-accent/90">
                      <Check className="w-4 h-4" />
                      Approve & Continue
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
