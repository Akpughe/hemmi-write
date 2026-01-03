"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  FileText,
  GraduationCap,
  BookOpen,
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
  initialMessages?: any[];
  onRefreshSources?: () => void;
}

type RightPanelTab = "chat" | "references";

const documentTypeLabels = {
  "research-paper": "Research Paper",
  essay: "Essay",
  report: "Report",
  article: "Article",
};

const academicLevelLabels = {
  "high-school": "HS",
  undergraduate: "Undergrad",
  graduate: "Grad",
  doctoral: "PhD",
  professional: "Pro",
};

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
  // Convert UI sources to ResearchSource format
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
        // Academic metadata
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

  // Sort sources alphabetically by author
  const sortedSources = useMemo(() => {
    return [...researchSources].sort((a, b) => {
      const authorA = a.author || "Anonymous";
      const authorB = b.author || "Anonymous";
      return authorA.localeCompare(authorB);
    });
  }, [researchSources]);

  // Count sources with/without author metadata
  const stats = useMemo(() => {
    const withAuthor = researchSources.filter(
      (s) => s.author || (s.authorsStructured && s.authorsStructured.length > 0)
    ).length;
    const withoutAuthor = researchSources.filter(
      (s) =>
        !s.author && (!s.authorsStructured || s.authorsStructured.length === 0)
    );
    const withJournal = researchSources.filter((s) => s.journalName).length;
    return {
      withAuthor,
      withoutAuthor,
      withoutAuthorIds: withoutAuthor.map((s) => s.id),
      withJournal,
      total: researchSources.length,
    };
  }, [researchSources]);

  // Handle metadata refetch
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
        // Trigger refresh of sources
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
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="text-muted-foreground">
          <Library className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm font-medium">No Sources Selected</p>
          <p className="text-xs mt-1">
            Select sources in the Research panel to see references here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{stats.total}</span>{" "}
            sources
            {stats.withAuthor < stats.total && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                • {stats.total - stats.withAuthor} missing author
              </span>
            )}
          </div>
          <span className="px-2 py-0.5 text-xs bg-accent/10 text-accent rounded">
            {citationStyle}
          </span>
        </div>

        {/* Refetch button */}
        {stats.withoutAuthorIds.length > 0 && (
          <button
            onClick={handleRefetchMetadata}
            disabled={isRefetching}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50">
            <RefreshCw
              className={cn("w-3 h-3", isRefetching && "animate-spin")}
            />
            {isRefetching
              ? "Fetching metadata..."
              : `Re-fetch metadata for ${stats.withoutAuthorIds.length} source${
                  stats.withoutAuthorIds.length > 1 ? "s" : ""
                }`}
          </button>
        )}

        {/* Refetch results */}
        {refetchResults && (
          <div className="mt-2 p-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs">
            <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
              <Check className="w-3 h-3" />
              <span className="font-medium">
                {refetchResults.success} updated, {refetchResults.failed} failed
              </span>
            </div>
          </div>
        )}
      </div>

      {/* References List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedSources.map((source, index) => {
          const hasAuthor =
            source.author ||
            (source.authorsStructured && source.authorsStructured.length > 0);
          const formattedRef = formatReference(source, citationStyle);

          return (
            <div
              key={source.id}
              className={cn(
                "p-3 rounded-lg border text-sm",
                hasAuthor
                  ? "bg-card border-border"
                  : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
              )}>
              {/* Reference number and warning */}
              <div className="flex items-start gap-2 mb-2">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </span>
                {!hasAuthor && (
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span>Missing author metadata</span>
                  </div>
                )}
              </div>

              {/* Formatted Reference */}
              <div
                className="text-sm leading-relaxed pl-8"
                dangerouslySetInnerHTML={{ __html: formattedRef }}
              />

              {/* Metadata indicators */}
              <div className="flex flex-wrap gap-2 mt-3 pl-8">
                {source.author && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    {source.author.substring(0, 20)}
                    {source.author.length > 20 ? "..." : ""}
                  </span>
                )}
                {source.year && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {source.year}
                  </span>
                )}
                {source.journalName && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-xs text-blue-700 dark:text-blue-300">
                    <BookOpen className="w-3 h-3" />
                    Journal
                  </span>
                )}
                {source.doi && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-xs text-green-700 dark:text-green-300">
                    <LinkIcon className="w-3 h-3" />
                    DOI
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with copy action */}
      <div className="shrink-0 p-3 border-t border-border bg-card">
        <button
          onClick={() => {
            const htmlContent = generateReferenceList(
              researchSources,
              citationStyle
            );
            // Strip HTML for plain text copy
            const plainText = htmlContent
              .replaceAll(/<h1>.*?<\/h1>/g, "References\n\n")
              .replaceAll(/<ul>/g, "")
              .replaceAll(/<\/ul>/g, "")
              .replaceAll(/<li>/g, "")
              .replaceAll(/<\/li>/g, "\n\n")
              .replaceAll(/<em>/g, "")
              .replaceAll(/<\/em>/g, "")
              .replaceAll(/<strong>/g, "")
              .replaceAll(/<\/strong>/g, "")
              .trim();
            navigator.clipboard.writeText(plainText);
            toast.success("References copied to clipboard");
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors">
          <Copy className="w-4 h-4" />
          Copy All References
        </button>
      </div>
    </div>
  );
}

