"use client";

import Link from "next/link";
import { Archive, ArrowUpRight, Clock, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Project, useArchiveProject } from "@/lib/hooks/use-projects";

interface ProjectCardProps {
  project: Project;
}

// Format relative time (e.g., "2 days ago")
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// Map document types to display labels
const documentTypeLabels: Record<string, string> = {
  "research-paper": "Research Paper",
  essay: "Essay",
  report: "Report",
  article: "Article",
};

const workflowStepLabels: Record<string, { label: string; className: string }> =
  {
    research: { label: "Research", className: "bg-sky-500/15 text-sky-500" },
    planning: {
      label: "Planning",
      className: "bg-violet-500/15 text-violet-500",
    },
    writing: { label: "Writing", className: "bg-amber-500/15 text-amber-500" },
    complete: {
      label: "Complete",
      className: "bg-emerald-500/15 text-emerald-500",
    },
  };

export function ProjectCard({ project }: Readonly<ProjectCardProps>) {
  const statusLabel = project.is_complete ? "Complete" : "In Progress";
  const statusColor = project.is_complete
    ? "bg-green-500/20 text-green-400"
    : "bg-amber-500/20 text-amber-400";

  const workflow =
    workflowStepLabels[project.workflow_step] ??
    ({
      label: project.workflow_step,
      className: "bg-muted text-muted-foreground",
    } as const);

  const archiveMutation = useArchiveProject();

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await archiveMutation.mutateAsync({
        projectId: project.id,
        archived: !project.is_archived,
      });
    } catch (error) {
      console.error("Failed to archive project:", error);
    }
  };

  return (
    <Link
      href={`/workspace?projectId=${project.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      {/* Subtle glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="absolute -inset-24 bg-linear-to-br from-accent/15 via-transparent to-transparent blur-2xl" />
      </div>

      {/* Thumbnail area */}
      <div className="relative aspect-4/3 bg-linear-to-br from-muted/70 via-muted/40 to-muted/70 flex items-center justify-center">
        <FileText className="w-12 h-12 text-muted-foreground/30 transition-transform duration-200 group-hover:scale-[1.03]" />

        {/* Hover affordance */}
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            onClick={handleArchive}
            disabled={archiveMutation.isPending}
            title={
              project.is_archived ? "Restore from Archive" : "Archive Project"
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border/60 backdrop-blur transition-all duration-200 group-hover:opacity-100 hover:text-foreground hover:bg-background disabled:opacity-50">
            <Archive className="h-4 w-4" />
          </button>
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border/60 backdrop-blur transition-all duration-200 group-hover:opacity-100 group-hover:text-foreground">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        {/* Status badge */}
        <div
          className={cn(
            "absolute bottom-3 left-3 px-2 py-0.5 rounded-md text-xs font-medium",
            statusColor
          )}>
          {statusLabel}
        </div>

        {/* Document type */}
        <div className="absolute bottom-3 right-3 rounded-md bg-background/70 px-2 py-0.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/60 backdrop-blur">
          {documentTypeLabels[project.document_type] || project.document_type}
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold text-foreground line-clamp-1 transition-colors group-hover:text-accent">
            {project.title || project.topic}
          </h3>
          {project.title && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {project.topic}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium",
              workflow.className
            )}>
            <Sparkles className="h-3.5 w-3.5" />
            {workflow.label}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(project.updated_at)}</span>
          </div>

          <span className="text-xs font-medium text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Open
          </span>
        </div>
      </div>
    </Link>
  );
}
