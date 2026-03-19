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
    sectionDetails?: SectionDetail[];
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
// ThinkingShimmer
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
// SkeletonCard
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
// SectionCard
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
  const hasDetail = sectionDetail !== null;

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
        <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">
          {index + 1}
        </div>

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
          {isLoadingDetail && !hasDetail && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
          )}
          {hasDetail && (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
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
              {isLoadingDetail && !hasDetail ? (
                <SkeletonCard />
              ) : hasDetail ? (
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
                /* Fallback: basic key points */
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
  const [sectionDetails, setSectionDetails] = useState<(SectionDetail | null)[]>([]);
  const [loadingState, setLoadingState] = useState<"idle" | "done" | "waiting">("idle");

  const hasEdits = editedSections.size > 0;

  // Use section details from plan if already generated (by left-panel flow)
  // Otherwise wait for them to arrive via plan updates
  useEffect(() => {
    if (plan.sectionDetails && plan.sectionDetails.length > 0) {
      console.log("[StructurePreview] Section details available from plan:", plan.sectionDetails.length);
      setSectionDetails(plan.sectionDetails);
      setLoadingState("done");
    } else if (loadingState === "idle") {
      console.log("[StructurePreview] No section details yet, waiting for generation...");
      // Initialize with nulls — details will arrive when left-panel finishes generating
      setSectionDetails(new Array(plan.sections.length).fill(null));
      setLoadingState("waiting");
    }
  }, [plan.sectionDetails, plan.sections.length, loadingState]);

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

  const isLoading = loadingState === "waiting";

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

      {/* Loading progress */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-1"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
          <span className="text-xs text-foreground/50">
            Generating references and subsection details...
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
            isLoadingDetail={isLoading && !sectionDetails[index]}
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
  console.log("[buildDetailsFromIntelligence] Input:", {
    sectionCount: sections.length,
    mappingCount: Array.isArray(sectionMappings) ? sectionMappings.length : "not array",
    sourceCount: researchSources.length,
    analysisSourceCount: sourceAnalysis?.sources?.length || 0,
  });

  if (!Array.isArray(sectionMappings)) {
    console.warn("[buildDetailsFromIntelligence] sectionMappings is not an array:", typeof sectionMappings);
    return [];
  }

  const sourceMap = new Map(researchSources.map((s: any) => [s.id, s]));
  const analysisMap = new Map<string, any>();
  if (sourceAnalysis?.sources) {
    for (const src of sourceAnalysis.sources) {
      const key = src.sourceId || src.id;
      if (key) analysisMap.set(key, src);
    }
  }

  console.log("[buildDetailsFromIntelligence] Maps built:", {
    sourceMapSize: sourceMap.size,
    analysisMapSize: analysisMap.size,
  });

  return sections.map((section, index) => {
    // Match by heading first, then fall back to index
    const mapping = sectionMappings.find(
      (m: any) => m.sectionHeading === section.title
    ) || sectionMappings[index];

    const references = (mapping?.relevantSourceIds || [])
      .map((id: string) => {
        const source = sourceMap.get(id);
        const analysis = analysisMap.get(id);
        if (!source) {
          console.log(`[buildDetailsFromIntelligence] Source not found for id: ${id}`);
          return null;
        }
        return {
          title: source.title,
          author: source.author || "Unknown",
          year: source.published_date
            ? new Date(source.published_date).getFullYear().toString()
            : "",
          reason: analysis?.bestUsedFor || mapping?.suggestedApproach || "",
        };
      })
      .filter(Boolean);

    const subsections = (section.keyPoints || []).map((kp, i) => ({
      title: kp,
      description: "",
    }));

    console.log(`[buildDetailsFromIntelligence] Section "${section.title}": ${references.length} refs, ${subsections.length} subsections`);

    return {
      sectionHeading: section.title,
      detailedDescription: mapping?.sectionThesis || section.description || "",
      subsections,
      references,
    };
  });
}

export default StructurePreview;
