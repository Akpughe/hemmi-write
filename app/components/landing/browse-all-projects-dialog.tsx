"use client";

import { useState } from "react";
import { useProjects } from "@/lib/hooks/use-projects";
import { ProjectCard } from "./project-card";
import { ProjectsTabs } from "./projects-tabs";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

interface BrowseAllProjectsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BrowseAllProjectsDialog({
  isOpen,
  onClose,
}: BrowseAllProjectsDialogProps) {
  const [activeTab, setActiveTab] = useState<"recent" | "my-projects">(
    "recent"
  );

  // Fetch all projects (no limit or higher limit)
  const { data, isLoading, error } = useProjects({
    limit: 50, // Show up to 50 projects
    // For now, "recent" shows all, "my-projects" could filter in the future
  });

  const projects = data?.projects || [];
  const skeletonKeys = Array.from({ length: 6 }, (_, i) => `s${i + 1}`);

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {skeletonKeys.map((key) => (
          <div
            key={key}
            className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="relative aspect-4/3 bg-muted/40">
              <Skeleton className="absolute inset-0" />
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  } else if (error) {
    content = (
      <div className="text-center py-10 text-muted-foreground">
        Failed to load projects
      </div>
    );
  } else if (projects.length === 0) {
    content = (
      <div className="text-center py-10 text-muted-foreground">
        No projects found
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] !grid-rows-[auto_1fr]">
        <DialogHeader>
          <DialogTitle>All Projects</DialogTitle>
          <DialogDescription>
            Browse and manage all your writing projects
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col min-h-0 space-y-6 overflow-hidden">
          {/* Tabs */}
          <ProjectsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Projects grid */}
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {content}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

