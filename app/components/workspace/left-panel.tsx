"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Check,
  X,
  Loader2,
  RefreshCw,
  ChevronRight,
  FileText,
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

  // Helper to check if a section is an abstract
  const isAbstractSection = (sectionTitle: string) => {
    return sectionTitle.toLowerCase().includes("abstract");
  };

  // Helper to get display name for a section (with chapter number)
  const getSectionDisplayName = (index: number) => {
    if (!plan) return "";
    const section = plan.sections[index];
    if (isAbstractSection(section.title)) {
      return section.title; // Just "Abstract"
    }
    // Count actual chapters (excluding abstract)
    let chapterNumber = 1;
    for (let i = 0; i < index; i++) {
      if (!isAbstractSection(plan.sections[i].title)) {
        chapterNumber++;
      }
    }
    return `${chapterNumber}. ${section.title}`;
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
      // Fallback or error state could be added here
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger research on mount
  useEffect(() => {
    if (currentStep === "research" && sources.length === 0) {
      fetchResearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const toggleSource = (id: string) => {
    setSources(
      sources.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
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
        }),
      });

      if (!response.ok) throw new Error("Failed to generate structure");

      const data = await response.json();

      // Map API structure to UI plan
      const apiStructure = data.structure;
      const mappedPlan: DocumentPlan = {
        title: apiStructure.title,
        approach: apiStructure.approach,
        tone: apiStructure.tone,
        sections: apiStructure.sections.map((s: any, i: number) => ({
          id: `section-${i}`,
          title: s.heading,
          keyPoints: s.keyPoints || [],
          status: "pending",
        })),
      };

      setPlan(mappedPlan);
    } catch (error) {
      console.error("Planning error:", error);
      // Handle error
    } finally {
      setIsPlanning(false);
    }
  };

  const handleApprovePlan = () => {
    onStepChange("writing");
  };

  if (currentStep === "research") {
    return (
      <aside className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Search className="w-4 h-4 text-accent" />
            <span>Research Discovery</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Finding relevant sources for your topic
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-3" />
              <span className="text-sm">Searching for sources...</span>
            </div>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer",
                  source.selected
                    ? "border-accent/50 bg-accent/5"
                    : "border-border bg-muted/30 opacity-60"
                )}
                onClick={() => toggleSource(source.id)}>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium leading-tight line-clamp-2">
                    {source.title}
                  </h4>
                  <button
                    className={cn(
                      "shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors",
                      source.selected
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                    {source.selected ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {source.snippet}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {source.author && <span>{source.author}</span>}
                  {source.publishedDate && (
                    <span>• {source.publishedDate}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {!isSearching && sources.length > 0 && (
          <div className="p-3 border-t border-border space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchResearch}
              className="w-full justify-center gap-2">
              <RefreshCw className="w-3 h-3" />
              Find more sources
            </Button>
            <Button
              onClick={handleApproveResearch}
              className="w-full gap-2"
              disabled={sources.filter((s) => s.selected).length === 0}>
              Approve & Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </aside>
    );
  }

  if (
    currentStep === "planning" ||
    currentStep === "writing" ||
    currentStep === "complete"
  ) {
    return (
      <aside className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Check className="w-4 h-4 text-accent" />
            <span>Document Blueprint</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Structure and outline for your document
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isPlanning ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-3" />
              <span className="text-sm">Creating your blueprint...</span>
            </div>
          ) : plan ? (
            <div className="space-y-4">
              {/* Title & Approach */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <h3 className="font-medium text-sm">{plan.title}</h3>
                <p className="text-xs text-muted-foreground mt-2">
                  {plan.approach}
                </p>
                <div className="mt-2 inline-block px-2 py-0.5 rounded text-xs bg-accent/10 text-accent">
                  {plan.tone}
                </div>
              </div>

              {/* Sections checklist */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                  Sections
                </h4>
                {plan.sections.map((section, index) => {
                  const isAbstract = isAbstractSection(section.title);
                  // Calculate chapter number for non-abstract sections
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
                          ? "border-accent/50 bg-accent/5"
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
                              ? "bg-accent text-accent-foreground"
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
                      <ul className="mt-2 ml-7 space-y-1">
                        {section.keyPoints.map((point, i) => (
                          <li
                            key={i}
                            className="text-xs text-muted-foreground list-disc">
                            {point}
                          </li>
                        ))}
                      </ul>

                      {/* Accept/Reject buttons for review status */}
                      {section.status === "review" && chapterHandlers && (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <button
                            onClick={chapterHandlers.reject}
                            className="flex items-center justify-center w-6 h-6 rounded bg-red-500 hover:bg-red-600 transition-colors shrink-0"
                            title="Regenerate">
                            <X className="w-3 h-3 text-white" />
                          </button>
                          <button
                            onClick={chapterHandlers.approve}
                            className="px-3 py-1 text-xs font-medium bg-accent hover:bg-accent/90 text-accent-foreground rounded transition-colors">
                            Accept
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {!isPlanning && plan && currentStep === "planning" && (
          <div className="p-3 border-t border-border">
            <Button onClick={handleApprovePlan} className="w-full gap-2">
              Approve & Start Writing
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </aside>
    );
  }

  return null;
}
