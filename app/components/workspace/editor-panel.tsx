"use client";

import {
  useEffect,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";
import type {
  DocumentPlan,
  WorkflowStep,
  Source,
  WritingBrief,
} from "@/lib/types/ui";
import { TiptapEditor } from "./tiptap-editor";
import { Check, X, Loader2, Download, FileText } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  mapUIDocumentTypeToEnum,
  mapUIAcademicLevelToEnum,
  mapUIWritingStyleToEnum,
} from "@/lib/utils/documentTypeMapper";
import {
  DocumentType,
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
    approve: () => void;
    reject: () => void;
  }) => void;
  onStepChange: (step: WorkflowStep) => void;
  onAskAI?: (text: string) => void;
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
}: EditorPanelProps) {
  const [isWriting, setIsWriting] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentChapterContent, setCurrentChapterContent] = useState("");
  const [showChapterReview, setShowChapterReview] = useState(false);
  const [approvedContent, setApprovedContent] = useState("");
  const [wordCount, setWordCount] = useState(0);

  // Update word count whenever content changes
  useEffect(() => {
    const text = content.replace(/<[^>]*>/g, "");
    setWordCount(text.trim().split(/\s+/).length);
  }, [content]);

  // Configure marked for better formatting
  marked.use({
    breaks: true, // Convert \n to <br>
    gfm: true, // GitHub Flavored Markdown
  });

  // Custom renderer to add proper spacing classes to AI-generated content
  const renderer = new marked.Renderer();

  // Override paragraph rendering
  renderer.paragraph = (token: any) => {
    return `<p class="mb-5 leading-relaxed">${token.text}</p>`;
  };

  // Override heading rendering with proper spacing
  renderer.heading = (token: any) => {
    const spacingClasses = {
      1: "text-4xl leading-tight mb-6 mt-8 font-bold tracking-tight",
      2: "text-3xl leading-snug mb-5 mt-8 font-bold tracking-tight",
      3: "text-2xl leading-snug mb-4 mt-6 font-bold tracking-tight",
      4: "text-xl leading-normal mb-3 mt-5 font-bold tracking-tight",
      5: "text-lg leading-normal mb-3 mt-4 font-bold tracking-tight",
      6: "text-base leading-normal mb-2 mt-4 font-semibold tracking-tight",
    };

    const classes =
      spacingClasses[token.depth as keyof typeof spacingClasses] ||
      spacingClasses[1];
    return `<h${token.depth} class="${classes}">${token.text}</h${token.depth}>`;
  };

  // Override list rendering
  renderer.list = (token: any) => {
    const tag = token.ordered ? "ol" : "ul";
    const classes = token.ordered ? "mb-5 mt-2" : "mb-5 mt-2 list-disc";
    return `<${tag} class="${classes}">${token.items}</${tag}>`;
  };

  // Override list item rendering
  renderer.listitem = (token: any) => {
    return `<li class="mb-2 leading-relaxed">${token.text}</li>`;
  };

  // Override blockquote rendering
  renderer.blockquote = (token: any) => {
    return `<blockquote class="border-l-4 border-accent pl-4 pr-4 italic text-muted-foreground my-6">${token.text}</blockquote>`;
  };

  // Apply custom renderer
  marked.use({ renderer });

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

  // Generate a single chapter
  const generateChapter = useCallback(
    async (chapterIndex: number, startTextOverride?: string) => {
      if (!plan) return;

      setIsWriting(true);
      setCurrentChapterContent("");
      setShowChapterReview(false);
      updateSectionStatus(chapterIndex, "writing");

      // Determine the starting text (preamble or previously approved content)
      // Priority:
      // 1. Explicit override (passed from handleApproveChapter to avoid stale state)
      // 2. If first chapter, use current editor content (preamble)
      // 3. Fallback to approvedContent state
      const startText =
        startTextOverride !== undefined
          ? startTextOverride
          : chapterIndex === 0
          ? content
          : approvedContent;

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

          // Generate references markdown
          const referencesMarkdown = generateReferenceList(
            apiSources,
            citationStyle
          );

          // Convert to HTML
          const htmlContent = await marked.parse(referencesMarkdown);
          setCurrentChapterContent(htmlContent);

          // Update editor with approved + references
          setContent(
            startText ? startText + "\n\n" + htmlContent : htmlContent
          );

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
            previousChaptersText: startText, // Pass the preamble/previous text
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
              } catch (e) {
                console.warn("Failed to parse SSE data:", line);
              }
            }
          }
        }

        // Chapter generation complete - convert markdown to HTML and display
        const htmlContent = await marked.parse(accumulated);
        setCurrentChapterContent(htmlContent);

        // If this is the first chapter (Abstract), prepend the Table of Contents
        let finalContent = htmlContent;
        if (chapterIndex === 0) {
          const tocHtml = generateTOCHtml();
          if (tocHtml) {
            finalContent = tocHtml + "\n\n" + htmlContent;
          }
        }

        // Update editor with approved + current formatted chapter
        // Use startText (which includes preamble) + new content
        setContent(
          startText ? startText + "\n\n" + finalContent : finalContent
        );

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
      approvedContent,
      sources,
      brief,
      updateSectionStatus,
      setContent,
      setCurrentChapterContent,
      setShowChapterReview,
      setIsWriting,
      generateTOCHtml,
    ]
  );

  // Handle chapter approval
  const handleApproveChapter = useCallback(() => {
    if (!plan) return;

    // Mark current section as complete
    updateSectionStatus(currentChapterIndex, "complete");

    // Add current chapter to approved content using state callback
    setApprovedContent((prev) => {
      // If this is the first chapter, 'prev' might be empty but we might have a preamble in 'content'
      // However, since we are appending to 'approvedContent', we need to be careful.
      // Actually, we should just use the current editor content as the new approved content base?
      // No, 'content' includes the *current chapter* which is what we are approving.

      // If chapterIndex is 0, we need to make sure the preamble is included in the approved content state.
      // But wait, if we used 'startText' in generateChapter, we just need to make sure we don't lose it.

      // Simplest approach: The editor content IS the source of truth for what is visible.
      // When we approve, we are saying "Everything currently in the editor is now approved".
      // So let's just sync approvedContent to the current editor content (which includes preamble + new chapter).

      // But wait, 'content' state in EditorPanel might be HTML. 'approvedContent' seems to be used as 'previousText' for next generation.
      // If 'content' is HTML, passing it as 'previousChaptersText' to LLM is fine (it can handle it or we strip it).
      // Let's assume 'content' is the source of truth.

      // However, 'currentChapterContent' is also state.
      // Let's stick to the existing pattern but fix the base.

      const base =
        currentChapterIndex === 0 && !prev
          ? content.replace(currentChapterContent, "").trim()
          : prev;
      // Actually, 'content' = startText + \n\n + htmlContent.
      // So if we just set approvedContent to 'content', we are good for the next round.
      return content;
    });

    setShowChapterReview(false);
    setCurrentChapterContent("");

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
    currentChapterContent,
    updateSectionStatus,
    generateChapter,
    onStepChange,
    setApprovedContent,
    setShowChapterReview,
    setCurrentChapterContent,
    setCurrentChapterIndex,
    setIsWriting,
  ]);

  // Handle chapter rejection (regenerate)
  const handleRejectChapter = useCallback(() => {
    generateChapter(currentChapterIndex);
  }, [currentChapterIndex, generateChapter]);

  const generateDocument = async () => {
    if (!plan) return;
    setIsWriting(true);

    // Capture current content (preamble) to append to
    const startContent = content;
    // setContent(""); // Removed to preserve preamble

    try {
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
  useEffect(() => {
    if (setChapterHandlers) {
      setChapterHandlers({
        approve: handleApproveChapter,
        reject: handleRejectChapter,
      });
    }
  }, [handleApproveChapter, handleRejectChapter, setChapterHandlers]);

  // Start generation when entering writing step
  // Auto-generation removed. User must manually start.
  // useEffect(() => {
  //   if (currentStep === "writing" && plan && !isWriting && !content) {
  //     if (shouldUseChapterMode()) {
  //       setCurrentChapterIndex(0);
  //       generateChapter(0);
  //     } else {
  //       generateDocument();
  //     }
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [currentStep, plan]);

  const handleExport = (format: "docx" | "pdf") => {
    // Mock export for now
    alert(`Exporting as ${format.toUpperCase()}...`);
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
            <span className="text-2xl">📋</span>
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
            onClick={() => handleExport("docx")}>
            <FileText className="w-4 h-4 mr-2" />
            DOCX
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleExport("pdf")}>
            <Download className="w-4 h-4 mr-2" />
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
                      onClick={handleRejectChapter}
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
