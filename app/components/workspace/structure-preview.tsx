"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Check,
  BookOpen,
  Edit3,
  RefreshCw,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkflowStep } from "@/lib/types/ui";

// =============================================================================
// Types
// =============================================================================

interface StructurePreviewProps {
  plan: {
    title: string;
    sections: Array<{
      id?: string;
      title: string;
      keyPoints?: string[];
      description?: string;
      estimatedWordCount?: number;
      status?: string;
    }>;
    approach?: string;
    tone?: string;
  };
  projectId: string | null;
  sources: Array<{
    id?: string;
    title: string;
    author?: string;
    url?: string;
    publishedDate?: string;
    excerpt?: string;
  }>;
  onStepChange: (step: WorkflowStep) => void;
  onGenerateStructure?: () => void;
  structureCompletedAt?: Date | null;
}

interface SectionDetail {
  sectionHeading: string;
  detailedDescription: string;
  subsections: Array<{
    title: string;
    description: string;
  }>;
  references: Array<{
    title: string;
    author: string;
    year: string;
    reason: string;
  }>;
}

// =============================================================================
// ThinkingShimmer - Pulsing dots for loading state
// =============================================================================

function ThinkingShimmer({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2">
      {text && <span className="text-xs text-foreground/40">{text}</span>}
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
    </div>
  );
}

// =============================================================================
// SkeletonCard - Shimmer placeholder while loading details
// =============================================================================

function SkeletonCard() {
  return (
    <div className="pl-10 space-y-3 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 bg-foreground/5 rounded w-24" />
        <div className="space-y-1.5">
          <div className="h-8 bg-foreground/[0.03] rounded-lg w-full" />
          <div className="h-8 bg-foreground/[0.03] rounded-lg w-5/6" />
          <div className="h-8 bg-foreground/[0.03] rounded-lg w-4/6" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-foreground/5 rounded w-32" />
        <div className="h-16 bg-blue-50/50 dark:bg-blue-500/5 rounded-lg w-full" />
        <div className="h-16 bg-blue-50/50 dark:bg-blue-500/5 rounded-lg w-full" />
      </div>
    </div>
  );
}

// =============================================================================
// SectionCard - Expandable section with subsection details + references
// =============================================================================

interface SectionCardProps {
  section: StructurePreviewProps["plan"]["sections"][number];
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onTitleChange: (newTitle: string) => void;
  sectionDetail: SectionDetail | null;
  isLoadingDetail: boolean;
}

