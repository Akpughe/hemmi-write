"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  ChevronRight,
  FileText,
} from "lucide-react";
import {
  DocumentType,
  ResearchSource,
  DocumentStructure,
  DOCUMENT_TYPE_CONFIGS,
  AcademicLevel,
  WritingStyle,
} from "@/lib/types/document";
import { useEditorContext } from "@/lib/contexts/EditorContext";
import { formatWithCitations } from "@/lib/utils/citations";

interface StepGeneratingProps {
  documentType: DocumentType;
  topic: string;
  instructions: string;
  wordCount: number | null;
  sources: ResearchSource[];
  structure: DocumentStructure;
  academicLevel: AcademicLevel;
  writingStyle: WritingStyle;
  aiProvider: string;
  onComplete: () => void;
  autoApproveEnabled?: boolean;
}

type ChapterState = "pending" | "generating" | "review" | "approved" | "error";

interface ChapterStatus {
  index: number;
  state: ChapterState;
  content: string;
  error?: string;
  wordCount: number;
}

export default function StepGenerating({
  documentType,
  topic,
  instructions,
  wordCount,
  sources,
  structure,
  academicLevel,
  writingStyle,
  aiProvider,
  onComplete,
  autoApproveEnabled = false,
}: StepGeneratingProps) {
  const { appendContent } = useEditorContext();
  const config = DOCUMENT_TYPE_CONFIGS[documentType];

  // Check if this is a research paper that needs chapter-by-chapter generation
  const isResearchPaper =
    documentType === DocumentType.RESEARCH_PAPER &&
    academicLevel &&
    writingStyle;
  const useChapterMode = isResearchPaper && structure.sections.length >= 5;

  // Ensure TOC always exists - generate from sections if missing
  const displayTOC = useMemo(() => {
    return (
      structure.tableOfContents || {
        items: structure.sections.map((section, index) => ({
          level: 1,
          title: section.heading,
          sectionNumber: isResearchPaper ? `${index + 1}` : undefined,
        })),
      }
    );
  }, [structure.tableOfContents, structure.sections, isResearchPaper]);

  console.log("StepGenerating - useChapterMode:", useChapterMode);
  console.log("StepGenerating - displayTOC:", displayTOC);
  console.log(
    "StepGenerating - structure.sections.length:",
    structure.sections.length
  );

  // State for chapter-by-chapter mode
  const [chapterStatuses, setChapterStatuses] = useState<ChapterStatus[]>([]);
  const chapterStatusesRef = useRef<ChapterStatus[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [allChaptersComplete, setAllChaptersComplete] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    chapterStatusesRef.current = chapterStatuses;
  }, [chapterStatuses]);

  // State for traditional single-generation mode
  const [status, setStatus] = useState<"generating" | "complete" | "error">(
    "generating"
  );
  const [generatedContent, setGeneratedContent] = useState("");
  const [error, setError] = useState("");

  // Log TOC generation details in browser console (client-side only)
  useEffect(() => {
    console.log("========== TABLE OF CONTENTS GENERATED ==========");
    console.log(
      "TOC Source:",
      structure.tableOfContents
        ? "From structure.tableOfContents"
        : "Generated from sections"
    );
    console.log("TOC Items Count:", displayTOC.items.length);
    console.log("TOC Items:", JSON.stringify(displayTOC.items, null, 2));
    console.log("Full displayTOC object:", displayTOC);
    console.log("=================================================");
  }, [displayTOC, structure.tableOfContents]);

  useEffect(() => {
    if (useChapterMode) {
      // Initialize chapter statuses
      const initialStatuses: ChapterStatus[] = structure.sections.map(
        (_, index) => ({
          index,
          state: index === 0 ? "generating" : "pending",
          content: "",
          wordCount: 0,
        })
      );
      chapterStatusesRef.current = initialStatuses;
      setChapterStatuses(initialStatuses);

      // Start generating first chapter
      generateChapter(0);
    } else {
      // Traditional mode: generate entire document at once
      generateDocument();
    }
  }, []);

  // Auto-approve chapters when enabled and they enter review state
  useEffect(() => {
    if (!autoApproveEnabled || !useChapterMode) return;

    // Find the first chapter in "review" state
    const reviewChapter = chapterStatuses.find((ch) => ch.state === "review");

    if (reviewChapter) {
      // Auto-approve after brief delay (500ms) for visual feedback
      const timer = setTimeout(() => {
        handleApproveChapter(reviewChapter.index);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [chapterStatuses, autoApproveEnabled, useChapterMode]);

  // Chapter-by-chapter generation
  const generateChapter = useCallback(async (chapterIndex: number) => {
    try {
      // Use ref to get latest chapterStatuses (avoids stale closure)
      const currentStatuses = chapterStatusesRef.current;
      const previousChaptersText = currentStatuses
        .slice(0, chapterIndex)
        .filter((ch) => ch.state === "approved")
        .map((ch) => ch.content)
        .join("\n\n");

      const response = await fetch("/api/write/generate-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          topic,
          instructions,
          sources,
          chapter: structure.sections[chapterIndex],
          chapterIndex,
          totalChapters: structure.sections.length,
          previousChaptersText,
          academicLevel,
          writingStyle,
          documentTitle: structure.title,
          documentApproach: structure.approach,
          documentTone: structure.tone,
          aiProvider,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate chapter");
      }

      // Read stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let accumulatedContent = "";
      let lineBuffer = ""; // Buffer for partial SSE lines across chunks
      let chapterDone = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Stream ended - move to review state
          setChapterStatuses((prev) =>
            prev.map((ch, idx) =>
              idx === chapterIndex
                ? {
                    ...ch,
                    state: "review",
                    content: accumulatedContent,
                    wordCount: accumulatedContent.split(/\s+/).length,
                  }
                : ch
            )
          );
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        // Append to buffer to handle partial lines from previous chunk
        lineBuffer += chunk;
        const lines = lineBuffer.split("\n");
        // Keep the last element as buffer (it may be incomplete)
        lineBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.substring(6));

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.done) {
              chapterDone = true;
              setChapterStatuses((prev) =>
                prev.map((ch, idx) =>
                  idx === chapterIndex
                    ? {
                        ...ch,
                        state: "review",
                        content: accumulatedContent,
                        wordCount: accumulatedContent.split(/\s+/).length,
                      }
                    : ch
                )
              );
              break;
            }

            if (data.content) {
              accumulatedContent += data.content;
              // Update content in real-time
              setChapterStatuses((prev) =>
                prev.map((ch, idx) =>
                  idx === chapterIndex
                    ? {
                        ...ch,
                        content: accumulatedContent,
                        wordCount: accumulatedContent.split(/\s+/).length,
                      }
                    : ch
                )
              );
            }
          } catch (parseErr: any) {
            // If JSON parse fails on a partial line, put it back in buffer
            if (parseErr instanceof SyntaxError) {
              lineBuffer = trimmed + "\n" + lineBuffer;
              break; // Stop processing this batch, wait for more data
            }
            throw parseErr; // Re-throw non-parse errors
          }
        }

        if (chapterDone) break;
      }
    } catch (err: any) {
      console.error("Chapter generation error:", err);
      setChapterStatuses((prev) =>
        prev.map((ch, idx) =>
          idx === chapterIndex
            ? {
                ...ch,
                state: "error",
                error: err.message || "Failed to generate chapter",
              }
            : ch
        )
      );
    }
  }, [documentType, topic, instructions, sources, structure, academicLevel, writingStyle, aiProvider]);

  const handleApproveChapter = useCallback((chapterIndex: number) => {
    // Update ref immediately so generateChapter sees the approved state
    chapterStatusesRef.current = chapterStatusesRef.current.map((ch, idx) =>
      idx === chapterIndex ? { ...ch, state: "approved" } : ch
    );

    setChapterStatuses((prev) =>
      prev.map((ch, idx) =>
        idx === chapterIndex ? { ...ch, state: "approved" } : ch
      )
    );

    // Check if this is the last chapter
    if (chapterIndex === structure.sections.length - 1) {
      setAllChaptersComplete(true);
    } else {
      // Start generating next chapter
      const nextIndex = chapterIndex + 1;
      setCurrentChapterIndex(nextIndex);

      // Update ref immediately for the next generateChapter call
      chapterStatusesRef.current = chapterStatusesRef.current.map((ch, idx) =>
        idx === nextIndex ? { ...ch, state: "generating" } : ch
      );

      setChapterStatuses((prev) =>
        prev.map((ch, idx) =>
          idx === nextIndex ? { ...ch, state: "generating" } : ch
        )
      );
      generateChapter(nextIndex);
    }
  }, [generateChapter, structure.sections.length]);

  const handleRegenerateChapter = useCallback((chapterIndex: number) => {
    chapterStatusesRef.current = chapterStatusesRef.current.map((ch, idx) =>
      idx === chapterIndex
        ? { ...ch, state: "generating", content: "", error: undefined }
        : ch
    );
    setChapterStatuses((prev) =>
      prev.map((ch, idx) =>
        idx === chapterIndex
          ? { ...ch, state: "generating", content: "", error: undefined }
          : ch
      )
    );
    generateChapter(chapterIndex);
  }, [generateChapter]);

  const handleInsertAllChapters = () => {
    // Combine all approved chapters
    const fullDocument = chapterStatuses
      .filter((ch) => ch.state === "approved")
      .map((ch) => ch.content)
      .join("\n\n");

    // Add table of contents
    let finalContent = "";

    // Use existing TOC or generate one from sections
    const tocItemsToUse =
      structure.tableOfContents?.items ||
      structure.sections.map((section, index) => ({
        level: 1,
        title: section.heading,
        sectionNumber: isResearchPaper ? `${index + 1}` : undefined,
      }));

    console.log("========== INSERTING DOCUMENT WITH TOC ==========");
    console.log(
      "TOC Items to Use (before References):",
      JSON.stringify(tocItemsToUse, null, 2)
    );

    // Add References to TOC if not present and it's a research paper
    if (
      isResearchPaper &&
      !tocItemsToUse.some((item) =>
        item.title.toLowerCase().includes("references")
      )
    ) {
      tocItemsToUse.push({
        level: 1,
        title: "References",
        sectionNumber: undefined,
      });
      console.log("Added 'References' to TOC");
    }

    console.log("Final TOC Items Count:", tocItemsToUse.length);
    console.log("Final TOC Items:", JSON.stringify(tocItemsToUse, null, 2));

    const tocContent = tocItemsToUse
      .map((item) => {
        const indent = "  ".repeat((item.level || 1) - 1);
        const number = item.sectionNumber ? `${item.sectionNumber}. ` : "";
        return `${indent}- ${number}${item.title}`;
      })
      .join("\n");

    console.log("Generated TOC Content (markdown):");
    console.log(tocContent);
    console.log("=================================================");

    finalContent = `## Table of Contents\n\n${tocContent}\n\n`;

    finalContent += fullDocument;

    // Format with citations
    const formattedContent = formatWithCitations(
      finalContent,
      sources,
      config.citationStyle
    );

    // Append to editor
    appendContent("\n\n" + formattedContent);

    onComplete();
  };

  // Traditional single-generation mode
  const generateDocument = async () => {
    try {
      const response = await fetch("/api/write/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          topic,
          instructions,
          wordCount,
          sources,
          structure,
          academicLevel,
          writingStyle,
          aiProvider,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate document");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setStatus("complete");
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.substring(6));

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.done) {
              setStatus("complete");
              break;
            }

            if (data.content) {
              accumulatedContent += data.content;
              setGeneratedContent(accumulatedContent);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate document");
      setStatus("error");
    }
  };

  const handleInsert = () => {
    if (!generatedContent) return;
    const formattedContent = formatWithCitations(
      generatedContent,
      sources,
      config.citationStyle
    );
    appendContent("\n\n" + formattedContent);
    onComplete();
  };

  // CHAPTER MODE UI
  if (useChapterMode) {
    const currentChapter = chapterStatuses[currentChapterIndex];
    const totalWords = chapterStatuses.reduce(
      (sum, ch) => sum + ch.wordCount,
      0
    );
    const completedChapters = chapterStatuses.filter(
      (ch) => ch.state === "approved"
    ).length;

    return (
      <div className="space-y-6">
        {/* Progress Header */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {allChaptersComplete
                  ? "All Chapters Complete!"
                  : `Generating Chapter ${currentChapterIndex + 1} of ${
                      structure.sections.length
                    }`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {completedChapters} chapters approved •{" "}
                {totalWords.toLocaleString()} words written
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(
                  (completedChapters / structure.sections.length) * 100
                )}
                %
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  (completedChapters / structure.sections.length) * 100
                }%`,
              }}
            />
          </div>
        </div>

        {/* Table of Contents Preview */}
        {displayTOC && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Table of Contents
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              {displayTOC.items.map((item, idx) => (
                <div
                  key={idx}
                  className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-mono text-muted-foreground/70 w-6 text-right">
                    {item.sectionNumber || "•"}
                  </span>
                  <span className={item.title === "References" ? "italic" : ""}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chapter Status List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {chapterStatuses.map((chapter, index) => (
            <div
              key={index}
              className={`border rounded-lg p-3 transition-all ${
                chapter.state === "generating"
                  ? "border-blue-500/50 bg-blue-500/10"
                  : chapter.state === "approved"
                  ? "border-green-500/50 bg-green-500/10"
                  : chapter.state === "review"
                  ? "border-yellow-500/50 bg-yellow-500/10"
                  : chapter.state === "error"
                  ? "border-red-500/50 bg-red-500/10"
                  : "border-border bg-muted/50"
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {chapter.state === "generating" && (
                    <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                  )}
                  {chapter.state === "approved" && (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  )}
                  {chapter.state === "review" && (
                    <Eye className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  )}
                  {chapter.state === "error" && (
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                  {chapter.state === "pending" && (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/50" />
                  )}

                  <div>
                    <div className="font-medium text-sm text-foreground">
                      {structure.sections[index].heading}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {chapter.wordCount > 0
                        ? `${chapter.wordCount.toLocaleString()} words`
                        : "Not started"}
                      {chapter.state === "generating" && " • Writing..."}
                      {chapter.state === "review" && (autoApproveEnabled ? " • Auto-continuing..." : " • Ready for review")}
                      {chapter.state === "approved" && " • Approved"}
                      {chapter.state === "error" && ` • ${chapter.error}`}
                    </div>
                  </div>
                </div>

                {chapter.state === "review" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRegenerateChapter(index)}
                      className="px-3 py-1 text-xs border border-border rounded hover:bg-muted transition-colors text-foreground">
                      Regenerate
                    </button>
                    <button
                      onClick={() => handleApproveChapter(index)}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                      Approve
                    </button>
                  </div>
                )}

                {chapter.state === "error" && (
                  <button
                    onClick={() => handleRegenerateChapter(index)}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Current Chapter Preview (if generating or in review) */}
        {currentChapter &&
          (currentChapter.state === "generating" ||
            currentChapter.state === "review") && (
            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-foreground">
                  {structure.sections[currentChapterIndex].heading}
                </h4>
                {currentChapter.state === "generating" && (
                  <span className="text-sm text-muted-foreground">
                    {currentChapter.wordCount} words...
                  </span>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto prose prose-sm max-w-none text-foreground dark:prose-invert">
                {currentChapter.content || "Starting generation..."}
                {currentChapter.state === "generating" && (
                  <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
                )}
              </div>
            </div>
          )}

        {/* Final Insert Button (when all complete) */}
        {allChaptersComplete && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {totalWords.toLocaleString()} words across {completedChapters}{" "}
              chapters
            </div>
            <button
              onClick={onComplete}
              className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleInsertAllChapters}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Insert Complete Document
            </button>
          </div>
        )}
      </div>
    );
  }

  // TRADITIONAL MODE UI (for essays, reports, assignments, or short research papers)
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Generation Failed
        </h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => {
            setStatus("generating");
            setError("");
            generateDocument();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (status === "generating") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Generating Your {config.label}...
            </h3>
            <p className="text-sm text-muted-foreground">
              {generatedContent.length > 0
                ? `${generatedContent.split(/\s+/).length} words written...`
                : "Starting generation..."}
            </p>
          </div>
        </div>

        {generatedContent.length > 0 ? (
          <div className="bg-card border border-border rounded-lg p-6 max-h-[500px] overflow-y-auto">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground dark:prose-invert">
              {generatedContent}
              <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Processing:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                Analyzing {sources.length} sources
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                Writing {wordCount || "default"} words
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                Formatting {config.citationStyle} citations
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center mb-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
      </div>

      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Document Generated!
        </h3>
        <p className="text-muted-foreground">
          Your {config.label.toLowerCase()} is ready to be inserted into the
          editor
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 max-h-[400px] overflow-y-auto">
        <div
          className="prose prose-sm max-w-none text-foreground dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: generatedContent }}
        />
      </div>

      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">What's included:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-green-700 dark:text-green-300">
          <li>
            {sources.length} sources cited using {config.citationStyle} format
          </li>
          <li>Approximately {wordCount || "default"} words</li>
          <li>Properly formatted reference list at the end</li>
        </ul>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          onClick={onComplete}
          className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
          Cancel
        </button>
        <button
          onClick={handleInsert}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Insert into Editor
        </button>
      </div>
    </div>
  );
}
