"use client"

import { FileText, GraduationCap, BookOpen, MessageSquare } from "lucide-react"
import type { WritingBrief, WorkflowStep } from "@/lib/types"

interface RightPanelProps {
  brief: WritingBrief
  currentStep: WorkflowStep
}

const documentTypeLabels = {
  "research-paper": "Research Paper",
  essay: "Essay",
  report: "Report",
  thesis: "Thesis/Chapter",
}

const academicLevelLabels = {
  "high-school": "High School",
  undergraduate: "Undergraduate",
  graduate: "Graduate",
  doctoral: "Doctoral",
  professional: "Professional",
}

export function RightPanel({ brief, currentStep }: RightPanelProps) {
  return (
    <aside className="w-80 border-l border-border flex flex-col bg-card">
      {/* Brief summary */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <FileText className="w-4 h-4 text-accent" />
          <span>Your Brief</span>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-sm">{brief.topic}</h3>
            {brief.instructions && <p className="text-xs text-muted-foreground mt-1">{brief.instructions}</p>}
          </div>

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
            {brief.wordCount && (
              <span className="px-2 py-1 rounded-md bg-muted text-xs">{brief.wordCount.toLocaleString()} words</span>
            )}
            {brief.sourceCount && (
              <span className="px-2 py-1 rounded-md bg-muted text-xs">{brief.sourceCount} sources</span>
            )}
          </div>
        </div>
      </div>

      {/* Chat/feedback area */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span>Assistant</span>
        </div>

        <div className="flex-1 space-y-3">
          {currentStep === "research" && (
            <div className="p-3 rounded-lg bg-muted/30 text-sm">
              <p className="text-muted-foreground">
                I&apos;m finding relevant sources for your topic. Review each source and toggle the ones you want to
                include in your research.
              </p>
            </div>
          )}

          {currentStep === "planning" && (
            <div className="p-3 rounded-lg bg-muted/30 text-sm">
              <p className="text-muted-foreground">
                I&apos;ve created a blueprint based on your selected sources. Review the structure and approve when
                ready to begin writing.
              </p>
            </div>
          )}

          {currentStep === "writing" && (
            <div className="p-3 rounded-lg bg-muted/30 text-sm">
              <p className="text-muted-foreground">
                Writing in progress. The document is being generated section by section based on your approved
                blueprint.
              </p>
            </div>
          )}
        </div>

        {/* Future: feedback input */}
        <div className="mt-auto pt-3 border-t border-border">
          <input
            type="text"
            placeholder="Provide feedback..."
            className="w-full px-3 py-2 rounded-lg bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            disabled={currentStep === "writing"}
          />
        </div>
      </div>
    </aside>
  )
}
