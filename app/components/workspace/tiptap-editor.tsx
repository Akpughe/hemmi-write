"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import { FloatingToolbar } from "./floating-toolbar";
import { BottomToolbar } from "./bottom-toolbar";
import { useState } from "react";

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onChange: (content: string) => void;
  editable?: boolean;
  onAskAI?: (text: string) => void;
}

export function TiptapEditor({
  content,
  onChange,
  editable = true,
  onAskAI,
}: TiptapEditorProps) {
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");

  // Bottom Toolbar State
  const [bottomToolbarMode, setBottomToolbarMode] = useState<
    "improve" | "explain" | null
  >(null);
  const [bottomToolbarContent, setBottomToolbarContent] = useState("");
  const [bottomToolbarPosition, setBottomToolbarPosition] = useState<
    { x: number; y: number } | undefined
  >(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{
    from: number;
    to: number;
  } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing your document...",
      }),
    ],
    content,
    editable,
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection;

      if (empty) {
        setShowFloatingToolbar(false);
        return;
      }

      const text = editor.state.doc.textBetween(from, to);
      if (!text.trim()) {
        setShowFloatingToolbar(false);
        return;
      }

      setSelectedText(text);

      // Calculate position
      const { view } = editor;
      const { state } = view;
      const { selection } = state;
      const { ranges } = selection;
      const fromPos = Math.min(...ranges.map((r) => r.$from.pos));
      const toPos = Math.max(...ranges.map((r) => r.$to.pos));

      const startCoords = view.coordsAtPos(fromPos);
      const endCoords = view.coordsAtPos(toPos);

      // Center horizontally between start and end of selection
      // Position above the selection
      setToolbarPosition({
        x: (startCoords.left + endCoords.right) / 2,
        y: startCoords.top - 10, // 10px padding above
      });

      setShowFloatingToolbar(true);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6 font-serif text-foreground leading-relaxed prose-headings:font-bold prose-h1:text-3xl prose-h1:mb-4 prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-6 prose-p:mb-4 prose-p:leading-7",
      },
    },
  });

  // Update content when it changes externally (e.g., AI writing)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleImprove = () => {
    if (!editor || !selectedText) return;

    // Save selection range to replace later
    const { from, to } = editor.state.selection;
    setPendingSelection({ from, to });

    // Use the native selection to get the bounding rectangle of the highlighted text
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    const selectionRect = range?.getBoundingClientRect();

    if (selectionRect) {
      setBottomToolbarPosition({
        x: selectionRect.left + selectionRect.width / 2,
        y: selectionRect.bottom + 10,
      });
    } else {
      // Fallback to end coords if native selection fails
      const endCoords = editor.view.coordsAtPos(to);
      setBottomToolbarPosition({
        x: endCoords.left,
        y: endCoords.bottom + 10,
      });
    }

    setBottomToolbarMode("improve");
    setIsGenerating(true);
    setShowFloatingToolbar(false);

    // Auto-scroll if needed (simple implementation)
    setTimeout(() => {
      const toolbarElement = document.querySelector(
        ".animate-in.fade-in.zoom-in-95"
      );
      if (toolbarElement) {
        toolbarElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);

    // Simulate API call
    setTimeout(() => {
      setBottomToolbarContent(
        `Here is an improved version of "${selectedText.substring(
          0,
          20
        )}...":\n\n${selectedText} [Improved for clarity and flow]`
      );
      setIsGenerating(false);
    }, 1500);
  };

  const handleAskAI = () => {
    if (!selectedText) return;

    // Call the parent handler if available
    if (onAskAI) {
      onAskAI(selectedText);
    }

    setShowFloatingToolbar(false);
  };

  const handleExplain = () => {
    if (!editor || !selectedText) return;

    // Use the native selection to get the bounding rectangle of the highlighted text
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    const selectionRect = range?.getBoundingClientRect();

    if (selectionRect) {
      setBottomToolbarPosition({
        x: selectionRect.left + selectionRect.width / 2,
        y: selectionRect.bottom + 10,
      });
    } else {
      const { to } = editor.state.selection;
      const endCoords = editor.view.coordsAtPos(to);
      setBottomToolbarPosition({
        x: endCoords.left,
        y: endCoords.bottom + 10,
      });
    }

    setBottomToolbarMode("explain");
    setIsGenerating(true);
    setShowFloatingToolbar(false);

    // Auto-scroll
    setTimeout(() => {
      const toolbarElement = document.querySelector(
        ".animate-in.fade-in.zoom-in-95"
      );
      if (toolbarElement) {
        toolbarElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);

    // Simulate API call
    setTimeout(() => {
      setBottomToolbarContent(
        `Explanation for "${selectedText}":\n\nThis concept refers to... [Detailed explanation would go here]. It is often used in the context of...`
      );
      setIsGenerating(false);
    }, 1500);
  };

  const handleApproveImprovement = () => {
    if (!editor || !pendingSelection) return;

    // Replace original selection with improved content
    // Note: In a real app, we'd probably want to return just the text from the API,
    // but here our content includes the label, so we'll just use it.
    // We need to be careful about HTML vs Text. For now assuming text.

    editor
      .chain()
      .focus()
      .setTextSelection({
        from: pendingSelection.from,
        to: pendingSelection.to,
      })
      .deleteSelection()
      .insertContent(bottomToolbarContent)
      .run();

    setBottomToolbarMode(null);
    setPendingSelection(null);
  };

  const handleRejectImprovement = () => {
    setBottomToolbarMode(null);
    setPendingSelection(null);
  };

  const handleCloseToolbar = () => {
    setBottomToolbarMode(null);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center gap-1 px-4 py-2 border-b border-border bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("h-8 w-8", editor.isActive("bold") && "bg-muted")}>
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("h-8 w-8", editor.isActive("italic") && "bg-muted")}>
          <Italic className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={cn(
            "h-8 w-8",
            editor.isActive("heading", { level: 1 }) && "bg-muted"
          )}>
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={cn(
            "h-8 w-8",
            editor.isActive("heading", { level: 2 }) && "bg-muted"
          )}>
          <Heading2 className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "h-8 w-8",
            editor.isActive("bulletList") && "bg-muted"
          )}>
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "h-8 w-8",
            editor.isActive("orderedList") && "bg-muted"
          )}>
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            "h-8 w-8",
            editor.isActive("blockquote") && "bg-muted"
          )}>
          <Quote className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8">
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8">
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto relative">
          <EditorContent editor={editor} />
          <FloatingToolbar
            isVisible={showFloatingToolbar}
            position={toolbarPosition}
            onImprove={handleImprove}
            onAskAI={handleAskAI}
            onExplain={handleExplain}
          />

          <BottomToolbar
            mode={bottomToolbarMode}
            content={bottomToolbarContent}
            position={bottomToolbarPosition}
            isLoading={isGenerating}
            onApprove={handleApproveImprovement}
            onReject={handleRejectImprovement}
            onClose={handleCloseToolbar}
          />
        </div>
      </div>
    </div>
  );
}
