"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import Markdown from "marked-react";
import { toast } from "sonner";

import type { WritingBrief, WorkflowStep } from "@/lib/types/ui";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface RightPanelProps {
  brief: WritingBrief;
  currentStep: WorkflowStep;
  askAIContext?: string | null;
  onClearContext?: () => void;
  sources?: any[]; // Using any[] for now to match Source type
  currentContent?: string;
  onInsert?: (text: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
  projectId: string | null;
  initialMessages?: any[];
}

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
}: RightPanelProps) {
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

  // Sync initial messages (e.g. from existing project)
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      const mappedMessages: Message[] = initialMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.created_at),
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
            : [...messages, userMessage], // Optimizing payload if projectId is used (server loads history) but keeping legacy behavior for now
          // Actually, if projectId is sent, server loads history. But we also need to send the NEW message.
          // The API likely expects the full array for context if stateless, or we just send the new one.
          // Let's check chat/route.ts.
          // It seems it saves the new message, then calls AI.
          // If we send projectId, the server can load history.
          // But looking at previous code, I mostly kept the array logic.
          // Let's send the array for now to match current implementation, the API handles projectId persistence.
          projectId,
          brief,
          sources,
          currentContent: currentContent,
          message: userMessage.content, // Pass single message content for storage if supported, otherwise reliance on 'messages' array
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
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

          {/* Chat Area */}
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
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <Markdown>{msg.content}</Markdown>
                    </div>
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
        </>
      ) : (
        /* Collapsed state - minimal icons */
        <div className="flex flex-col items-center py-4 gap-4">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
    </aside>
  );
}
