"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

interface EditWarningModalProps {
  isOpen: boolean;
  sectionsToRegenerate: string[]; // Section titles
  onConfirm: () => void;
  onCancel: () => void;
  hasManualEdits: boolean;
}

export function EditWarningModal({
  isOpen,
  sectionsToRegenerate,
  onConfirm,
  onCancel,
  hasManualEdits,
}: EditWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <DialogTitle className="text-lg">
              {hasManualEdits
                ? "Overwrite Manual Edits?"
                : "Regenerate Sections?"}
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="space-y-3">
          {hasManualEdits ? (
            <>
              <p className="text-sm">
                You have manually edited this document. Regenerating will replace
                your edits in the following sections:
              </p>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                {sectionsToRegenerate.map((title) => (
                  <li key={title} className="text-foreground font-medium">
                    {title}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground mt-3 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <strong>Note:</strong> A version snapshot will be created before
                regenerating, allowing you to review or restore your previous
                content if needed.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm">
                Regenerate the following sections with the new source content?
              </p>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                {sectionsToRegenerate.map((title) => (
                  <li key={title} className="text-foreground font-medium">
                    {title}
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogDescription>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant={hasManualEdits ? "destructive" : "default"}
            className={
              hasManualEdits
                ? ""
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }>
            {hasManualEdits ? "Overwrite & Regenerate" : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
