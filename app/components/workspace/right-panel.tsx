"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
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
import Markdown from "marked-react";
import { toast } from "sonner";

import type { WritingBrief, WorkflowStep, Source } from "@/lib/types/ui";
import { cn } from "@/lib/utils";
import { ChatCitation } from "@/lib/types/chat";
import { CitedText } from "@/lib/utils/citationParser";
import { CitationBadge } from "@/app/components/chat/inline-citation";
import { generateReferenceList, formatReference } from "@/lib/utils/citations";
import { CitationStyle, ResearchSource } from "@/lib/types/document";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: ChatCitation[];
}

interface PersistedMessage {
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
}

type RightPanelTab = "chat" | "references";

/**
 * Custom renderer for message content with inline citations
 */
function MessageContent({
  content,
  citations,
}: {
  content: string;
  citations?: ChatCitation[];
}) {
  // If there are citations, use citation-aware rendering
  if (citations && citations.length > 0) {
    // Split content by lines to handle markdown paragraphs
    const lines = content.split("\n");

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
        {lines.map((line, lineIndex) => {
          if (line.trim() === "") {
            return <br key={lineIndex} />;
          }

          // Check if line starts with markdown headers
          const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            // Render headers based on level
            if (level === 1)
              return (
                <h1 key={lineIndex}>
                  <CitedText text={text} citations={citations} />
                </h1>
              );
            if (level === 2)
              return (
                <h2 key={lineIndex}>
                  <CitedText text={text} citations={citations} />
                </h2>
              );
            if (level === 3)
              return (
                <h3 key={lineIndex}>
                  <CitedText text={text} citations={citations} />
                </h3>
              );
            if (level === 4)
              return (
                <h4 key={lineIndex}>
                  <CitedText text={text} citations={citations} />
                </h4>
              );
            if (level === 5)
              return (
                <h5 key={lineIndex}>
                  <CitedText text={text} citations={citations} />
                </h5>
              );
            return (
              <h6 key={lineIndex}>
                <CitedText text={text} citations={citations} />
              </h6>
            );
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

          // Regular paragraph
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

  // No citations - use regular markdown rendering
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <Markdown>{content}</Markdown>
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
      <div className="flex flex-col items-center justify-center h-full px-8 text-center bg-gradient-to-b from-background to-muted/40">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Library className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold">No references yet</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Select research sources to build your citation list. You&apos;ll see
          live formatting here once you add material to cite.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-background via-background to-muted/30">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-6">
        <div
          className="sticky top-0 z-20 border-b border-border/60 bg-gradient-to-b from-background via-background/95 to-background/60 px-6 pb-5 pt-6 backdrop-blur"
          style={{ height: headerHeight }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                <Library className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">References</p>
                <p
                  className={cn(
                    "text-xs text-muted-foreground leading-relaxed transition-opacity duration-200",
                    headerCollapsed ? "opacity-0" : "opacity-100"
                  )}>
                  Track cited claims, adjust citation styles, and keep every
                  reference cleaned up before submission.
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-muted-foreground">
                Claims cited
              </p>
              <p className="text-lg font-semibold">
                {citedClaims}{" "}
                <span className="text-xs text-muted-foreground">
                  / {totalClaims}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-accent transition-all"
              style={{ width: `${claimProgress}%` }}
            />
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase font-semibold text-muted-foreground">
                Citation style
              </span>
              <div className="relative">
                <select
                  value={styleOverride}
                  onChange={(event) =>
                    setStyleOverride(event.target.value as CitationStyle)
                  }
                  className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  {citationStyleOptions.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ▼
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-border/80 bg-card px-4 py-3 shadow-inner">
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">sources formatted</p>
              {stats.withAuthor < stats.total && (
                <p className="mt-2 text-xs font-semibold text-amber-600">
                  {stats.total - stats.withAuthor} missing author metadata
                </p>
              )}
            </div>
          </div>

          {stats.withoutAuthorIds.length > 0 && (
            <button
              onClick={handleRefetchMetadata}
              disabled={isRefetching}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40">
              <RefreshCw
                className={cn("w-3 h-3", isRefetching && "animate-spin")}
              />
              {isRefetching
                ? "Fetching metadata..."
                : `Re-fetch metadata for ${
                    stats.withoutAuthorIds.length
                  } source${stats.withoutAuthorIds.length > 1 ? "s" : ""}`}
            </button>
          )}

          {refetchResults && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-xs flex items-center gap-2 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
              <Check className="w-3 h-3" />
              <span className="font-medium">
                {refetchResults.success} updated, {refetchResults.failed} failed
              </span>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 space-y-4">
          {sortedSources.map((source, index) => {
            const hasAuthor =
              source.author ||
              (source.authorsStructured && source.authorsStructured.length > 0);
            const formattedRef = formatReference(source, styleOverride);

            return (
              <div
                key={source.id}
                className={cn(
                  "rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur transition hover:border-accent/40",
                  !hasAuthor &&
                    "border-amber-200 bg-amber-50/60 dark:bg-amber-950/30"
                )}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    {!hasAuthor && (
                      <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3 h-3" />
                        Missing author metadata
                      </div>
                    )}
                    <div
                      className="text-sm leading-relaxed break-words whitespace-pre-wrap prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: formattedRef }}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
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
                        className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
                        title="Copy reference">
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                      {source.author && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2 py-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          {source.author.substring(0, 20)}
                          {source.author.length > 20 ? "..." : ""}
                        </span>
                      )}
                      {source.year && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2 py-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {source.year}
                        </span>
                      )}
                      {source.journalName && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                          Journal
                        </span>
                      )}
                      {source.doi && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-200">
                          <LinkIcon className="w-3 h-3" />
                          DOI
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 px-6 py-5 border-t border-border/60 space-y-3">
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
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/30 transition hover:bg-accent/90">
          <Copy className="w-4 h-4" />
          Copy all references
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/80 px-4 py-3 text-xs">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              Before you turn it in
            </p>
            <p className="text-xs text-muted-foreground">
              Use Fact Checker to verify the accuracy of your claims.
            </p>
          </div>
          <button className="text-accent text-sm font-semibold hover:underline">
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
}: RightPanelProps) {
  void _currentStep;
  const [activeTab, setActiveTab] = useState<RightPanelTab>("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm Hemmi. I can help you research, plan, and write your document. Ask me anything about your topic or sources.",
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
    "Hi! I'm Hemmi. I can help you research, plan, and write your document.";
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        citations: data.citations,
      };
      setMessages((prev) => [...prev, aiMessage]);
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
      <div className="border-b border-border/60 px-6 pt-6 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          AI Chat
        </p>
        <h3 className="mt-3 text-2xl font-semibold leading-snug">
          {greetingMessage}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Get tailored suggestions to improve clarity, correctness, and
          citations.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {visibleMessages.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/60 bg-muted/20 px-5 py-6 text-sm text-muted-foreground">
            Ask about your outline, tone, or sources to get started.
          </div>
        )}
        {visibleMessages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={cn(
                "flex max-w-full flex-col gap-2",
                isUser ? "items-end" : "items-start"
              )}>
              <div
                className={cn(
                  "w-full max-w-[85%] rounded-3xl px-4 py-3 text-sm shadow-sm",
                  isUser
                    ? "bg-accent/20 text-foreground border border-accent/40 rounded-tr-2xl"
                    : "bg-muted/60 text-foreground border border-border/70 rounded-tl-2xl"
                )}>
                <MessageContent
                  content={msg.content}
                  citations={msg.citations}
                />
              </div>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <button
                    onClick={() => handleCopy(msg.content, msg.id)}
                    className="rounded-full p-1.5 transition hover:bg-muted"
                    title="Copy to clipboard">
                    {copiedId === msg.id ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                  {onInsert && (
                    <button
                      onClick={() => onInsert(msg.content)}
                      className="rounded-full p-1.5 transition hover:bg-muted"
                      title="Add to document">
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {isThinking && (
          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Hemmi is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-border/60 px-6 py-5">
        {askAIContext && (
          <div className="relative mb-4 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Quote className="h-3 w-3" />
              Selected Context
            </div>
            <p className="italic">&quot;{askAIContext}&quot;</p>
            <button
              onClick={onClearContext}
              className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-1 text-muted-foreground transition hover:bg-muted">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Ask Hemmi or type '@' for sources..."
            rows={1}
            className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent min-h-[52px]"
            disabled={isThinking}
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground transition hover:text-accent disabled:opacity-50">
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
                    "relative inline-flex items-center rounded-2xl px-3 py-1.5 text-sm font-medium transition",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-inner gap-2 pr-4"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40 gap-0 justify-center w-12"
                  )}
                  title={label}>
                  <Icon className="h-4 w-4" />
                  {isActive && <span>{label}</span>}
                  {id === "references" && selectedSourceCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent/20 text-[11px] font-semibold text-accent">
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
