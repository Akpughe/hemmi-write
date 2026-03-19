"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Edit3,
  RefreshCw,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkflowStep, DocumentPlan } from "@/lib/types/ui";

// =============================================================================
// Types
// =============================================================================

interface StructurePreviewProps {
  plan: DocumentPlan & {
    sections: Array<{
      id?: string;
      title: string;
      keyPoints?: string[];
      description?: string;
      estimatedWordCount?: number;
      status?: string;
    }>;
    sectionDetails?: SectionDetail[];
  };
  setPlan: (plan: DocumentPlan) => void;
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
  subsections: Array<{ title: string; description: string }>;
  references: Array<{ title: string; author: string; year: string; reason: string }>;
}

// =============================================================================
// SectionRow
// =============================================================================

function SectionRow({
  section,
  index,
  isExpanded,
  onToggle,
  onTitleChange,
  sectionDetail,
  totalSections,
  isLoadingRefs,
}: {
  section: StructurePreviewProps["plan"]["sections"][number];
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onTitleChange: (title: string) => void;
  sectionDetail: SectionDetail | null;
  totalSections: number;
  isLoadingRefs: boolean;
}) {
  const titleRef = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const hasDetail = sectionDetail !== null;
  const subsections = sectionDetail?.subsections || [];
  const references = sectionDetail?.references || [];
  const keyPoints = section.keyPoints || [];

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const text = titleRef.current?.textContent?.trim();
    if (text && text !== section.title) onTitleChange(text);
  }, [section.title, onTitleChange]);

  // Items to show in outline
  const outlineItems = hasDetail && subsections.length > 0
    ? subsections
    : keyPoints.map(kp => ({ title: kp, description: "" }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.25) }}
    >
      {/* Row header */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 py-3 text-left group transition-colors duration-150",
          "hover:bg-foreground/[0.015] rounded-lg px-2 -mx-2"
        )}
      >
        <span className="text-[13px] tabular-nums text-foreground/30 w-5 text-right shrink-0 font-medium">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <span
            ref={titleRef}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleBlur(); }
              if (e.key === "Escape") {
                setIsEditing(false);
                if (titleRef.current) titleRef.current.textContent = section.title;
              }
            }}
            onClick={(e) => { if (isEditing) e.stopPropagation(); }}
            className={cn(
              "text-[14px] font-medium text-foreground/90 leading-snug",
              isEditing && "outline-none ring-1 ring-foreground/20 rounded px-1 -mx-1 bg-foreground/[0.03]"
            )}
          >
            {section.title}
          </span>

          {section.estimatedWordCount && (
            <span className="text-[11px] text-foreground/25 shrink-0">
              {section.estimatedWordCount.toLocaleString()} words
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
              setTimeout(() => titleRef.current?.focus(), 0);
            }}
            onKeyDown={() => {}}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-foreground/5 transition-opacity cursor-pointer"
          >
            <Edit3 className="w-3 h-3 text-foreground/30" />
          </span>

          {references.length > 0 && (
            <span className="text-[11px] text-foreground/45 tabular-nums">
              {references.length} source{references.length !== 1 ? "s" : ""}
            </span>
          )}

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-foreground/25" />
          </motion.div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-8 pr-2 pb-5 pt-1 space-y-5">
              {/* Description */}
              {(sectionDetail?.detailedDescription || section.description) && (
                <p className="text-[13px] text-foreground/55 leading-relaxed max-w-prose">
                  {sectionDetail?.detailedDescription || section.description}
                </p>
              )}

              {/* Outline */}
              {outlineItems.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-foreground/45 uppercase tracking-widest mb-3">
                    Outline
                  </h4>
                  <div className="space-y-1">
                    {outlineItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 py-1.5">
                        <span className="text-[11px] text-foreground/30 tabular-nums mt-[2px] w-7 shrink-0 text-right">
                          {index + 1}.{i + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="text-[13px] text-foreground/75">
                            {item.title}
                          </span>
                          {item.description && (
                            <p className="text-[12px] text-foreground/40 mt-0.5 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {references.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-foreground/45 uppercase tracking-widest mb-3">
                    Sources for this section
                  </h4>
                  <div className="space-y-4">
                    {references.map((ref, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <div className="text-[13px]">
                          <span className="font-medium text-foreground/80">{ref.author}</span>
                          {ref.year && <span className="text-foreground/40"> ({ref.year})</span>}
                        </div>
                        <div className="text-[12px] text-foreground/45 italic mt-0.5">
                          {ref.title}
                        </div>
                        {ref.reason && (
                          <div className="text-[12px] text-foreground/40 mt-1 leading-relaxed">
                            <span className="text-foreground/55 font-medium">Relevance: </span>
                            {ref.reason}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading indicator for this section */}
              {isLoadingRefs && references.length === 0 && (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-foreground/30" />
                  <span className="text-[11px] text-foreground/35">Loading sources...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      {index < totalSections - 1 && (
        <div className="h-px bg-foreground/[0.05] ml-8" />
      )}
    </motion.div>
  );
}

// =============================================================================
// Main
// =============================================================================

export function StructurePreview({
  plan,
  setPlan,
  projectId,
  sources,
  onStepChange,
  onGenerateStructure,
  structureCompletedAt,
}: StructurePreviewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [editedSections, setEditedSections] = useState<Map<number, { title: string }>>(new Map());
  const [sectionDetails, setSectionDetails] = useState<(SectionDetail | null)[]>([]);
  const [loadingState, setLoadingState] = useState<"idle" | "done" | "waiting">("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingIndex, setRefreshingIndex] = useState(-1);

  const hasEdits = editedSections.size > 0;

  // Receive section details from plan
  useEffect(() => {
    if (plan.sectionDetails && plan.sectionDetails.length > 0) {
      setSectionDetails(plan.sectionDetails);
      setLoadingState("done");
    } else if (loadingState === "idle") {
      setSectionDetails(new Array(plan.sections.length).fill(null));
      setLoadingState("waiting");
    }
  }, [plan.sectionDetails, plan.sections.length, loadingState]);

  // Timeout
  useEffect(() => {
    if (loadingState !== "waiting") return;
    const t = setTimeout(() => setLoadingState("done"), 20000);
    return () => clearTimeout(t);
  }, [loadingState]);

  // Missing refs detection
  const missingCount = plan.sections.filter((_, i) => {
    const d = sectionDetails[i];
    return !d || !d.references || d.references.length === 0;
  }).length;
  const hasMissing = missingCount > 0 && loadingState === "done";

  // Persist section details to plan when they change (so they survive re-renders)
  const persistDetails = useCallback((details: (SectionDetail | null)[]) => {
    const validDetails = details.filter((d): d is SectionDetail => d !== null);
    if (validDetails.length > 0) {
      setPlan({ ...plan, sectionDetails: validDetails } as any);
    }
  }, [plan, setPlan]);

  // Refresh handler — fetches and shows section-by-section progressively
  const handleRefresh = useCallback(async () => {
    if (!projectId || isRefreshing) return;
    setIsRefreshing(true);
    setRefreshingIndex(0);

    try {
      const res = await fetch("/api/write/structure-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          sections: plan.sections.map((s) => ({
            heading: s.title, keyPoints: s.keyPoints,
            description: (s as any).description || "", estimatedWordCount: s.estimatedWordCount,
          })),
          sources: sources.slice(0, 15).map((s) => ({
            title: s.title, author: s.author,
            excerpt: s.excerpt, publishedDate: s.publishedDate,
          })),
          topic: plan.title,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.sectionDetails?.length) {
          // Show progressively — one section at a time
          const newDetails = [...sectionDetails];
          for (let i = 0; i < data.sectionDetails.length; i++) {
            const existing = newDetails[i];
            if (!existing?.references?.length) {
              newDetails[i] = data.sectionDetails[i];
            }
            setRefreshingIndex(i + 1);
            setSectionDetails([...newDetails]);
            // Small delay so the user sees each one appear
            await new Promise(r => setTimeout(r, 100));
          }
          // Persist to plan so they survive navigation
          persistDetails(newDetails);
        }
      }
    } catch (err) {
      console.warn("[StructurePreview] Refresh error:", err);
    } finally {
      setIsRefreshing(false);
      setRefreshingIndex(-1);
    }
  }, [projectId, plan, sources, isRefreshing, sectionDetails, persistDetails]);

  const handleTitleChange = useCallback((index: number, title: string) => {
    setEditedSections((prev) => { const n = new Map(prev); n.set(index, { title }); return n; });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      {/* Title */}
      <div>
        <h2 className="text-lg font-semibold text-foreground/90 leading-tight">
          {plan.title}
        </h2>
        {plan.approach && (
          <p className="text-[13px] text-foreground/45 mt-1.5 leading-relaxed max-w-prose">
            {plan.approach}
          </p>
        )}
      </div>

      {/* Section list */}
      <div className="rounded-xl border border-foreground/[0.06] bg-card">
        <div className="px-4 py-3 flex items-center justify-between border-b border-foreground/[0.05]">
          <span className="text-[12px] font-medium text-foreground/50">
            {plan.sections.length} sections
            {plan.tone && <span className="text-foreground/30"> · {plan.tone}</span>}
          </span>

          <div className="flex items-center gap-2">
            {loadingState === "waiting" && (
              <span className="flex items-center gap-1.5 text-[11px] text-foreground/40">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading details
              </span>
            )}

            {hasMissing && !isRefreshing && (
              <button
                type="button"
                onClick={handleRefresh}
                className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/50 hover:text-foreground/70 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Load references
              </button>
            )}

            {isRefreshing && (
              <span className="flex items-center gap-1.5 text-[11px] text-foreground/40">
                <Loader2 className="w-3 h-3 animate-spin" />
                {refreshingIndex > 0
                  ? `Loading ${refreshingIndex}/${plan.sections.length}`
                  : "Fetching references"}
              </span>
            )}
          </div>
        </div>

        <div className="px-4 py-2">
          {plan.sections.map((section, index) => (
            <SectionRow
              key={section.id || index}
              section={section}
              index={index}
              isExpanded={expandedIndex === index}
              onToggle={() => setExpandedIndex((p) => (p === index ? null : index))}
              onTitleChange={(t) => handleTitleChange(index, t)}
              sectionDetail={sectionDetails[index] || null}
              totalSections={plan.sections.length}
              isLoadingRefs={isRefreshing && refreshingIndex <= index}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] text-foreground/25">
          {structureCompletedAt && (
            <>Updated {structureCompletedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</>
          )}
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence>
            {hasEdits && onGenerateStructure && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGenerateStructure}
                  className="gap-1.5 text-xs h-8 rounded-lg border-foreground/10"
                >
                  <RefreshCw className="w-3 h-3" />
                  Update
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={() => onStepChange("writing")}
            size="sm"
            className="gap-1.5 text-xs h-8 rounded-lg"
          >
            Start writing
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default StructurePreview;
