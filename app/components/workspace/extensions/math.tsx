import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import katex from "katex";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

// React component for inline math
function InlineMathComponent({
  node,
  updateAttributes,
  deleteNode,
}: {
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [latex, setLatex] = useState(node.attrs.latex);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current && !isEditing) {
      try {
        katex.render(node.attrs.latex, containerRef.current, {
          throwOnError: true,
          displayMode: false,
        });
        setError(null);
      } catch (err: any) {
        setError(err.message);
        if (containerRef.current) {
          containerRef.current.textContent = node.attrs.latex;
        }
      }
    }
  }, [node.attrs.latex, isEditing]);

  const handleSave = () => {
    updateAttributes({ latex });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLatex(node.attrs.latex);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <NodeViewWrapper as="span" className="inline-flex items-center gap-2">
        <span className="text-xs text-muted-foreground">$</span>
        <input
          type="text"
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          className="px-2 py-1 border rounded text-sm font-mono min-w-[200px]"
          placeholder="Enter LaTeX"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              handleCancel();
            }
          }}
        />
        <span className="text-xs text-muted-foreground">$</span>
        <Button size="sm" variant="ghost" onClick={handleSave} className="h-6">
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          className="h-6">
          Cancel
        </Button>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex items-center gap-1 group relative cursor-pointer hover:bg-muted px-1 rounded"
      onClick={() => setIsEditing(true)}>
      <span
        ref={containerRef}
        className={error ? "text-red-500 font-mono text-sm" : ""}
      />
      <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex gap-1 ml-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
          title="Edit equation">
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNode();
          }}
          className="text-xs text-muted-foreground hover:text-red-500"
          title="Delete equation">
          <Trash2 className="w-3 h-3" />
        </button>
      </span>
    </NodeViewWrapper>
  );
}

// React component for block math
function BlockMathComponent({
  node,
  updateAttributes,
  deleteNode,
}: {
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [latex, setLatex] = useState(node.attrs.latex);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current && !isEditing) {
      try {
        katex.render(node.attrs.latex, containerRef.current, {
          throwOnError: true,
          displayMode: true,
        });
        setError(null);
      } catch (err: any) {
        setError(err.message);
        if (containerRef.current) {
          containerRef.current.textContent = node.attrs.latex;
        }
      }
    }
  }, [node.attrs.latex, isEditing]);

  const handleSave = () => {
    updateAttributes({ latex });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLatex(node.attrs.latex);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <NodeViewWrapper className="my-4 p-4 border rounded bg-muted/30">
        <div className="flex items-start gap-2">
          <span className="text-xs text-muted-foreground">$$</span>
          <textarea
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            className="flex-1 px-2 py-1 border rounded text-sm font-mono min-h-[100px] resize-y"
            placeholder="Enter LaTeX (e.g., \sum_{i=1}^n i = \frac{n(n+1)}{2})"
            autoFocus
          />
          <span className="text-xs text-muted-foreground">$$</span>
        </div>
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="my-4 p-4 border rounded bg-muted/30 group relative cursor-pointer hover:border-accent">
      <div
        ref={containerRef}
        className={`text-center ${error ? "text-red-500 font-mono text-sm" : ""}`}
        onClick={() => setIsEditing(true)}
      />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="h-7"
          title="Edit equation">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={deleteNode}
          className="h-7 hover:text-red-500"
          title="Delete equation">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </NodeViewWrapper>
  );
}

// Inline math extension
export const InlineMath = Node.create({
  name: "inlineMath",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex"),
        renderHTML: (attributes) => {
          return {
            "data-latex": attributes.latex,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-math"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "inline-math" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineMathComponent);
  },
});

// Block math extension
export const BlockMath = Node.create({
  name: "blockMath",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex"),
        renderHTML: (attributes) => {
          return {
            "data-latex": attributes.latex,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="block-math"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "block-math" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockMathComponent);
  },
});
