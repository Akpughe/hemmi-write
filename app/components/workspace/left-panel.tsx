"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  RefreshCw,
  ChevronRight,
  FileText,
  Upload,
  Layers,
  BookOpen,
  Check,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type {
  Source,
  DocumentPlan,
  WorkflowStep,
  WritingBrief,
} from "@/lib/types/ui";
import { cn } from "@/lib/utils";
import {
  mapUIDocumentTypeToEnum,
  mapUIAcademicLevelToEnum,
  mapUIWritingStyleToEnum,
} from "@/lib/utils/documentTypeMapper";

interface LeftPanelProps {
  currentStep: WorkflowStep;
  sources: Source[];
  setSources: (sources: Source[]) => void;
  plan: DocumentPlan | null;
  setPlan: (plan: DocumentPlan | null) => void;
  onStepChange: (step: WorkflowStep) => void;
  brief: WritingBrief;
  chapterHandlers?: {
    approve: () => void;
    reject: () => void;
  } | null;
}

export function LeftPanel({
  currentStep,
  sources,
  setSources,
  plan,
  setPlan,
  onStepChange,
  brief,
  chapterHandlers,
}: LeftPanelProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "sources">(
    "sections"
  );
  const [isUploading, setIsUploading] = useState(false);

  // Helper to check if a section is an abstract
  const isAbstractSection = (sectionTitle: string) => {
    return sectionTitle.toLowerCase().includes("abstract");
  };

  const fetchResearch = async () => {
    setIsSearching(true);
    try {
      const response = await fetch("/api/write/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: brief.topic,
          documentType: mapUIDocumentTypeToEnum(brief.documentType),
          numSources: brief.sourceCount || 5,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch sources");

      const data = await response.json();
      // Map API sources to UI sources
      const mappedSources: Source[] = data.sources.map((s: any) => ({
        id: s.id || Math.random().toString(36).substr(2, 9),
        title: s.title,
        url: s.url,
        snippet: s.snippet || s.content?.substring(0, 150) + "...",
        author: s.author,
        publishedDate: s.publishedDate,
        selected: true,
      }));

      setSources(mappedSources);
    } catch (error) {
      console.error("Research error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger research on mount if needed
  useEffect(() => {
    if (
      currentStep === "research" &&
      sources.length === 0 &&
      brief.includeSources
    ) {
      fetchResearch();
    } else if (currentStep === "research" && !brief.includeSources) {
      // Skip research if sources are disabled
      onStepChange("planning");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const toggleSource = (id: string) => {
    setSources(
      sources.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Mock upload for now - in real app would upload to S3
    try {
      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const newSource: Source = {
        id: `pdf-${Date.now()}`,
        title: file.name,
        url: URL.createObjectURL(file), // Temporary local URL
        snippet: "Uploaded PDF Document",
        selected: true,
        author: "User Upload",
        publishedDate: new Date().toLocaleDateString(),
      };

      setSources([...sources, newSource]);
      setActiveTab("sources");
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproveResearch = async () => {
    onStepChange("planning");
    setIsPlanning(true);

    try {
      const selectedSources = sources.filter((s) => s.selected);

      const response = await fetch("/api/write/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: mapUIDocumentTypeToEnum(brief.documentType),
          topic: brief.topic,
          instructions: brief.instructions,
          wordCount: brief.wordCount,
          sources: selectedSources,
          academicLevel: mapUIAcademicLevelToEnum(brief.academicLevel),
          writingStyle: mapUIWritingStyleToEnum(brief.writingStyle),
          chapters: brief.chapters, // Pass chapters count
        }),
      });

      if (!response.ok) throw new Error("Failed to generate structure");

      const data = await response.json();

      // Map API structure to UI plan
      const apiStructure = data.structure;
      const mappedPlan: DocumentPlan = {
        title: apiStructure.title,
        approach: apiStructure.approach,
        tableOfContents: apiStructure.tableOfContents,
        tone: apiStructure.tone,
        sections: apiStructure.sections.map((s: any, i: number) => ({
          id: `section-${i}`,
          title: s.heading,
          keyPoints: s.keyPoints || [],
          status: "pending",
        })),
      };

      console.log("mappedPlan", mappedPlan);

      setPlan(mappedPlan);
    } catch (error) {
      console.error("Planning error:", error);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleApprovePlan = () => {
    onStepChange("writing");
  };

  // Auto-transition to writing step when plan is ready
  useEffect(() => {
    if (plan && currentStep === "planning") {
      // Immediately transition to writing step so editor shows
      onStepChange("writing");
    }
  }, [plan, currentStep, onStepChange]);

  const handleStartWritingTask = () => {
    onStepChange("writing");
  };

  return (
    <aside className="w-80 border-r border-border flex flex-col bg-card h-full">
      {/* Header with Tabs */}
      <div className="shrink-0 border-b border-border">
        <div className="p-4 pb-2">
          <h2 className="text-sm font-semibold text-foreground mb-1">
            {brief.topic || "Untitled Project"}
          </h2>
          <p className="text-xs text-muted-foreground capitalize">
            {brief.documentType.replace("-", " ")} • {brief.academicLevel}
          </p>
        </div>

        <div className="flex items-center px-2">
          <button
            onClick={() => setActiveTab("sections")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium border-b-2 transition-colors",
              activeTab === "sections"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            <Layers className="w-3 h-3" />
            SECTIONS
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium border-b-2 transition-colors",
              activeTab === "sources"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            <BookOpen className="w-3 h-3" />
            SOURCES
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {activeTab === "sections" ? (
          <div className="space-y-4">
            {isPlanning ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mb-3" />
                <span className="text-sm">Creating blueprint...</span>
              </div>
            ) : plan ? (
              <div className="space-y-2">
                {plan.sections.map((section, index) => {
                  const isAbstract = isAbstractSection(section.title);
                  let displayNumber = index + 1;
                  if (!isAbstract) {
                    displayNumber = 1;
                    for (let i = 0; i < index; i++) {
                      if (!isAbstractSection(plan.sections[i].title)) {
                        displayNumber++;
                      }
                    }
                  }

                  return (
                    <div
                      key={section.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        section.status === "complete"
                          ? "border-green-500/50 bg-green-500/5"
                          : section.status === "writing"
                          ? "border-foreground/30 bg-foreground/5"
                          : section.status === "review"
                          ? "border-yellow-500/50 bg-yellow-500/5"
                          : "border-border"
                      )}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                            section.status === "complete"
                              ? "bg-green-500 text-white"
                              : section.status === "writing"
                              ? "bg-foreground text-background"
                              : section.status === "review"
                              ? "bg-yellow-500 text-white"
                              : "bg-muted text-muted-foreground"
                          )}>
                          {section.status === "complete" ? (
                            <Check className="w-3 h-3" />
                          ) : section.status === "writing" ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : section.status === "review" ? (
                            <Check className="w-3 h-3" />
                          ) : isAbstract ? (
                            <FileText className="w-3 h-3" />
                          ) : (
                            displayNumber
                          )}
                        </div>
                        <span className="text-sm font-medium flex-1">
                          {section.title}
                        </span>
                      </div>

                      {/* Key Points */}
                      {section.keyPoints && section.keyPoints.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {section.keyPoints.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <ChevronRight className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Review Actions */}
                      {(section.status === "review" ||
                        section.status === "complete") &&
                        chapterHandlers && (
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <button
                              onClick={chapterHandlers.reject}
                              className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
                              title="Regenerate">
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            {section.status === "review" && (
                              <button
                                onClick={chapterHandlers.approve}
                                className="px-2 py-1 text-xs font-medium bg-accent hover:bg-accent/90 text-accent-foreground rounded transition-colors">
                                Accept
                              </button>
                            )}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Structure will appear here after research.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-muted-foreground">
                {sources.length} Sources
              </h3>
              <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-accent hover:underline">
                <Upload className="w-3 h-3" />
                Add PDF
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>

            {isUploading && (
              <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-xs">
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
                Uploading...
              </div>
            )}

            {sources.map((source, index) => (
              <div
                key={`${index}-${source.id}`}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer group",
                  source.selected
                    ? "border-accent/50 bg-accent/5"
                    : "border-border bg-muted/30 opacity-60"
                )}
                onClick={() => toggleSource(source.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      {source.id.startsWith("pdf-") ? (
                        <FileText className="w-4 h-4 text-red-400" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                        {source.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {source.snippet}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      source.selected
                        ? "bg-accent border-accent text-accent-foreground"
                        : "border-muted-foreground/30"
                    )}>
                    {source.selected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="shrink-0 p-4 border-t border-border bg-card">
        {currentStep === "research" && activeTab === "sources" && (
          <Button
            onClick={handleApproveResearch}
            className="w-full gap-2"
            disabled={sources.filter((s) => s.selected).length === 0}>
            Generate Structure
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {currentStep === "planning" && activeTab === "sections" && plan && (
          <Button onClick={handleApprovePlan} className="w-full gap-2">
            Start Writing
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </aside>
  );
}
