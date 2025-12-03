"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import { FloatingToolbar } from "./floating-toolbar";
import { BottomToolbar } from "./bottom-toolbar";
import { FormatDropdown } from "./format-dropdown";
import { useState } from "react";

interface TiptapEditorProps {
  content: string;
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
          levels: [1, 2, 3, 4, 5, 6], // Enable ALL heading levels
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing your document...",
      }),
      TextStyle, // Required base for font styling
      TextAlign.configure({
        types: ["heading", "paragraph", "listItem", "blockquote"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
      Underline,
      Color.configure({
        types: ["textStyle"],
      }),
      FontFamily.configure({
        types: ["textStyle"],
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
        class: "tiptap-editor",
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
        {/* Format dropdown - replaces H1/H2 buttons */}
        <FormatDropdown editor={editor} />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Text formatting group */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("h-8 w-8", editor.isActive("bold") && "bg-muted")}
          title="Bold (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("h-8 w-8", editor.isActive("italic") && "bg-muted")}
          title="Italic (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn("h-8 w-8", editor.isActive("underline") && "bg-muted")}
          title="Underline (Ctrl+U)">
          <UnderlineIcon className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Text alignment group */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={cn(
            "h-8 w-8",
            editor.isActive({ textAlign: "left" }) && "bg-muted"
          )}
          title="Align left">
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={cn(
            "h-8 w-8",
            editor.isActive({ textAlign: "center" }) && "bg-muted"
          )}
          title="Align center">
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={cn(
            "h-8 w-8",
            editor.isActive({ textAlign: "right" }) && "bg-muted"
          )}
          title="Align right">
          <AlignRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={cn(
            "h-8 w-8",
            editor.isActive({ textAlign: "justify" }) && "bg-muted"
          )}
          title="Justify">
          <AlignJustify className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Lists and blockquote group */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn("h-8 w-8", editor.isActive("bulletList") && "bg-muted")}
          title="Bullet list">
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "h-8 w-8",
            editor.isActive("orderedList") && "bg-muted"
          )}
          title="Numbered list">
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn("h-8 w-8", editor.isActive("blockquote") && "bg-muted")}
          title="Quote">
          <Quote className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        {/* Undo/Redo group */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8"
          title="Undo (Ctrl+Z)">
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8"
          title="Redo (Ctrl+Shift+Z)">
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
