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
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { WritingBrief, WorkflowStep } from "@/lib/types/ui";
import { cn } from "@/lib/utils";

interface RightPanelProps {
  brief: WritingBrief;
  currentStep: WorkflowStep;
  askAIContext?: string | null;
  onClearContext?: () => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const documentTypeLabels = {
  "research-paper": "Research Paper",
  essay: "Essay",
  report: "Report",
};

const academicLevelLabels = {
  "high-school": "High School",
  undergraduate: "Undergraduate",
  graduate: "Graduate",
  doctoral: "Doctoral",
  professional: "Professional",
};

export function RightPanel({
  brief,
  currentStep,
  askAIContext,
  onClearContext,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

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
      // Simulate AI response for now - will connect to API later
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm analyzing your sources to answer that. Based on the documents provided, it seems that...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <aside className="w-80 border-l border-border flex flex-col bg-card h-full">
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
                {msg.content}
              </div>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2">
                  <button
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy to clipboard">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Add to document">
                    <Plus className="w-3 h-3" />
                  </button>
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
                "{askAIContext}"
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
    </aside>
  );
}
