"use client";

import { useEffect, useState } from "react";
import type { DocumentPlan, WorkflowStep, Source, WritingBrief } from "@/lib/types/ui";
import { TiptapEditor } from "./tiptap-editor";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  mapUIDocumentTypeToEnum,
  mapUIAcademicLevelToEnum,
  mapUIWritingStyleToEnum,
} from "@/lib/utils/documentTypeMapper";
import { DocumentType, AcademicLevel, WritingStyle } from "@/lib/types/document";
import { marked } from "marked";

interface EditorPanelProps {
  content: string;
  setContent: (content: string) => void;
  plan: DocumentPlan | null;
  setPlan: (plan: DocumentPlan) => void;
  currentStep: WorkflowStep;
  brief: WritingBrief;
  sources: Source[];
  onChapterApprove?: () => void;
  onChapterReject?: () => void;
  setChapterHandlers?: (handlers: {
    approve: () => void;
    reject: () => void;
  }) => void;
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
}: EditorPanelProps) {
  const [isWriting, setIsWriting] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentChapterContent, setCurrentChapterContent] = useState("");
  const [showChapterReview, setShowChapterReview] = useState(false);
  const [approvedContent, setApprovedContent] = useState("");

  // Configure marked for better formatting
  marked.setOptions({
    breaks: true, // Convert \n to <br>
    gfm: true, // GitHub Flavored Markdown
  });

  // Helper to check if a section is an abstract
  const isAbstractSection = (sectionTitle: string) => {
    return sectionTitle.toLowerCase().includes("abstract");
  };

  // Helper to get display name for a section
  const getSectionDisplayName = (index: number) => {
    if (!plan) return "";
    const section = plan.sections[index];
    if (isAbstractSection(section.title)) {
      return "Abstract";
    }
    // Count actual chapters (excluding abstract)
    let chapterNumber = 1;
    for (let i = 0; i < index; i++) {
      if (!isAbstractSection(plan.sections[i].title)) {
        chapterNumber++;
      }
    }
    return `Chapter ${chapterNumber}`;
  };

  // Check if we should use chapter-by-chapter generation
  const shouldUseChapterMode = () => {
    if (!plan) return false;
    const documentType = mapUIDocumentTypeToEnum(brief.documentType);
    const hasAcademicConfig =
      brief.academicLevel !== undefined && brief.writingStyle !== undefined;
    const hasMultipleSections = plan.sections && plan.sections.length >= 5;
    return (
      documentType === DocumentType.RESEARCH_PAPER &&
      hasAcademicConfig &&
      hasMultipleSections
    );
  };

  // Update section status in the left panel
  const updateSectionStatus = (
    index: number,
    status: "pending" | "writing" | "review" | "complete"
  ) => {
    if (!plan) return;
    const updatedPlan = {
      ...plan,
      sections: plan.sections.map((section, i) =>
        i === index ? { ...section, status } : section
      ),
    };
    setPlan(updatedPlan);
  };

  // Generate a single chapter
  const generateChapter = async (chapterIndex: number) => {
    if (!plan) return;

    setIsWriting(true);
    setCurrentChapterContent("");
    setShowChapterReview(false);
    updateSectionStatus(chapterIndex, "writing");

    // Capture the current approved content at the start
    setApprovedContent((currentApproved) => {
      const previousText = currentApproved;

      // Start async generation
      (async () => {
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

          const section = plan.sections[chapterIndex];
          const apiSection = {
            heading: section.title,
            description: "",
            keyPoints: section.keyPoints,
            estimatedWordCount: Math.floor(
              (brief.wordCount || 5000) / plan.sections.length
            ),
          };

          const response = await fetch("/api/write/generate-chapter", {
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
              previousChaptersText: previousText,
              academicLevel:
                mapUIAcademicLevelToEnum(brief.academicLevel) ||
                AcademicLevel.GRADUATE,
              writingStyle:
                mapUIWritingStyleToEnum(brief.writingStyle) ||
                WritingStyle.CHAPTER_BASED,
              documentTitle: plan.title,
              documentApproach: plan.approach,
              documentTone: plan.tone,
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

          // Update editor with approved + current formatted chapter
          setContent(
            previousText
              ? previousText + "\n\n" + htmlContent
              : htmlContent
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
      })();

      // Return the current approved content unchanged
      return currentApproved;
    });
  };

  // Handle chapter approval
  const handleApproveChapter = () => {
    if (!plan) return;

    // Mark current section as complete
    updateSectionStatus(currentChapterIndex, "complete");

    // Add current chapter to approved content using state callback
    setApprovedContent((prev) => {
      const newApprovedContent = prev
        ? prev + "\n\n" + currentChapterContent
        : currentChapterContent;
      setContent(newApprovedContent);
      return newApprovedContent;
    });

    setShowChapterReview(false);
    setCurrentChapterContent("");

    // Check if there are more chapters
    if (currentChapterIndex < plan.sections.length - 1) {
      const nextIndex = currentChapterIndex + 1;
      setCurrentChapterIndex(nextIndex);
      generateChapter(nextIndex);
    } else {
      // All chapters complete
      setIsWriting(false);
    }
  };

  // Handle chapter rejection (regenerate)
  const handleRejectChapter = () => {
    generateChapter(currentChapterIndex);
  };

  // Traditional single-generation mode for non-research papers
  const generateDocument = async () => {
    if (!plan) return;
    setIsWriting(true);
    setContent("");

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
      setContent(htmlContent);
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsWriting(false);
    }
  };

  // Expose chapter handlers to parent
  useEffect(() => {
    if (setChapterHandlers) {
      setChapterHandlers({
        approve: handleApproveChapter,
        reject: handleRejectChapter,
      });
    }
  }, [handleApproveChapter, handleRejectChapter, setChapterHandlers]);

  // Start generation when entering writing step
  useEffect(() => {
    if (currentStep === "writing" && plan && !isWriting && !content) {
      if (shouldUseChapterMode()) {
        setCurrentChapterIndex(0);
        generateChapter(0);
      } else {
        generateDocument();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, plan]);

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
    <main className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Editor header */}
      <div className="h-10 border-b border-border px-4 flex items-center justify-between bg-card">
        <span className="text-sm font-medium">Document Editor</span>
        {isWriting && plan && (
          <div className="flex items-center gap-2 text-xs text-accent">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Writing {getSectionDisplayName(currentChapterIndex)}...</span>
          </div>
        )}
      </div>

      {/* TipTap Editor */}
      <div className="flex-1 overflow-hidden relative">
        <TiptapEditor
          content={content}
          onChange={setContent}
          editable={!isWriting && !showChapterReview}
        />

        {/* Loading overlay while generating */}
        {isWriting && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-accent animate-spin" />
              <div className="text-center">
                <p className="text-lg font-medium">
                  Generating {plan && getSectionDisplayName(currentChapterIndex)}...
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Writing with full formatting
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Accept/Reject buttons overlay - shown below the current chapter */}
        {showChapterReview && plan && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-20 pb-6">
            <div className="max-w-3xl mx-auto px-8">
              <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {getSectionDisplayName(currentChapterIndex)} Complete
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Review the {isAbstractSection(plan.sections[currentChapterIndex].title) ? "abstract" : "chapter"} above and approve to continue or
                      regenerate if needed
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
