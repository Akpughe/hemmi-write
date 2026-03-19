"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  Copy,
  Plus,
  X,
  Quote,
  Check,
  ChevronRight,
  ChevronLeft,
  Library,
  AlertCircle,
  User,
  Calendar,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

import type { WritingBrief, WorkflowStep, Source } from "@/lib/types/ui";
import { cn } from "@/lib/utils";
import { ChatCitation } from "@/lib/types/chat";
import { CitedText } from "@/lib/utils/citationParser";
import { CitationBadge } from "@/app/components/chat/inline-citation";
import { generateReferenceList, formatReference } from "@/lib/utils/citations";
import { CitationStyle, ResearchSource } from "@/lib/types/document";
import {
  parseTextWithSections,
  TextSegment,
} from "@/lib/utils/sectionReferenceParser";
import {
  SectionLink,
  SectionLinkBadge,
} from "@/app/components/chat/section-reference";
import {
  parseDocumentContent,
  ParsedDocument,
} from "@/lib/utils/documentParser";

// =============================================================================
// Thinking Indicator - Claude/ChatGPT style shimmer
// =============================================================================

function ThinkingShimmer() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-foreground/40"
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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: ChatCitation[];
}

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  citations?: ChatCitation[];
}

interface RightPanelProps {
  brief: WritingBrief;
  currentStep: WorkflowStep;
  askAIContext?: string | null;
  onClearContext?: () => void;
  sources?: Source[];
  currentContent?: string;
  onInsert?: (text: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
  projectId: string | null;
  initialMessages?: PersistedMessage[];
  onRefreshSources?: () => void;
  onNavigateToSection?: (sectionName: string) => void;
}

type RightPanelTab = "chat" | "references";

/**
 * Custom renderer for message content with inline citations and section references
 * Handles both citations AND section references together with proper markdown parsing
 */
function MessageContent({
  content,
  citations,
  onSectionClick,
}: {
  content: string;
  citations?: ChatCitation[];
  onSectionClick?: (sectionName: string) => void;
}) {
  // Parse content for section references
  const segments = useMemo(() => parseTextWithSections(content), [content]);
  const hasSectionReferences = segments.some((seg) => seg.type === "section");
  const hasCitations = citations && citations.length > 0;

  // If there are section references, render with interactive badges
  if (hasSectionReferences) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none wrap-break-word">
        {segments.map((segment, idx) => {
          if (segment.type === "section" && segment.reference) {
            return (
              <SectionLinkBadge
                key={idx}
                reference={segment.reference}
                onClick={(ref) => onSectionClick?.(ref.sectionName)}
              />
            );
          }

          // For text segments, handle citations and markdown
          const textContent = segment.content;
          if (!textContent.trim()) {
            return <span key={idx}>{textContent}</span>;
          }

          // Check if line starts with markdown headers
          const headerMatch = textContent.match(/^(#{1,6})\s+(.+)$/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            // CitedText now handles inline markdown as well
            const headerContent = (
              <CitedText text={text} citations={citations || []} />
            );
            if (level === 1) return <h1 key={idx}>{headerContent}</h1>;
            if (level === 2) return <h2 key={idx}>{headerContent}</h2>;
            if (level === 3) return <h3 key={idx}>{headerContent}</h3>;
            if (level === 4) return <h4 key={idx}>{headerContent}</h4>;
            if (level === 5) return <h5 key={idx}>{headerContent}</h5>;
            return <h6 key={idx}>{headerContent}</h6>;
          }

          // Check if line is a list item
          const listMatch = textContent.match(/^[-*]\s+(.+)$/);
          if (listMatch) {
            return (
              <li key={idx} className="ml-4">
                <CitedText text={listMatch[1]} citations={citations || []} />
              </li>
            );
          }

          // Regular text with citations and markdown parsing
          return (
            <span key={idx}>
              <CitedText text={textContent} citations={citations || []} />
            </span>
          );
        })}
        {hasCitations && <CitationBadge citations={citations} />}
      </div>
    );
  }