function SectionCard({
  section,
  index,
  isExpanded,
  onToggle,
  onTitleChange,
  sectionDetail,
  isLoadingDetail,
}: SectionCardProps) {
  const titleRef = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const referenceCount = sectionDetail?.references?.length || 0;
  const subsections = sectionDetail?.subsections || [];

  const handleTitleBlur = useCallback(() => {
    setIsEditing(false);
    if (titleRef.current) {
      const newTitle = titleRef.current.textContent?.trim();
      if (newTitle && newTitle !== section.title) {
        onTitleChange(newTitle);
      }
    }
  }, [section.title, onTitleChange]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleTitleBlur();
      }
      if (e.key === "Escape") {
        setIsEditing(false);
        if (titleRef.current) {
          titleRef.current.textContent = section.title;
        }
      }
    },
    [handleTitleBlur, section.title]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.05, 0.3),
      }}
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm transition-all duration-300 group",
        isExpanded && "border-blue-500/20 shadow-md"
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-foreground/[0.02] transition-colors duration-200 rounded-xl"
      >
        {/* Section number */}
        <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">
          {index + 1}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span
            ref={titleRef}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            onClick={(e) => {
              if (isEditing) e.stopPropagation();
            }}
            className={cn(
              "text-sm font-medium text-foreground",
              isEditing &&
                "outline-none ring-1 ring-blue-500/50 rounded px-1 -mx-1 bg-blue-50/50 dark:bg-blue-500/10"
            )}
          >
            {section.title}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
              setTimeout(() => titleRef.current?.focus(), 0);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-foreground/5 transition-opacity"
          >
            <Edit3 className="w-3 h-3 text-foreground/30" />
          </button>
        </div>

        {/* Meta badges */}
        <div className="flex items-center gap-2 shrink-0">
          {section.estimatedWordCount && (
            <span className="text-[11px] text-foreground/40">
              ~{section.estimatedWordCount.toLocaleString()}w
            </span>
          )}
          {referenceCount > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-0"
            >
              <BookOpen className="w-3 h-3 mr-0.5" />
              {referenceCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-foreground/30" />
          ) : (
            <ChevronRight className="w-4 h-4 text-foreground/30" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-foreground/5 pt-3">
              {isLoadingDetail ? (
                <SkeletonCard />
              ) : sectionDetail ? (
                <>
                  {/* Detailed description */}
                  {sectionDetail.detailedDescription && (
                    <div className="pl-10">
                      <p className="text-sm text-foreground/60 leading-relaxed">
                        {sectionDetail.detailedDescription}
                      </p>
                    </div>
                  )}

                  {/* Subsections with descriptions */}
                  {subsections.length > 0 && (
                    <div className="pl-10">
                      <div className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-2">
                        Subsections
                      </div>
                      <div className="space-y-2">
                        {subsections.map((sub, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-start gap-2.5 p-2.5 bg-foreground/[0.02] rounded-lg"
                          >
                            <span className="text-xs font-medium text-foreground/40 mt-0.5 shrink-0 w-6">
                              {index + 1}.{i + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground/80">
                                {sub.title}
                              </div>
                              {sub.description && (
                                <p className="text-xs text-foreground/50 mt-0.5 leading-relaxed">
                                  {sub.description}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* References for this section */}
                  {sectionDetail.references.length > 0 && (
                    <div className="pl-10">
                      <div className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-2">
                        References for this section
                      </div>
                      <div className="space-y-2">
                        {sectionDetail.references.map((ref, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-blue-50 dark:bg-blue-500/10 border-l-[3px] border-blue-500 rounded-lg p-3"
                          >
                            <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
                              {ref.author}
                              {ref.year && (
                                <span className="text-blue-500/60"> ({ref.year})</span>
                              )}
                            </div>
                            <div className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                              {ref.title}
                            </div>
                            {ref.reason && (
                              <p className="text-[11px] text-foreground/50 mt-1.5 leading-relaxed">
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  Why:{" "}
                                </span>
                                {ref.reason}
                              </p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Fallback: show basic key points when no detail available */
                section.keyPoints && section.keyPoints.length > 0 && (
                  <div className="pl-10">
                    <div className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-2">
                      Key points
                    </div>
                    <ul className="space-y-1.5">
                      {section.keyPoints.map((point, i) => (
                        <li
                          key={i}
                          className="text-sm text-foreground/70 flex items-start gap-2"
                        >
                          <Check className="w-3 h-3 text-emerald-500 mt-1 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function StructurePreview({
  plan,
  projectId,
  sources,
  onStepChange,
  onGenerateStructure,
  structureCompletedAt,
}: StructurePreviewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [editedSections, setEditedSections] = useState<Map<number, { title: string }>>(
    new Map()
  );
  const [sectionDetails, setSectionDetails] = useState<SectionDetail[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  const hasEdits = editedSections.size > 0;

  // Generate detailed section previews with references on mount
  useEffect(() => {
    if (!projectId || detailsLoaded || isLoadingDetails) return;
    if (!plan.sections.length || !sources.length) return;

    let cancelled = false;
    setIsLoadingDetails(true);

    // First try to fetch existing source intelligence
    fetch(`/api/write/analyze-sources?projectId=${projectId}`)
      .then((res) => res.ok ? res.json() : null)
      .then(async (existingData) => {
        if (cancelled) return;

        // If we have existing detailed mappings, use them
        if (existingData?.sectionMappings && existingData?.sourceAnalysis) {
          const details = buildDetailsFromIntelligence(
            plan.sections,
            existingData.sourceAnalysis,
            existingData.sectionMappings,
            existingData.researchSources || sources
          );
          if (details.length > 0) {
            setSectionDetails(details);
            setDetailsLoaded(true);
            setIsLoadingDetails(false);
            return;
          }
        }

        // Otherwise, generate detailed preview via API
        try {
          const response = await fetch("/api/write/structure-preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              sections: plan.sections.map((s) => ({
                heading: s.title,
                keyPoints: s.keyPoints,
                description: s.description,
                estimatedWordCount: s.estimatedWordCount,
              })),
              sources: sources.slice(0, 15).map((s) => ({
                title: s.title,
                author: s.author,
                excerpt: s.excerpt,
                publishedDate: s.publishedDate,
              })),
              topic: plan.title,
            }),
          });

          if (!cancelled && response.ok) {
            const data = await response.json();
            if (data.sectionDetails) {
              setSectionDetails(data.sectionDetails);
            }
          }
        } catch {
          // Non-fatal — preview shows basic key points as fallback
        }

        if (!cancelled) {
          setDetailsLoaded(true);
          setIsLoadingDetails(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetailsLoaded(true);
          setIsLoadingDetails(false);
        }
      });

    return () => { cancelled = true; };
  }, [projectId, plan.sections, plan.title, sources, detailsLoaded, isLoadingDetails]);

  const handleTitleChange = useCallback(
    (index: number, newTitle: string) => {
      setEditedSections((prev) => {
        const next = new Map(prev);
        next.set(index, { title: newTitle });
        return next;
      });
    },
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Title and meta */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Title</div>
          <div className="text-base font-semibold truncate">{plan.title}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary">{plan.sections.length} sections</Badge>
        </div>
      </div>

      {/* Approach/tone */}
      {(plan.approach || plan.tone) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-4 py-3 rounded-xl bg-foreground/[0.02] border border-foreground/5"
        >
          {plan.approach && (
            <div className="text-xs text-foreground/60">
              <span className="font-medium text-foreground/80">Approach:</span>{" "}
              {plan.approach}
            </div>
          )}
          {plan.tone && (
            <div className="text-xs text-foreground/60 mt-1">
              <span className="font-medium text-foreground/80">Tone:</span>{" "}
              {plan.tone}
            </div>
          )}
        </motion.div>
      )}

      {/* Loading indicator */}
      {isLoadingDetails && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-1"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
          <span className="text-xs text-foreground/50">
            Generating detailed preview with references...
          </span>
        </motion.div>
      )}

      {/* Section cards */}
      <div className="space-y-2">
        {plan.sections.map((section, index) => (
          <SectionCard
            key={section.id || index}
            section={section}
            index={index}
            isExpanded={expandedIndex === index}
            onToggle={() =>
              setExpandedIndex((prev) => (prev === index ? null : index))
            }
            onTitleChange={(newTitle) => handleTitleChange(index, newTitle)}
            sectionDetail={sectionDetails[index] || null}
            isLoadingDetail={isLoadingDetails && expandedIndex === index}
          />
        ))}
      </div>

      {/* Timestamp */}
      {structureCompletedAt && (
        <div className="text-xs text-muted-foreground">
          Updated{" "}
          {structureCompletedAt.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <AnimatePresence>
          {hasEdits && onGenerateStructure && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateStructure}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Update Structure
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <Button className="gap-2" onClick={() => onStepChange("writing")}>
          Start writing
        </Button>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Helper: Build section details from existing source intelligence
// =============================================================================

function buildDetailsFromIntelligence(
  sections: StructurePreviewProps["plan"]["sections"],
  sourceAnalysis: any,
  sectionMappings: any[],
  researchSources: any[]
): SectionDetail[] {
  if (!Array.isArray(sectionMappings)) return [];

  const sourceMap = new Map(researchSources.map((s: any) => [s.id, s]));
  const analysisMap = new Map<string, any>();
  if (sourceAnalysis?.sources) {
    for (const src of sourceAnalysis.sources) {
      if (src.sourceId) analysisMap.set(src.sourceId, src);
    }
  }

  return sections.map((section, index) => {
    const mapping = sectionMappings.find(
      (m: any) => m.sectionHeading === section.title
    ) || sectionMappings[index];

    const references = (mapping?.relevantSourceIds || [])
      .map((id: string) => {
        const source = sourceMap.get(id);
        const analysis = analysisMap.get(id);
        if (!source) return null;
        return {
          title: source.title,
          author: source.author || "Unknown",
          year: source.published_date
            ? new Date(source.published_date).getFullYear().toString()
            : "",
          reason: analysis?.bestUsedFor || "",
        };
      })
      .filter(Boolean);

    const subsections = (section.keyPoints || []).map((kp) => {
      const matchingAnalysis = analysisMap.get(kp);
      return {
        title: kp,
        description: matchingAnalysis?.keyFindings || "",
      };
    });

    return {
      sectionHeading: section.title,
      detailedDescription: mapping?.sectionThesis || section.description || "",
      subsections,
      references,
    };
  });
}

export default StructurePreview;
