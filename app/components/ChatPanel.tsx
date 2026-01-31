"use client";
import { useState, useRef, useEffect } from "react";
import { Send, User, Sparkles, FileEdit, Copy, Check, RotateCcw } from "lucide-react";
import { Streamdown } from "streamdown";
import WriteModal from "./WriteModal/WriteModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Premium thinking indicator
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-400 to-purple-400"
            style={{
              animation: "pulse-dot 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
      <span className="text-sm text-white/50 font-medium">Thinking...</span>
      <style jsx>{`
        @keyframes pulse-dot {
          0%, 80%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          40% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

// Premium tooltip wrapper
function PremiumTooltip({
  children,
  content,
  icon: Icon,
  shortcut,
}: {
  children: React.ReactNode;
  content: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          sideOffset={8}
          className={cn(
            "z-50 overflow-hidden",
            "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
            "border border-slate-700/50",
            "shadow-xl shadow-black/30",
            "rounded-xl",
            "px-3.5 py-2.5",
            "backdrop-blur-xl",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}
        >
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="flex items-center justify-center w-5 h-5 rounded-md bg-violet-500/20">
                <Icon className="w-3 h-3 text-violet-400" />
              </div>
            )}
            <span className="text-xs font-medium text-white">{content}</span>
            {shortcut && (
              <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/10 rounded text-white/60">
                {shortcut}
              </kbd>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-violet-500/5 to-transparent pointer-events-none" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Message action buttons
function MessageActions({ content, onRegenerate }: { content: string; onRegenerate?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <PremiumTooltip content="Copy message" icon={Copy} shortcut="⌘C">
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-all duration-200"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </PremiumTooltip>
      {onRegenerate && (
        <PremiumTooltip content="Regenerate response" icon={RotateCcw}>
          <button
            onClick={onRegenerate}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </PremiumTooltip>
      )}
    </div>
  );
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI writing assistant. I can help you brainstorm ideas, improve your writing, or answer questions. What would you like to work on today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from API");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling chat API:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I encountered an error processing your request. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e] font-[family-name:var(--font-inter)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#1a1a2e]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Hemmi AI</h2>
            <p className="text-xs text-white/40">Your writing assistant</p>
          </div>
        </div>
        <PremiumTooltip content="Create a new document" icon={FileEdit}>
          <button
            onClick={() => setIsWriteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl transition-all duration-200 text-sm font-medium shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 active:scale-[0.98]"
          >
            <FileEdit className="w-4 h-4" />
            Write Document
          </button>
        </PremiumTooltip>
      </div>

      {/* Write Modal */}
      <WriteModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="max-w-3xl mx-auto py-6">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "group px-6 py-5 transition-colors duration-200",
                message.role === "assistant"
                  ? "bg-white/[0.02] hover:bg-white/[0.04]"
                  : "bg-transparent"
              )}
            >
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {message.role === "user" ? (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-md">
                      <User className="w-4 h-4 text-white/80" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-white/90">
                      {message.role === "user" ? "You" : "Hemmi"}
                    </span>
                    {message.role === "assistant" && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-500/20 text-violet-300 rounded-md">
                        AI
                      </span>
                    )}
                  </div>

                  {message.role === "assistant" ? (
                    <div className="chat-markdown">
                      <Streamdown>{message.content}</Streamdown>
                    </div>
                  ) : (
                    <div className="text-[15px] leading-relaxed text-white/80 whitespace-pre-wrap">
                      {message.content}
                    </div>
                  )}

                  {/* Actions */}
                  {message.role === "assistant" && index > 0 && (
                    <div className="mt-3">
                      <MessageActions content={message.content} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading State */}
          {isLoading && (
            <div className="px-6 py-5 bg-white/[0.02]">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-white/90">Hemmi</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-500/20 text-violet-300 rounded-md">
                      AI
                    </span>
                  </div>
                  <ThinkingIndicator />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] px-4 py-4 bg-[#1a1a2e]/80 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-end bg-[#2a2a40] rounded-2xl shadow-lg ring-1 ring-white/[0.06] focus-within:ring-violet-500/30 transition-all duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight(e.target);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message Hemmi..."
              className="flex-1 bg-transparent text-white placeholder-white/30 px-5 py-4 pr-14 focus:outline-none text-[15px] leading-relaxed resize-none min-h-[56px] max-h-[200px]"
              disabled={isLoading}
              rows={1}
            />
            <PremiumTooltip content="Send message" icon={Send} shortcut="↵">
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-3 bottom-3 p-2.5 rounded-xl transition-all duration-200",
                  input.trim() && !isLoading
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 active:scale-95"
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </PremiumTooltip>
          </div>
          <p className="mt-2 text-center text-xs text-white/30">
            Press <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-white/40 font-mono text-[10px]">Shift + Enter</kbd> for new line
          </p>
        </form>
      </div>

      {/* Custom Markdown Styles */}
      <style jsx global>{`
        .chat-markdown {
          color: rgba(255, 255, 255, 0.85);
          font-size: 15px;
          line-height: 1.75;
        }

        .chat-markdown p {
          margin: 0.75em 0;
        }

        .chat-markdown p:first-child {
          margin-top: 0;
        }

        .chat-markdown p:last-child {
          margin-bottom: 0;
        }

        .chat-markdown h1,
        .chat-markdown h2,
        .chat-markdown h3,
        .chat-markdown h4,
        .chat-markdown h5,
        .chat-markdown h6 {
          color: white;
          font-weight: 600;
          margin: 1.5em 0 0.75em;
          line-height: 1.3;
        }

        .chat-markdown h1:first-child,
        .chat-markdown h2:first-child,
        .chat-markdown h3:first-child {
          margin-top: 0;
        }

        .chat-markdown h1 { font-size: 1.5em; }
        .chat-markdown h2 { font-size: 1.25em; }
        .chat-markdown h3 { font-size: 1.125em; }

        .chat-markdown strong {
          color: white;
          font-weight: 600;
        }

        .chat-markdown em {
          font-style: italic;
          color: rgba(255, 255, 255, 0.9);
        }

        .chat-markdown a {
          color: #a78bfa;
          text-decoration: none;
          border-bottom: 1px solid rgba(167, 139, 250, 0.3);
          transition: all 0.2s;
        }

        .chat-markdown a:hover {
          color: #c4b5fd;
          border-bottom-color: rgba(196, 181, 253, 0.5);
        }

        .chat-markdown ul,
        .chat-markdown ol {
          margin: 0.75em 0;
          padding-left: 1.5em;
        }

        .chat-markdown li {
          margin: 0.375em 0;
          padding-left: 0.25em;
        }

        .chat-markdown li::marker {
          color: rgba(167, 139, 250, 0.6);
        }

        .chat-markdown ul li {
          list-style-type: disc;
        }

        .chat-markdown ul ul li {
          list-style-type: circle;
        }

        .chat-markdown ol li {
          list-style-type: decimal;
        }

        .chat-markdown code {
          font-family: 'SF Mono', 'Fira Code', 'Monaco', monospace;
          font-size: 0.875em;
          background: rgba(139, 92, 246, 0.15);
          color: #c4b5fd;
          padding: 0.2em 0.4em;
          border-radius: 0.375rem;
          border: 1px solid rgba(139, 92, 246, 0.2);
        }

        .chat-markdown pre {
          background: #1e1e2e;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 0.75rem;
          padding: 1rem;
          margin: 1em 0;
          overflow-x: auto;
        }

        .chat-markdown pre code {
          background: none;
          border: none;
          padding: 0;
          color: #e2e8f0;
          font-size: 0.875em;
          line-height: 1.6;
        }

        .chat-markdown blockquote {
          border-left: 3px solid rgba(139, 92, 246, 0.5);
          margin: 1em 0;
          padding: 0.5em 0 0.5em 1em;
          color: rgba(255, 255, 255, 0.7);
          background: rgba(139, 92, 246, 0.05);
          border-radius: 0 0.5rem 0.5rem 0;
        }

        .chat-markdown hr {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin: 1.5em 0;
        }

        .chat-markdown table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
          font-size: 0.9em;
        }

        .chat-markdown th,
        .chat-markdown td {
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.75em 1em;
          text-align: left;
        }

        .chat-markdown th {
          background: rgba(139, 92, 246, 0.1);
          color: white;
          font-weight: 600;
        }

        .chat-markdown tr:nth-child(even) {
          background: rgba(255, 255, 255, 0.02);
        }

        .chat-markdown img {
          max-width: 100%;
          border-radius: 0.5rem;
          margin: 1em 0;
        }

        /* Scrollbar styling */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
