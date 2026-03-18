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
  };
  projectId: string | null;
  onStepChange: (step: WorkflowStep) => void;
  onGenerateStructure?: () => void;
  structureCompletedAt?: Date | null;
}

interface SourceIntelligence {
  sourceAnalysis: any | null;
  sectionMappings: any | null;
  researchSources: Array<{
    id: string;
    title: string;
    author: string | null;
    url: string | null;
    published_date: string | null;
    excerpt: string | null;
  }>;
}

// =============================================================================
// ThinkingShimmer - Pulsing dots for loading state
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
// SectionCard - Expandable section with references
// =============================================================================

interface SectionCardProps {
  section: StructurePreviewProps["plan"]["sections"][number];
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onTitleChange: (newTitle: string) => void;
  sourceIntelligence: SourceIntelligence | null;
  isLoadingIntel: boolean;
}

function SectionCard({
  section,
  index,
  isExpanded,
  onToggle,
  onTitleChange,
  sourceIntelligence,
  isLoadingIntel,
}: SectionCardProps) {
  const titleRef = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Resolve references for this section
  const sectionReferences = (() => {
    if (!sourceIntelligence?.sectionMappings || !sourceIntelligence?.researchSources) {
      return [];
    }

    const mappings = sourceIntelligence.sectionMappings;
    // Try to find mapping for this section by id or index
    const sectionMapping =
      (Array.isArray(mappings) ? mappings[index] : null) ||
      (mappings?.sections?.[index]) ||
      null;

    if (!sectionMapping?.relevantSourceIds) return [];

    const sourceMap = new Map(
      sourceIntelligence.researchSources.map((s) => [s.id, s])
    );

    // Also get analyzed source data for "bestUsedFor"
    const analysisMap = new Map<string, any>();
    if (sourceIntelligence.sourceAnalysis?.sources) {
      for (const src of sourceIntelligence.sourceAnalysis.sources) {
        if (src.id) analysisMap.set(src.id, src);
      }
    }

    return sectionMapping.relevantSourceIds
      .map((id: string) => {
        const source = sourceMap.get(id);
        if (!source) return null;
        const analysis = analysisMap.get(id);
        return {
          ...source,
          bestUsedFor: analysis?.bestUsedFor || null,
        };
      })
      .filter(Boolean);
  })();

  const referenceCount = sectionReferences.length;

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.05, 0.3),
      }}
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm transition-all duration-300",
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
              "text-sm font-medium text-foreground truncate",
              isEditing &&
                "outline-none ring-1 ring-blue-500/50 rounded px-1 -mx-1 bg-blue-50/50 dark:bg-blue-500/10"
            )}
          >
            {section.title}
          </span>
          {!isEditing && (
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
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 shrink-0">
          {section.estimatedWordCount && (
            <span className="text-xs text-foreground/40">
              ~{section.estimatedWordCount}w
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
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Key points / subsections */}
              {section.keyPoints && section.keyPoints.length > 0 && (
                <div className="pl-10">
                  <div className="text-xs font-medium text-foreground/50 mb-1.5">
                    Key points
                  </div>
                  <ul className="space-y-1">
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
              )}

              {/* Description */}
              {section.description && (
                <div className="pl-10">
                  <p className="text-sm text-foreground/60 leading-relaxed">
                    {section.description}
                  </p>
                </div>
              )}

              {/* Loading shimmer for source intelligence */}
              {isLoadingIntel && (
                <div className="pl-10 flex items-center gap-2 text-xs text-foreground/40">
                  <span>Loading references</span>
                  <ThinkingShimmer />
                </div>
              )}

              {/* References */}
              {referenceCount > 0 && (
                <div className="pl-10">
                  <div className="text-xs font-medium text-foreground/50 mb-2">
                    References
                  </div>
                  <div className="space-y-2">
                    {sectionReferences.map((ref: any, i: number) => (
                      <div
                        key={ref.id || i}
                        className="bg-blue-50 dark:bg-blue-500/10 border-l-[3px] border-blue-500 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-foreground/80 truncate">
                              {ref.author && (
                                <span>
                                  {ref.author}
                                  {ref.published_date && (
                                    <span className="text-foreground/40">
                                      {" "}
                                      ({new Date(ref.published_date).getFullYear()})
                                    </span>
                                  )}
                                  {" — "}
                                </span>
                              )}
                              {ref.title}
                            </div>
                            {ref.bestUsedFor && (
                              <p className="text-xs text-foreground/50 mt-1 leading-relaxed">
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  Why:{" "}
                                </span>
                                {ref.bestUsedFor}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
  onStepChange,
  onGenerateStructure,
  structureCompletedAt,
}: StructurePreviewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [editedSections, setEditedSections] = useState<
    Map<number, { title: string }>
  >(new Map());
  const [sourceIntelligence, setSourceIntelligence] =
    useState<SourceIntelligence | null>(null);
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);

  const hasEdits = editedSections.size > 0;

  // Fetch source intelligence on mount
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    setIsLoadingIntel(true);

    fetch(`/api/write/analyze-sources?projectId=${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setSourceIntelligence(data);
        }
      })
      .catch(() => {
        // Silently fail - references are optional enhancement
      })
      .finally(() => {
        if (!cancelled) setIsLoadingIntel(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

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

      {/* Approach/tone if present */}
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
            sourceIntelligence={sourceIntelligence}
            isLoadingIntel={isLoadingIntel}
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

export default StructurePreview;
