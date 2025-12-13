"use client";

import { useRouter } from "next/navigation";
import { FileText, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/hooks/use-projects";

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

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/workspace?projectId=${project.id}`);
  };

  const statusLabel = project.is_complete ? "Complete" : "In Progress";
  const statusColor = project.is_complete
    ? "bg-green-500/20 text-green-400"
    : "bg-amber-500/20 text-amber-400";

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5">
      {/* Thumbnail area */}
      <div className="relative aspect-[4/3] bg-muted/50 flex items-center justify-center">
        <FileText className="w-12 h-12 text-muted-foreground/30" />

        {/* Status badge */}
        <div
          className={cn(
            "absolute bottom-3 left-3 px-2 py-0.5 rounded text-xs font-medium",
            statusColor
          )}>
          {statusLabel}
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 space-y-2">
        <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-accent transition-colors">
          {project.title || project.topic}
        </h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded bg-muted">
            {documentTypeLabels[project.document_type] || project.document_type}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatRelativeTime(project.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