  // If there are citations but no section references, use citation-aware rendering
  if (hasCitations) {
    // Split content by lines to handle markdown paragraphs
    const lines = content.split("\n");

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none wrap-break-word">
        {lines.map((line, lineIndex) => {
          if (line.trim() === "") {
            return <br key={lineIndex} />;
          }

          // Check if line starts with markdown headers
          const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            const headerContent = (
              <CitedText text={text} citations={citations} />
            );
            if (level === 1) return <h1 key={lineIndex}>{headerContent}</h1>;
            if (level === 2) return <h2 key={lineIndex}>{headerContent}</h2>;
            if (level === 3) return <h3 key={lineIndex}>{headerContent}</h3>;
            if (level === 4) return <h4 key={lineIndex}>{headerContent}</h4>;
            if (level === 5) return <h5 key={lineIndex}>{headerContent}</h5>;
            return <h6 key={lineIndex}>{headerContent}</h6>;
          }

          // Check if line is a list item
          const listMatch = line.match(/^[-*]\s+(.+)$/);
          if (listMatch) {
            return (
              <li key={lineIndex} className="ml-4">
                <CitedText text={listMatch[1]} citations={citations} />
              </li>
            );
          }

          // Regular paragraph with markdown parsing
          return (
            <p key={lineIndex}>
              <CitedText text={line} citations={citations} />
            </p>
          );
        })}
        <CitationBadge citations={citations} />
      </div>
    );
  }

  // No citations or section references - use regular markdown rendering
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none wrap-break-word">
      <Streamdown>{content}</Streamdown>
    </div>
  );
}

/**
 * References Preview Panel - Shows formatted bibliography
 */
