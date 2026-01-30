"use client";

import { FileText, ClipboardList, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const documentTypes = [
  {
    id: "research-paper",
    label: "Research Paper",
    icon: GraduationCap,
    description: "Academic research with citations",
  },
  {
    id: "essay",
    label: "Essay",
    icon: FileText,
    description: "Persuasive or analytical writing",
  },
  {
    id: "report",
    label: "Report",
    icon: ClipboardList,
    description: "Formal structured document",
  },
] as const;

type DocumentType = (typeof documentTypes)[number]["id"];

interface DocumentTypeSelectorProps {
  selected: string;
  onSelect: (type: DocumentType) => void;
}

export function DocumentTypeSelector({
  selected,
  onSelect,
}: DocumentTypeSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {documentTypes.map((type) => {
        const Icon = type.icon;
        const isSelected = selected === type.id;

        return (
          <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className={cn(
              "relative inline-flex items-center justify-center rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-[0.18em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background gap-2",
              isSelected
                ? "bg-accent/15 text-foreground shadow-sm shadow-accent/15 ring-1 ring-accent/25"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}>
            <Icon className="w-3.5 h-3.5" />
            <span>{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}
