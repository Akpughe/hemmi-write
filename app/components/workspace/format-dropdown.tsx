"use client";

import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

interface FormatDropdownProps {
  editor: Editor;
}

export function FormatDropdown({ editor }: FormatDropdownProps) {
  // Determine what format is currently active
  const getActiveFormat = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    if (editor.isActive("heading", { level: 4 })) return "Heading 4";
    if (editor.isActive("heading", { level: 5 })) return "Heading 5";
    if (editor.isActive("heading", { level: 6 })) return "Heading 6";
    return "Normal text";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 min-w-[140px] justify-between h-8">
          <span className="text-sm">{getActiveFormat()}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={cn(
            "text-base cursor-pointer",
            !editor.isActive("heading") && "bg-muted"
          )}>
          Normal text
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={cn(
            "text-3xl font-bold cursor-pointer",
            editor.isActive("heading", { level: 1 }) && "bg-muted"
          )}>
          Heading 1
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={cn(
            "text-2xl font-bold cursor-pointer",
            editor.isActive("heading", { level: 2 }) && "bg-muted"
          )}>
          Heading 2
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={cn(
            "text-xl font-bold cursor-pointer",
            editor.isActive("heading", { level: 3 }) && "bg-muted"
          )}>
          Heading 3
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 4 }).run()
          }
          className={cn(
            "text-lg font-bold cursor-pointer",
            editor.isActive("heading", { level: 4 }) && "bg-muted"
          )}>
          Heading 4
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 5 }).run()
          }
          className={cn(
            "text-base font-bold cursor-pointer",
            editor.isActive("heading", { level: 5 }) && "bg-muted"
          )}>
          Heading 5
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 6 }).run()
          }
          className={cn(
            "text-sm font-semibold cursor-pointer",
            editor.isActive("heading", { level: 6 }) && "bg-muted"
          )}>
          Heading 6
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