export function RightPanel({
  brief,
  currentStep,
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

  // Get citation style from brief
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

  // Sync initial messages (e.g. from existing project)
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      const mappedMessages: Message[] = initialMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.created_at),
        citations: msg.citations,
      }));
      // Append to welcome message or replace if duplicate logic needed
      // Ideally we replace the welcome message if we have history
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
  }, [messages, isThinking, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: askAIContext
        ? `[Context: "${askAIContext}"]\n\n${input}`
        : input,
      timestamp: new Date(),
    };

    if (askAIContext && onClearContext) {
      onClearContext();
    }

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
        citations: data.citations, // Store citations from API response
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

  return (
    <aside
      className={cn(
        "border-l border-border flex flex-col bg-card h-full transition-all duration-300 ease-in-out",
        isOpen ? "w-[400px]" : "w-12"
      )}>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-card border border-border shadow-sm hover:bg-muted transition-colors"
        title={isOpen ? "Collapse panel" : "Expand panel"}>
        {isOpen ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {isOpen ? (
        <>
          {/* Brief summary */}
          <div className="shrink-0 p-4 border-b border-border bg-card z-10">
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <FileText className="w-4 h-4 text-accent" />
              <span>Your Brief</span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs">
                  <GraduationCap className="w-3 h-3" />
                  {academicLevelLabels[brief.academicLevel]}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs">
                  <BookOpen className="w-3 h-3" />
                  {documentTypeLabels[brief.documentType]}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs capitalize">
                  {brief.writingStyle}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="shrink-0 flex border-b border-border">
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "chat"
                  ? "text-accent border-b-2 border-accent bg-accent/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab("references")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative",
                activeTab === "references"
                  ? "text-accent border-b-2 border-accent bg-accent/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
              <Library className="w-4 h-4" />
              References
              {sources.filter((s) => s.selected).length > 0 && (
                <span className="absolute top-1.5 right-3 w-5 h-5 flex items-center justify-center rounded-full bg-accent/20 text-accent text-[10px] font-bold">
                  {sources.filter((s) => s.selected).length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "references" ? (
            <ReferencesPreview
              sources={sources}
              citationStyle={citationStyle}
              onRefreshSources={onRefreshSources}
            />
          ) : (
            /* Chat Area */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col gap-1 max-w-[90%]",
                      msg.role === "user"
                        ? "ml-auto items-end"
                        : "mr-auto items-start"
                    )}>
                    <div
                      className={cn(
                        "p-3 rounded-lg text-sm",
                        msg.role === "user"
                          ? "bg-accent text-accent-foreground rounded-br-none"
                          : "bg-muted text-foreground rounded-bl-none"
                      )}>
                      <MessageContent
                        content={msg.content}
                        citations={msg.citations}
                      />
                    </div>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy to clipboard">
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        {onInsert && (
                          <button
                            onClick={() => onInsert(msg.content)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Add to document">
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {isThinking && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Hemmi is thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="shrink-0 p-4 border-t border-border bg-card">
                {askAIContext && (
                  <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-border relative group">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                      <Quote className="w-3 h-3" />
                      <span>Selected Context</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-3 italic">
                      &quot;{askAIContext}&quot;
                    </p>
                    <button
                      onClick={onClearContext}
                      className="absolute -top-2 -right-2 p-1 bg-background border border-border rounded-full shadow-sm hover:bg-muted transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Hemmi or type '@' for sources..."
                    className="w-full pl-4 pr-10 py-3 rounded-lg bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    disabled={isThinking}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isThinking}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-accent disabled:opacity-50 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Collapsed state - minimal icons */
        <div className="flex flex-col items-center py-4 gap-4">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          <Library className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
    </aside>
  );
}
