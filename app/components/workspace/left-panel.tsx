"use client";

import { useState, useEffect, Dispatch, SetStateAction, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
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
import { PaywallModal } from "@/app/components/subscription/paywall-modal";

// =============================================================================
// Thinking Indicator - Claude/ChatGPT style shimmer
// =============================================================================

function ThinkingShimmer() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1 h-1 rounded-full bg-foreground/40"
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.85, 1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Truncated Key Points - show max 3, then "See more"
// =============================================================================

const MAX_VISIBLE_POINTS = 3;

function TruncatedKeyPoints({ points }: { points: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? points : points.slice(0, MAX_VISIBLE_POINTS);
  const hiddenCount = points.length - MAX_VISIBLE_POINTS;

  return (
    <motion.ul
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2.5 space-y-1 text-xs text-foreground/50"
    >
      {visible.map((point, idx) => (
        <motion.li
          key={idx}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.02 }}
          className="flex items-start gap-1.5"
        >
          <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-foreground/30" />
          <span>{point}</span>
        </motion.li>
      ))}
      {hiddenCount > 0 && (
        <li>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-[11px] font-medium text-foreground/35 hover:text-foreground/55 transition-colors ml-[18px] mt-0.5"
          >
            {expanded ? "See less" : `See ${hiddenCount} more...`}
          </button>
        </li>
      )}
    </motion.ul>
  );
}

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
  onFindMoreSources?: () => void;
  onStartInlineResearch?: () => void;
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
  onFindMoreSources,
  onStartInlineResearch,
}: LeftPanelProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "sources">(
    plan ? "sections" : "sources",
  );
  const hasAutoSwitchedToSections = useRef(false);

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<
    "insufficient_tokens" | "no_subscription"
  >("insufficient_tokens");
  const [estimatedTokens, setEstimatedTokens] = useState<number | undefined>(
    undefined,
  );

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

      // Handle 402 Payment Required - insufficient tokens
      if (response.status === 402) {
        const errorData = await response.json();
        console.log("[Research] Payment required:", errorData);

        setEstimatedTokens(errorData.required);
        const reason =
          errorData.code === "NO_SUBSCRIPTION"
            ? "no_subscription"
            : "insufficient_tokens";
        setPaywallReason(reason);
        console.log("🔥 [LeftPanel] Opening paywall modal", {
          reason,
          estimatedTokens: errorData.required,
        });
        setShowPaywall(true);
        console.log("🔥 [LeftPanel] showPaywall set to true");

        onResearchStatusChange?.({
          phase: "error",
          error:
            errorData.message ||
            "Insufficient tokens. Please subscribe or top up to continue.",
        });

        setIsSearching(false);
        return; // Stop execution
      }

      // Handle 401 Unauthorized
      if (response.status === 401) {
        onResearchStatusChange?.({
          phase: "error",
          error: "Please log in to continue",
        });
        setIsSearching(false);
        return;
      }

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
          "Skipping auto-research on reload - please use manual trigger",
        );
      } else {
        console.log(
          "✓ Auto-triggering research (projectId will be created if needed)",
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
      sources.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)),
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
          prevSources.map((source) => normalizeUrlForComparison(source.url)),
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

  // Keep a ref to the latest plan so fire-and-forget callbacks don't use stale closures
  const planRef = useRef<DocumentPlan | null>(plan);
  useEffect(() => { planRef.current = plan; }, [plan]);

  // Background section detail generation — fire-and-forget, non-blocking
  const generateSectionDetails = (
    projectId: string | null,
    apiStructure: any,
    selectedSources: any[],
    topic: string
  ) => {
    if (!projectId) return;

    console.log("[Structure] Starting background section detail generation...");

    fetch("/api/write/structure-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        sections: apiStructure.sections.map((s: any) => ({
          heading: s.heading,
          keyPoints: s.keyPoints || [],
          description: s.description || "",
          estimatedWordCount: s.estimatedWordCount,
        })),
        sources: selectedSources.slice(0, 15).map((s: any) => ({
          title: s.title,
          author: s.author,
          excerpt: s.excerpt || s.snippet,
          publishedDate: s.publishedDate,
        })),
        topic,
      }),
    })
      .then((res) => {
        console.log("[Structure] Section preview API response status:", res.status);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.sectionDetails && data.sectionDetails.length > 0) {
          console.log("[Structure] Section details received:", data.sectionDetails.length, "sections");
          // Use ref to get the latest plan state, not a stale closure
          const latestPlan = planRef.current;
          if (latestPlan) {
            setPlan({ ...latestPlan, sectionDetails: data.sectionDetails });
          }
        } else {
          console.warn("[Structure] Section details response was empty or malformed:", data);
        }
      })
      .catch((err) => {
        console.warn("[Structure] Section preview generation failed (non-fatal):", err);
      });
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

      // Show structure immediately
      setPlan(mappedPlan);
      onStructureStatusChange?.({
        phase: "done",
        completedAt: new Date().toISOString(),
      });
      setActiveTab("sections");

      // Fire-and-forget: generate section details in background
      // Don't await — let the user see the structure immediately
      generateSectionDetails(currentProjectId, apiStructure, selectedSources, brief.topic);
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
        }),
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
          <h2 className="text-sm font-semibold text-foreground mb-1 line-clamp-3">
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
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border-b-2 transition-colors ease-[cubic-bezier(0.25,0.1,0.25,1)]",
              activeTab === "sections"
                ? "border-foreground text-foreground"
                : "border-transparent text-foreground/50 hover:text-foreground",
            )}>
            <Layers className="w-3 h-3" />
            SECTIONS
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border-b-2 transition-colors ease-[cubic-bezier(0.25,0.1,0.25,1)]",
              activeTab === "sources"
                ? "border-foreground text-foreground"
                : "border-transparent text-foreground/50 hover:text-foreground",
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-foreground/60">
                <div className="mb-4">
                  <ThinkingShimmer />
                </div>
                <span className="text-sm font-medium">Creating blueprint</span>
                <span className="text-xs text-foreground/40 mt-1">
                  Analyzing sources and structure
                </span>
              </motion.div>
            ) : plan ? (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
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
                      <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{
                          duration: 0.25,
                          delay: index * 0.03,
                          ease: [0.25, 0.1, 0.25, 1],
                        }}
                        className={cn(
                          "p-3 rounded-xl border transition-all duration-200",
                          section.status === "complete"
                            ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                            : section.status === "writing"
                              ? "border-blue-500/20 bg-blue-500/[0.03]"
                              : section.status === "review"
                                ? "border-amber-500/20 bg-amber-500/[0.03]"
                                : "border-foreground/5 bg-foreground/[0.02] hover:border-foreground/10",
                        )}>
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-all duration-200",
                              section.status === "complete"
                                ? "bg-emerald-500 text-white"
                                : section.status === "writing"
                                  ? "bg-blue-500 text-white"
                                  : section.status === "review"
                                    ? "bg-amber-500 text-white"
                                    : "bg-foreground/10 text-foreground/60",
                            )}>
                            {section.status === "complete" ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 15,
                                }}>
                                <Check className="w-3 h-3" />
                              </motion.div>
                            ) : section.status === "writing" ? (
                              <ThinkingShimmer />
                            ) : section.status === "review" ? (
                              <Check className="w-3 h-3" />
                            ) : isAbstract ? (
                              <FileText className="w-3 h-3" />
                            ) : (
                              <span className="text-[10px]">
                                {displayNumber}
                              </span>
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-sm font-medium flex-1 transition-colors",
                              section.status === "complete"
                                ? "text-foreground"
                                : "text-foreground/80",
                            )}>
                            {section.title}
                          </span>

                          {/* Status badge */}
                          {section.status === "writing" && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-[10px] font-medium text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                              Writing
                            </motion.span>
                          )}
                          {section.status === "review" && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-[10px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                              Review
                            </motion.span>
                          )}
                        </div>

                        {/* Key Points */}
                        <AnimatePresence>
                          {section.keyPoints &&
                            section.keyPoints.length > 0 && (
                              <TruncatedKeyPoints points={section.keyPoints} />
                            )}
                        </AnimatePresence>

                        {/* Review Actions */}
                        {(section.status === "review" ||
                          section.status === "complete") &&
                          chapterHandlers && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-2.5 flex items-center justify-end gap-2">
                              <button
                                onClick={() => chapterHandlers.reject(index)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-foreground/40 hover:text-red-500 transition-all duration-150"
                                title="Regenerate">
                                <RefreshCw className="w-3 h-3" />
                              </button>
                              {section.status === "review" && (
                                <button
                                  onClick={() => chapterHandlers.approve(index)}
                                  className="px-2.5 py-1 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-lg transition-all duration-150 active:scale-[0.98]">
                                  Accept
                                </button>
                              )}
                            </motion.div>
                          )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Structure will appear here after research.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Sources
                </span>
                {sources.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-foreground/10 text-[10px] font-semibold text-foreground/70 tabular-nums">
                    {sources.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {sources.length > 0 && (
                  <button
                    onClick={fetchResearch}
                    disabled={isSearching}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                    title="Refresh sources">
                    <RefreshCw
                      className={cn(
                        "w-3.5 h-3.5",
                        isSearching && "animate-spin",
                      )}
                    />
                  </button>
                )}
                <label className="cursor-pointer p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-150">
                  <Upload className="w-3.5 h-3.5" />
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
            <div className="mb-4 p-3 rounded-xl border border-border/60 bg-muted/20">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2 block">
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
                  placeholder="Paste article or paper URL..."
                  disabled={isScraping}
                  className="flex-1 px-3 py-2 text-xs border border-border/60 rounded-lg bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                />
                <button
                  onClick={handleScrapeUrl}
                  disabled={isScraping || !scrapeUrl.trim()}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-1.5">
                  {isScraping ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Adding</span>
                    </>
                  ) : (
                    <span>Add</span>
                  )}
                </button>
              </div>
              {scrapeError && (
                <div className="mt-2.5 text-[11px] text-red-500 dark:text-red-400 flex items-start gap-1.5">
                  <span className="font-medium">Error:</span>
                  <span>{scrapeError}</span>
                </div>
              )}
              {scrapeSuccess && (
                <div className="mt-2.5 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-start gap-1.5">
                  <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{scrapeSuccess}</span>
                </div>
              )}
            </div>

            {isSearching && (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <span className="text-xs font-medium">Finding sources...</span>
              </div>
            )}

            {!isSearching && sources.length === 0 && (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-muted-foreground/70" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  No sources yet
                </h4>
                <p className="text-xs text-muted-foreground/70 mb-5 max-w-[200px]">
                  Add research sources to support your writing
                </p>
                <button
                  onClick={() => onStartInlineResearch?.()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all duration-150">
                  <BookOpen className="w-4 h-4" />
                  Find Sources
                </button>
              </div>
            )}

            {isUploading && (
              <div className="py-4 flex items-center justify-center text-muted-foreground text-xs gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading...</span>
              </div>
            )}

            {sources.length > 0 &&
              sources.map((source, index) => {
                const displayYear =
                  source.year ||
                  (source.publishedDate
                    ? new Date(source.publishedDate).getFullYear()
                    : null);
                const isPdf =
                  source.id.startsWith("pdf-") || source.url?.endsWith(".pdf");
                const hasJournal = !!source.journalName;

                return (
                  <div
                    key={`${index}-${source.id}`}
                    className={cn(
                      "group relative rounded-xl border transition-all duration-200 cursor-pointer",
                      source.selected
                        ? "border-foreground/10 bg-foreground/[0.02] hover:border-foreground/20"
                        : "border-transparent hover:border-border opacity-50 hover:opacity-80",
                    )}
                    onClick={() => toggleSource(source.id)}>
                    <div className="p-3 flex items-start gap-3">
                      {/* Selection indicator */}
                      <div
                        className={cn(
                          "mt-0.5 shrink-0 w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200",
                          source.selected
                            ? "border-foreground bg-foreground"
                            : "border-muted-foreground/30 group-hover:border-muted-foreground/50",
                        )}>
                        {source.selected && (
                          <Check
                            className="w-2.5 h-2.5 text-background"
                            strokeWidth={3}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title with tooltip */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h4 className="text-[13px] font-medium leading-snug line-clamp-2 text-foreground cursor-default">
                              {source.title}
                            </h4>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[280px]">
                            {source.title}
                          </TooltipContent>
                        </Tooltip>

                        {/* Author & Year with tooltip */}
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                          {source.author ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate max-w-[120px] cursor-default">
                                  {source.author}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="max-w-[240px]">
                                {source.author}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground/60 italic">
                              Unknown author
                            </span>
                          )}
                          {displayYear && (
                            <>
                              <span className="text-muted-foreground/30">
                                ·
                              </span>
                              <span className="tabular-nums">
                                {displayYear}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Source type badges */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {isPdf && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/10 text-[10px] font-medium text-red-600 dark:text-red-400">
                              <FileText className="w-2.5 h-2.5" />
                              PDF
                            </span>
                          )}
                          {hasJournal && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-500/10 text-[10px] font-medium text-blue-600 dark:text-blue-400 truncate max-w-[100px] cursor-default">
                                  {source.journalName}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="max-w-[240px]">
                                {source.journalName}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {source.doi && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                              DOI
                            </span>
                          )}
                        </div>
                      </div>

                      {/* External link - shows on hover */}
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 p-1.5 -mr-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted/80 transition-all duration-150"
                        title="Open source">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                );
              })}

            {sources.length > 0 && onFindMoreSources && (
              <div className="mt-5 pt-4 border-t border-border/40">
                <button
                  onClick={onFindMoreSources}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/30 transition-all duration-150">
                  <Sparkles className="w-3.5 h-3.5" />
                  Find with AI Research
                </button>
              </div>
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

      {/* Paywall Modal - shown when user has insufficient tokens */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        reason={paywallReason}
        estimatedTokens={estimatedTokens}
      />
    </aside>
  );
}
