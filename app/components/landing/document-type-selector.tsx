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
              "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200",
              "text-sm font-medium",
              isSelected
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
            )}>
            <Icon className="w-4 h-4" />
            <span>{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}
