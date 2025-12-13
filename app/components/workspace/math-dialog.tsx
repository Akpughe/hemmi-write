"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import katex from "katex";

interface MathDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string, isBlock: boolean) => void;
}

export function MathDialog({ isOpen, onClose, onInsert }: MathDialogProps) {
  const [latex, setLatex] = useState("");
  const [isBlock, setIsBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Update preview when latex changes
  useEffect(() => {
    if (previewRef.current && latex) {
      try {
        katex.render(latex, previewRef.current, {
          throwOnError: true,
          displayMode: isBlock,
        });
        setError(null);
      } catch (err: any) {
        setError(err.message);
        if (previewRef.current) {
          previewRef.current.textContent = latex;
        }
      }
    } else if (previewRef.current) {
      previewRef.current.textContent = "";
    }
  }, [latex, isBlock]);

  const handleInsert = () => {
    if (latex.trim()) {
      onInsert(latex.trim(), isBlock);
      setLatex("");
      setError(null);
      onClose();
    }
  };

  const handleClose = () => {
    setLatex("");
    setError(null);
    onClose();
  };

  const insertExample = (example: string) => {
    setLatex(example);
  };

  const examples = {
    inline: [
      { label: "Fraction", latex: "\\frac{a}{b}" },
      { label: "Superscript", latex: "x^2" },
      { label: "Subscript", latex: "x_i" },
      { label: "Square root", latex: "\\sqrt{x}" },
      { label: "Greek", latex: "\\alpha, \\beta, \\gamma" },
    ],
    block: [
      { label: "Sum", latex: "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}" },
      { label: "Integral", latex: "\\int_{a}^{b} f(x) dx" },
      { label: "Matrix", latex: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}" },
      { label: "Limit", latex: "\\lim_{x \\to \\infty} f(x)" },
      {
        label: "Piecewise",
        latex:
          "f(x) = \\begin{cases} x^2 & x \\geq 0 \\\\ -x^2 & x < 0 \\end{cases}",
      },
    ],
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Insert Math Equation</DialogTitle>
          <DialogDescription>
            Enter LaTeX code for your mathematical equation. Use inline math for
            equations within text, or block math for centered equations.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={isBlock ? "block" : "inline"}
          onValueChange={(value) => setIsBlock(value === "block")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inline">Inline Math ($...$)</TabsTrigger>
            <TabsTrigger value="block">Block Math ($$...$$)</TabsTrigger>
          </TabsList>

          <TabsContent value="inline" className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                LaTeX Code
              </label>
              <textarea
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                className="w-full min-h-[100px] p-3 border rounded-md font-mono text-sm resize-y"
                placeholder="Enter LaTeX code (e.g., x^2 + y^2 = r^2)"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                Examples:
              </span>
              {examples.inline.map((example) => (
                <Button
                  key={example.label}
                  variant="outline"
                  size="sm"
                  onClick={() => insertExample(example.latex)}>
                  {example.label}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="block" className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                LaTeX Code
              </label>
              <textarea
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                className="w-full min-h-[150px] p-3 border rounded-md font-mono text-sm resize-y"
                placeholder="Enter LaTeX code (e.g., \sum_{i=1}^{n} x_i)"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                Examples:
              </span>
              {examples.block.map((example) => (
                <Button
                  key={example.label}
                  variant="outline"
                  size="sm"
                  onClick={() => insertExample(example.latex)}>
                  {example.label}
                </Button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t pt-4">
          <label className="text-sm font-medium mb-2 block">Preview</label>
          <div className="min-h-[80px] p-4 border rounded-md bg-muted/30 flex items-center justify-center">
            {latex ? (
              <div
                ref={previewRef}
                className={error ? "text-red-500 font-mono text-sm" : ""}
              />
            ) : (
              <span className="text-sm text-muted-foreground">
                Preview will appear here
              </span>
            )}
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-2">
              Error: {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!latex.trim() || !!error}>
            Insert Equation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