function ReferencesPreview({
  sources,
  citationStyle,
  onRefreshSources,
}: {
  sources: Source[];
  citationStyle: CitationStyle;
  onRefreshSources?: () => void;
}) {
  const [isRefetching, setIsRefetching] = useState(false);
  const [refetchResults, setRefetchResults] = useState<{
    success: number;
    failed: number;
  } | null>(null);
  const [styleOverride, setStyleOverride] =
    useState<CitationStyle>(citationStyle);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerHeight = 140; // Fixed height for the sticky header
  const headerCollapsed = false; // For now, keeping header expanded

  useEffect(() => {
    setStyleOverride(citationStyle);
  }, [citationStyle]);

  const researchSources: ResearchSource[] = useMemo(() => {
    return sources
      .filter((s) => s.selected)
      .map((s) => ({
        id: s.id,
        title: s.title,
        url: s.url,
        excerpt: s.snippet || "",
        author: s.author,
        publishedDate: s.publishedDate,
        selected: true,
        journalName: s.journalName,
        volume: s.volume,
        issue: s.issue,
        pages: s.pages,
        doi: s.doi,
        year: s.year,
        publisher: s.publisher,
        publicationType: s.publicationType as ResearchSource["publicationType"],
        authorsStructured: s.authorsStructured,
      }));
  }, [sources]);

  const sortedSources = useMemo(() => {
    return [...researchSources].sort((a, b) => {
      const authorA = a.author || "Anonymous";
      const authorB = b.author || "Anonymous";
      return authorA.localeCompare(authorB);
    });
  }, [researchSources]);

  const stats = useMemo(() => {
    const withAuthor = researchSources.filter(
      (s) => s.author || (s.authorsStructured && s.authorsStructured.length > 0)
    ).length;
    const withoutAuthor = researchSources.filter(
      (s) =>
        !s.author && (!s.authorsStructured || s.authorsStructured.length === 0)
    );
    return {
      withAuthor,
      withoutAuthor,
      withoutAuthorIds: withoutAuthor.map((s) => s.id),
      total: researchSources.length,
    };
  }, [researchSources]);

  const totalClaims = Math.max(sources.length || researchSources.length, 1);
  const citedClaims = researchSources.length;
  const claimProgress = Math.min(
    100,
    Math.round((citedClaims / totalClaims) * 100)
  );
  const citationStyleOptions = Object.values(CitationStyle);

  const handleRefetchMetadata = async () => {
    if (stats.withoutAuthorIds.length === 0) {
      toast.success("All sources already have author metadata!");
      return;
    }

    setIsRefetching(true);
    setRefetchResults(null);

    try {
      const response = await fetch("/api/sources/refetch-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceIds: stats.withoutAuthorIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to refetch metadata");
      }

      const data = await response.json();
      setRefetchResults(data.results);

      if (data.results.success > 0) {
        toast.success(
          `Successfully updated ${data.results.success} source${
            data.results.success > 1 ? "s" : ""
          }`
        );
        if (onRefreshSources) {
          onRefreshSources();
        }
      } else {
        toast.error("Failed to extract metadata from sources");
      }
    } catch (error) {
      console.error("Metadata refetch error:", error);
      toast.error("Failed to refetch metadata");
    } finally {
      setIsRefetching(false);
    }
  };

  if (researchSources.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-full px-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-foreground/5 flex items-center justify-center mb-4">
          <Library className="w-7 h-7 text-foreground/30" />
        </div>
        <p className="text-base font-semibold text-foreground">
          No references yet
        </p>
        <p className="text-sm text-foreground/50 mt-2 max-w-[260px]">
          Select research sources to build your citation list
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-6">
        <div
          className="sticky top-0 z-20 border-b border-foreground/5 bg-background/95 px-6 pb-5 pt-6 backdrop-blur-sm"
          style={{ height: headerHeight }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Library className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  References
                </p>
                <p
                  className={cn(
                    "text-xs text-foreground/50 leading-relaxed transition-opacity duration-200",
                    headerCollapsed ? "opacity-0" : "opacity-100"
                  )}>
                  Track cited claims and adjust citation styles
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/40">
                Cited
              </p>
              <p className="text-lg font-semibold text-foreground">
                {citedClaims}
                <span className="text-xs text-foreground/40 font-normal">
                  /{totalClaims}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-foreground/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${claimProgress}%` }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-medium tracking-wide text-foreground/40">
                Citation style
              </span>
              <div className="relative">
                <select
                  value={styleOverride}
                  onChange={(event) =>
                    setStyleOverride(event.target.value as CitationStyle)
                  }
                  className="w-full appearance-none rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10 transition-all duration-150">
                  {citationStyleOptions.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 text-xs">
                  ▼
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-foreground/10 bg-foreground/[0.02] px-4 py-3">
              <p className="text-2xl font-semibold text-foreground">
                {stats.total}
              </p>
              <p className="text-xs text-foreground/50">sources formatted</p>
              {stats.withAuthor < stats.total && (
                <p className="mt-2 text-xs font-medium text-amber-500">
                  {stats.total - stats.withAuthor} missing author
                </p>
              )}
            </div>
          </div>

          <AnimatePresence>
            {stats.withoutAuthorIds.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                onClick={handleRefetchMetadata}
                disabled={isRefetching}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs font-medium text-amber-500 transition-all duration-150 hover:bg-amber-500/15 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
                <RefreshCw
                  className={cn("w-3 h-3", isRefetching && "animate-spin")}
                />
                {isRefetching
                  ? "Fetching metadata..."
                  : `Re-fetch metadata for ${
                      stats.withoutAuthorIds.length
                    } source${stats.withoutAuthorIds.length > 1 ? "s" : ""}`}
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {refetchResults && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-2 text-xs flex items-center gap-2 text-emerald-500">
                <Check className="w-3 h-3" />
                <span className="font-medium">
                  {refetchResults.success} updated, {refetchResults.failed}{" "}
                  failed
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-6 pb-6 space-y-3">
          <AnimatePresence mode="popLayout">
            {sortedSources.map((source, index) => {
              const hasAuthor =
                source.author ||
                (source.authorsStructured &&
                  source.authorsStructured.length > 0);
              const formattedRef = formatReference(source, styleOverride);

              return (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.02,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className={cn(
                    "group rounded-xl border p-4 transition-all duration-200",
                    !hasAuthor
                      ? "border-amber-500/20 bg-amber-500/[0.03]"
                      : "border-foreground/5 bg-foreground/[0.02] hover:border-foreground/10"
                  )}>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center text-xs font-medium text-foreground/50">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {!hasAuthor && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-500">
                          <AlertCircle className="w-3 h-3" />
                          Missing author metadata
                        </motion.div>
                      )}
                      <div
                        className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap prose prose-sm max-w-none text-foreground/80"
                        dangerouslySetInnerHTML={{ __html: formattedRef || "" }}
                      />
                      <div className="mt-3 flex flex-wrap gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => {
                            if (!formattedRef) return;
                            // Strip HTML tags from the formatted reference
                            const plainText = formattedRef
                              .replace(/<[^>]*>/g, "")
                              .replace(/&nbsp;/g, " ")
                              .replace(/&amp;/g, "&")
                              .replace(/&lt;/g, "<")
                              .replace(/&gt;/g, ">")
                              .replace(/&quot;/g, '"')
                              .replace(/&#39;/g, "'")
                              .trim();
                            navigator.clipboard.writeText(plainText);
                            toast.success("Reference copied to clipboard");
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-foreground/5 px-2 py-1 text-xs text-foreground/60 hover:bg-foreground/10 hover:text-foreground/80 transition-all duration-150"
                          title="Copy reference">
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                        {source.author && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-foreground/5 px-2 py-1 text-xs text-foreground/50">
                            <User className="w-3 h-3" />
                            {source.author.substring(0, 20)}
                            {source.author.length > 20 ? "..." : ""}
                          </span>
                        )}
                        {source.year && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-foreground/5 px-2 py-1 text-xs text-foreground/50">
                            <Calendar className="w-3 h-3" />
                            {source.year}
                          </span>
                        )}
                        {source.journalName && (
                          <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-600 dark:text-blue-400">
                            Journal
                          </span>
                        )}
                        {source.doi && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-400">
                            <LinkIcon className="w-3 h-3" />
                            DOI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 px-6 py-5 border-t border-foreground/5 space-y-3">
        <button
          onClick={() => {
            const htmlContent = generateReferenceList(
              researchSources,
              styleOverride
            );
            const plainText = htmlContent
              .replaceAll(/<h1>.*?<\/h1>/g, "References\n\n")
              .replaceAll(/<ul>/g, "")
              .replaceAll(/<\/ul>/g, "")
              .replaceAll(/<li>/g, "")
              .replaceAll(/<\/li>/g, "\n\n")
              .replaceAll(/<p>/g, "")
              .replaceAll(/<\/p>/g, "")
              .replaceAll(/<em>/g, "")
              .replaceAll(/<\/em>/g, "")
              .replaceAll(/<strong>/g, "")
              .replaceAll(/<\/strong>/g, "")
              .trim();
            navigator.clipboard.writeText(plainText);
            toast.success("References copied to clipboard");
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background px-4 py-3 text-sm font-semibold transition-all duration-150 hover:bg-foreground/90 active:scale-[0.98]">
          <Copy className="w-4 h-4" />
          Copy all references
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-foreground/10 bg-foreground/[0.02] px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Before you turn it in
            </p>
            <p className="text-xs text-foreground/50">
              Use Fact Checker to verify the accuracy of your claims.
            </p>
          </div>
          <button className="text-foreground/40 text-sm font-medium hover:text-foreground transition-all duration-150">
            Open
          </button>
        </div>
      </div>
    </div>
  );
}

export function RightPanel({
  brief,
  currentStep: _currentStep,
  askAIContext,
  onClearContext,
  sources = [],
  currentContent = "",
  onInsert,
  isOpen = true,
  onToggle,
  projectId,
  initialMessages = [],
  onRefreshSources,
  onNavigateToSection,
}: RightPanelProps) {
  void _currentStep;
  const [activeTab, setActiveTab] = useState<RightPanelTab>("chat");

  // Parse document content into sections for section reference navigation
  const parsedDocument = useMemo(() => {
    if (!currentContent) return null;
    return parseDocumentContent(currentContent);
  }, [currentContent]);

  // Handler for section click - finds matching section and calls onNavigateToSection
  const handleSectionClick = useCallback(
    (sectionName: string) => {
      console.log(`[Section Click] Section: ${sectionName}`);

      // Call the navigation callback to scroll to the section in the editor
      onNavigateToSection?.(sectionName);

      if (!parsedDocument) {
        console.log("[Section Click] No parsed document available");
        return;
      }

      // Find matching section by heading (case-insensitive partial match)
      const matchingSection = parsedDocument.sections.find(
        (section) =>
          section.heading.toLowerCase().includes(sectionName.toLowerCase()) ||
          sectionName.toLowerCase().includes(section.heading.toLowerCase())
      );

      if (matchingSection) {
        console.log(
          `[Section Click] Found matching section: ${matchingSection.heading} (ID: ${matchingSection.id})`
        );
      } else {
        console.log(
          `[Section Click] No matching section found for: ${sectionName}`
        );
        console.log(
          `[Section Click] Available sections:`,
          parsedDocument.sections.map((s) => s.heading)
        );
      }
    },
    [parsedDocument, onNavigateToSection]
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm Hemmi — ask me anything about your topic or sources.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const tabConfig: Array<{
    id: RightPanelTab;
    label: string;
    icon: typeof MessageSquare;
  }> = [
    { id: "chat", label: "AI Chat", icon: MessageSquare },
    { id: "references", label: "References", icon: Library },
  ];

  const selectedSourceCount = useMemo(
    () => sources.filter((s) => s.selected).length,
    [sources]
  );

  const greetingMessage =
    messages.find((msg) => msg.id === "welcome")?.content ||
    "Hi! I'm Hemmi — ask me anything about your topic or sources.";
  const hasOnlyWelcomeMessage =
    messages.length === 1 && messages[0]?.id === "welcome";
  const visibleMessages = hasOnlyWelcomeMessage ? [] : messages;

  const citationStyle = useMemo(() => {
    const styleMap: Record<string, CitationStyle> = {
      APA: CitationStyle.APA,
      MLA: CitationStyle.MLA,
      HARVARD: CitationStyle.HARVARD,
      CHICAGO: CitationStyle.CHICAGO,
      IEEE: CitationStyle.IEEE,
    };
    return styleMap[brief.citationStyle || "APA"] || CitationStyle.APA;
  }, [brief.citationStyle]);

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      const mappedMessages: Message[] = initialMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        citations: msg.citations,
      }));
      if (mappedMessages.length > 0) {
        setMessages(mappedMessages);
      }
    }
  }, [initialMessages]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, activeTab]);

  const adjustInputHeight = () => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const maxHeight = 200;
    textarea.style.height = "auto";
    const nextHeight = Math.min(maxHeight, textarea.scrollHeight);
    textarea.style.height = `${Math.max(nextHeight, 52)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    adjustInputHeight();
  }, [input]);

  const submitMessage = async () => {
    if (!input.trim() || isThinking) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: askAIContext
        ? `[Context: "${askAIContext}"]

${input}`
        : input,
      timestamp: new Date(),
    };

    if (askAIContext && onClearContext) {
      onClearContext();
    }

    setActiveTab("chat");

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);

    try {
      // Create a unique message ID for the streaming response
      const aiMessageId = (Date.now() + 1).toString();
      let streamedContent = "";
      let streamedCitations: ChatCitation[] | undefined;

      // Add empty assistant message that will be filled during streaming
      const aiMessage: Message = {
        id: aiMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Use fetch with streaming response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: projectId
            ? [{ role: userMessage.role, content: userMessage.content }]
            : [...messages, userMessage],
          projectId,
          brief,
          sources,
          currentContent: currentContent,
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7);
            continue;
          }

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.citations) {
                streamedCitations = data.citations;
              }

              if (data.content) {
                streamedContent += data.content;
                // Update the message content in real-time
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? {
                          ...msg,
                          content: streamedContent,
                          citations: streamedCitations,
                        }
                      : msg
                  )
                );
              }

              if (data.tokensUsed) {
                console.log(
                  `[Chat] Response completed. Tokens used: ${data.tokensUsed}`
                );
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error while processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const renderChatView = () => (
    <div className="flex h-full flex-col bg-popover">
      <div className="border-b border-foreground/5 px-6 pt-6 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-foreground/40">
          AI Chat
        </p>
        <p className="mt-2 text-base font-medium leading-snug text-foreground">
          {greetingMessage}
        </p>
        <p className="mt-2 text-sm text-foreground/60">
          Get tailored suggestions to improve clarity, correctness, and
          citations.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {visibleMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-dashed border-foreground/10 bg-foreground/[0.02] px-5 py-6 text-sm text-foreground/50">
            Ask about your outline, tone, or sources to get started.
          </motion.div>
        )}
        <AnimatePresence mode="popLayout">
          {visibleMessages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  duration: 0.25,
                  delay: index * 0.02,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className={cn(
                  "flex max-w-full flex-col gap-2",
                  isUser ? "items-end" : "items-start"
                )}>
                <div
                  className={cn(
                    "w-full max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                    isUser
                      ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-tr-lg"
                      : "bg-foreground/[0.03] text-foreground border border-foreground/5 rounded-tl-lg"
                  )}>
                  <MessageContent
                    content={msg.content}
                    citations={msg.citations}
                    onSectionClick={handleSectionClick}
                  />
                </div>
                {msg.role === "assistant" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="rounded-lg p-1.5 transition-all duration-150 hover:bg-foreground/5 text-foreground/30 hover:text-foreground/60"
                      title="Copy to clipboard">
                      {copiedId === msg.id ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    {onInsert && (
                      <button
                        onClick={() => onInsert(msg.content)}
                        className="rounded-lg p-1.5 transition-all duration-150 hover:bg-foreground/5 text-foreground/30 hover:text-foreground/60"
                        title="Add to document">
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <AnimatePresence>
          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 rounded-2xl border border-foreground/5 bg-foreground/[0.02] px-4 py-3 text-sm text-foreground/60">
              <ThinkingShimmer />
              <span>Hemmi is thinking</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-foreground/5 px-6 py-5">
        <AnimatePresence>
          {askAIContext && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="relative mb-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-sm text-foreground/60">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/40">
                <Quote className="h-3 w-3" />
                Selected Context
              </div>
              <p className="italic text-foreground/70">
                &quot;{askAIContext}&quot;
              </p>
              <button
                onClick={onClearContext}
                className="absolute -right-2 -top-2 rounded-full border border-foreground/10 bg-background p-1.5 text-foreground/40 transition-all duration-150 hover:bg-foreground/5 hover:text-foreground/70">
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Ask Hemmi about this paper"
            rows={1}
            className="w-full resize-none rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 min-h-[52px] transition-all duration-150"
            disabled={isThinking}
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="absolute right-3 top-3 rounded-lg p-2 text-foreground/40 transition-all duration-150 hover:text-foreground hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );

  const renderPanelContent = (tab: RightPanelTab) => {
    if (tab === "references") {
      return (
        <ReferencesPreview
          sources={sources}
          citationStyle={citationStyle}
          onRefreshSources={onRefreshSources}
        />
      );
    }
    return renderChatView();
  };

  const handleCollapse = () => {
    onToggle?.();
  };

  return (
    <aside
      className={cn(
        "relative border-l border-border bg-card h-full transition-all duration-300 ease-in-out",
        isOpen ? "w-[420px] max-w-full" : "w-16"
      )}>
      <button
        onClick={handleCollapse}
        className="absolute -left-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-card p-1.5 shadow-sm transition hover:bg-muted"
        title={isOpen ? "Collapse panel" : "Expand panel"}>
        {isOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {isOpen ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-border/60 bg-card/80 px-4 py-3">
            {tabConfig.map(({ id, label, icon: Icon }) => {
              const isActive = id === activeTab;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "relative inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "active:scale-[0.98]",
                    isActive
                      ? "bg-foreground text-background shadow-sm shadow-foreground/10 gap-2 pr-4"
                      : "text-foreground/50 hover:text-foreground hover:bg-muted/50 gap-0 justify-center w-12"
                  )}
                  title={label}>
                  <Icon className="h-4 w-4" />
                  {isActive && <span>{label}</span>}
                  {id === "references" && selectedSourceCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-semibold">
                      {selectedSourceCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderPanelContent(activeTab)}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center gap-4 px-2 py-6">
          {tabConfig.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                onToggle?.();
              }}
              className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 text-muted-foreground transition hover:border-accent hover:text-accent"
              title={label}>
              <Icon className="h-5 w-5" />
              {id === "references" && selectedSourceCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                  {selectedSourceCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
