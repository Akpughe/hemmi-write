"use client";

import { useState, useEffect, Dispatch, SetStateAction, useRef } from "react";
import {
  Loader2,
  RefreshCw,
  ChevronRight,
  FileText,
  Upload,
  Layers,
  BookOpen,
  Check,
  ExternalLink,
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

const normalizeUrlForComparison = (rawUrl: string) => {
  if (!rawUrl) return "";

  let normalized = rawUrl.trim().toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, "");
  normalized = normalized.replace(/^www\./, "");
  normalized = normalized.split(/[?#]/)[0];
  normalized = normalized.replace(/\/$/, "");

  return normalized;
};

interface LeftPanelProps {
  currentStep: WorkflowStep;
  sources: Source[];
  setSources: Dispatch<SetStateAction<Source[]>>;
  plan: DocumentPlan | null;
  setPlan: (plan: DocumentPlan | null) => void;
  onStepChange: (step: WorkflowStep) => void;
  brief: WritingBrief;
  chapterHandlers?: {
    approve: (index?: number) => void;
    reject: (index?: number) => void;
  } | null;
  projectId: string | null;
  onEnsureProject: () => Promise<string | null>;
  onSourceAdded?: (data: {
    sourceId: string;
    title: string;
    workflowStep: WorkflowStep;
  }) => void;
  onResearchStatusChange?: (status: {
    phase: "idle" | "loading" | "done" | "error";
    error?: string | null;
    completedAt?: string | null;
  }) => void;
  onStructureStatusChange?: (status: {
    phase: "idle" | "loading" | "done" | "error";
    error?: string | null;
    completedAt?: string | null;
  }) => void;
  onRegisterGenerateStructure?: (handler: (() => void) | null) => void;
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
  projectId,
  onEnsureProject,
  onSourceAdded,
  onResearchStatusChange,
  onStructureStatusChange,
  onRegisterGenerateStructure,
}: LeftPanelProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "sources">(
    plan ? "sections" : "sources"
  );
  const hasAutoSwitchedToSections = useRef(false);

  // Auto-switch to sections tab when plan is loaded
  useEffect(() => {
    if (plan && !hasAutoSwitchedToSections.current) {
      setActiveTab("sections");
      hasAutoSwitchedToSections.current = true;
    }
  }, [plan]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeSuccess, setScrapeSuccess] = useState<string | null>(null);

  // Helper to check if a section is an abstract
  const isAbstractSection = (sectionTitle: string) => {
    return sectionTitle.toLowerCase().includes("abstract");
  };

  const fetchResearch = async () => {
    setIsSearching(true);
    onResearchStatusChange?.({ phase: "loading", error: null });
    try {
      // Ensure project exists first
      const currentProjectId = await onEnsureProject();

      const response = await fetch("/api/write/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: brief.topic,
          documentType: mapUIDocumentTypeToEnum(brief.documentType),
          instructions: brief.instructions,
          numSources: brief.sourceCount || 5,
          projectId: currentProjectId, // Pass projectId
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
      onResearchStatusChange?.({
        phase: "done",
        completedAt: new Date().toISOString(),
      });

      // Trigger source addition notification (only if not in research step)
      if (
        onSourceAdded &&
        currentStep !== "research" &&
        mappedSources.length > 0
      ) {
        onSourceAdded({
          sourceId: mappedSources[0].id,
          title: `${mappedSources.length} new sources`,
          workflowStep: currentStep,
        });
      }
    } catch (error) {
      console.error("Research error:", error);
      onResearchStatusChange?.({
        phase: "error",
        error: error instanceof Error ? error.message : "Research failed",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger research on mount if needed
  useEffect(() => {
    console.log("Research effect check:", {
      currentStep,
      sourcesLength: sources.length,
      includeSources: brief.includeSources,
      projectId,
      shouldAutoFetch:
        currentStep === "research" &&
        sources.length === 0 &&
        brief.includeSources,
    });

    // Only auto-run research if we're in research step, have no sources, and sources are enabled
    // The key difference: if projectId exists, it means we're loading from DB and should NOT auto-run
    // because the absence of sources would be intentional (user cleared them or hasn't added any yet)
    if (
      currentStep === "research" &&
      sources.length === 0 &&
      brief.includeSources
    ) {
      // If we have a projectId, this is a reload - skip auto-research to prevent duplicate runs
      // Users can manually click "Gather research" if they want to re-run
      if (projectId) {
        console.log(
          "Skipping auto-research on reload - please use manual trigger"
        );
      } else {
        console.log(
          "✓ Auto-triggering research (projectId will be created if needed)"
        );
        fetchResearch();
      }
    } else if (currentStep === "research" && !brief.includeSources) {
      // Skip research if sources are disabled
      console.log("Skipping research - sources disabled");
      onStepChange("planning");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, brief.includeSources]);

  const toggleSource = (id: string) => {
    setSources(
      sources.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Get project ID first
      const currentProjectId = await onEnsureProject();

      // Upload to /api/upload with projectId
      const formData = new FormData();
      formData.append("file", file);
      if (currentProjectId) {
        formData.append("projectId", currentProjectId);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const uploadResult = await response.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed");
      }

      // Create source object from upload result
      const newSource: Source = {
        id: uploadResult.sourceId || `pdf-${Date.now()}`,
        title: file.name,
        url: uploadResult.url, // Public S3 URL
        snippet: "Uploaded PDF Document",
        selected: true,
        author: "User Upload",
        publishedDate: new Date().toLocaleDateString(),
      };

      // Log if OCR had errors
      if (uploadResult.ocrError) {
        console.warn("PDF OCR encountered an error:", uploadResult.ocrError);
      }

      setSources([...sources, newSource]);
      setActiveTab("sources");

      // Trigger source addition notification (only if not in research step)
      if (onSourceAdded && currentStep !== "research") {
        onSourceAdded({
          sourceId: newSource.id,
          title: file.name,
          workflowStep: currentStep,
        });
      }
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    onResearchStatusChange?.({ phase: "loading", error: null });
    try {
      // Ensure project exists first
      const currentProjectId = await onEnsureProject();
      const existingUrls = Array.from(new Set(sources.map((s) => s.url)));
      const existingTitles = Array.from(new Set(sources.map((s) => s.title)));

      const response = await fetch("/api/write/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: brief.topic,
          documentType: mapUIDocumentTypeToEnum(brief.documentType),
          instructions: brief.instructions,
          numSources: 5, // Load 5 more sources
          projectId: currentProjectId,
          excludeUrls: existingUrls,
          excludeTitles: existingTitles,
          mode: "append",
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch more sources");

      const data = await response.json();

      if (data.sources.length === 0) {
        // Could show a toast here "No more sources found"
        return;
      }

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

      setSources((prevSources) => {
        const normalizedExisting = new Set(
          prevSources.map((source) => normalizeUrlForComparison(source.url))
        );

        const uniqueNewSources = mappedSources.filter((source) => {
          const normalizedUrl = normalizeUrlForComparison(source.url);
          if (!normalizedUrl || normalizedExisting.has(normalizedUrl)) {
            return false;
          }
          normalizedExisting.add(normalizedUrl);
          return true;
        });

        if (uniqueNewSources.length === 0) {
          return prevSources;
        }

        return [...prevSources, ...uniqueNewSources];
      });
      onResearchStatusChange?.({
        phase: "done",
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Load more error:", error);
      onResearchStatusChange?.({
        phase: "error",
        error: error instanceof Error ? error.message : "Load more failed",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleApproveResearch = async () => {
    onStepChange("planning");
    setIsPlanning(true);
    onStructureStatusChange?.({ phase: "loading", error: null });

    try {
      // Ensure project exists
      const currentProjectId = await onEnsureProject();
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
          projectId: currentProjectId, // Pass projectId
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
          id: s.id || `section-${i}`,
          title: s.heading,
          keyPoints: s.keyPoints || [],
          status: "pending",
        })),
      };

      console.log("mappedPlan", mappedPlan);

      setPlan(mappedPlan);
      onStructureStatusChange?.({
        phase: "done",
        completedAt: new Date().toISOString(),
      });
      // Auto-switch to sections tab after structure is generated
      setActiveTab("sections");
    } catch (error) {
      console.error("Planning error:", error);
      onStructureStatusChange?.({
        phase: "error",
        error:
          error instanceof Error
            ? error.message
            : "Structure generation failed",
      });
    } finally {
      setIsPlanning(false);
    }
  };

  // Expose structure generation to sibling panels (e.g., center panel CTA)
  useEffect(() => {
    if (!onRegisterGenerateStructure) return;
    onRegisterGenerateStructure(() => {
      void handleApproveResearch();
    });
    return () => onRegisterGenerateStructure(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onRegisterGenerateStructure,
    sources,
    brief,
    projectId,
    currentStep,
    plan,
  ]);

  const handleApprovePlan = () => {
    onStepChange("writing");
  };

  // NOTE: writing now starts via explicit user CTA (center panel),
  // so we do not auto-transition to writing when the plan arrives.

  const handleStartWritingTask = () => {
    onStepChange("writing");
  };

  const handleScrapeUrl = async () => {
    if (!scrapeUrl.trim()) {
      setScrapeError("Please enter a URL");
      return;
    }

    setIsScraping(true);
    setScrapeError(null);
    setScrapeSuccess(null);

    try {
      // Ensure project exists first
      const currentProjectId = await onEnsureProject();

      if (!currentProjectId) {
        throw new Error("Failed to create or get project");
      }

      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: scrapeUrl,
          projectId: currentProjectId,
          max_text_length: 10000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Scraping failed");
      }

      const data = await response.json();

      // Create source object for the main source
      const newSource: Source = {
        id: data.mainSourceId,
        title: data.scrapedData.title || scrapeUrl,
        url: data.scrapedData.url,
        snippet: `Scraped content (${data.scrapedData.wordCount} words)`,
        selected: true,
        publishedDate: new Date().toLocaleDateString(),
      };

      // Add PDF sources if any
      const pdfSources: Source[] = (data.pdfSourceIds || []).map(
        (id: string, idx: number) => ({
          id,
          title: `PDF ${idx + 1} from ${data.scrapedData.title}`,
          url: scrapeUrl,
          snippet: "PDF extracted from webpage",
          selected: true,
          publishedDate: new Date().toLocaleDateString(),
        })
      );

      // Add all sources to the list
      setSources([...sources, newSource, ...pdfSources]);

      // Show success message
      let successMsg = `Successfully scraped ${data.scrapedData.title}`;
      if (data.totalPdfsFound > 0) {
        successMsg += ` and found ${data.totalPdfsProcessed}/${data.totalPdfsFound} PDFs`;
      }
      setScrapeSuccess(successMsg);

      // Clear input
      setScrapeUrl("");

      // Trigger source addition notification
      if (onSourceAdded && currentStep !== "research") {
        onSourceAdded({
          sourceId: newSource.id,
          title: newSource.title,
          workflowStep: currentStep,
        });
      }

      // Clear success message after 5 seconds
      setTimeout(() => setScrapeSuccess(null), 5000);
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Failed to scrape URL";
      console.error("Scraping failed:", errMsg);
      setScrapeError(errMsg);
    } finally {
      setIsScraping(false);
    }
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
                              onClick={() => chapterHandlers.reject(index)}
                              className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
                              title="Regenerate">
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            {section.status === "review" && (
                              <button
                                onClick={() => chapterHandlers.approve(index)}
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
              <div className="flex items-center gap-2">
                {sources.length > 0 && (
                  <button
                    onClick={fetchResearch}
                    disabled={isSearching}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh sources">
                    <RefreshCw
                      className={cn("w-3 h-3", isSearching && "animate-spin")}
                    />
                    Refresh
                  </button>
                )}
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
            </div>

            {/* URL Scraping Section */}
            <div className="mb-3 p-3 rounded-lg border border-border bg-muted/30">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Add from URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isScraping) {
                      handleScrapeUrl();
                    }
                  }}
                  placeholder="https://example.com"
                  disabled={isScraping}
                  className="flex-1 px-2 py-1.5 text-xs border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <Button
                  onClick={handleScrapeUrl}
                  disabled={isScraping || !scrapeUrl.trim()}
                  size="sm"
                  className="text-xs px-3">
                  {isScraping ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Scraping
                    </>
                  ) : (
                    "Scrape"
                  )}
                </Button>
              </div>
              {scrapeError && (
                <div className="mt-2 text-xs text-red-500 flex items-start gap-1">
                  <span className="font-medium">Error:</span>
                  <span>{scrapeError}</span>
                </div>
              )}
              {scrapeSuccess && (
                <div className="mt-2 text-xs text-green-600 flex items-start gap-1">
                  <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{scrapeSuccess}</span>
                </div>
              )}
            </div>

            {isSearching && (
              <div className="p-6 rounded-lg border border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-sm">Finding sources...</span>
              </div>
            )}

            {!isSearching && sources.length === 0 && (
              <div className="p-6 rounded-lg border border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground mb-3" />
                <h4 className="text-sm font-medium text-foreground mb-1">
                  No Sources Yet
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Find research sources to support your writing
                </p>
                <Button onClick={fetchResearch} size="sm" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Find Sources
                </Button>
              </div>
            )}

            {isUploading && (
              <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-xs">
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
                Uploading...
              </div>
            )}

            {sources.length > 0 &&
              sources.map((source, index) => (
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
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded transition-colors hover:bg-green-100 group shrink-0 self-start cursor-pointer"
                          title="Open source">
                          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-green-600" />
                        </a>
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

            {sources.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="w-full mt-4 gap-2 border-dashed text-muted-foreground hover:text-foreground">
                {isLoadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                Load 5 More Sources
              </Button>
            )}
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
