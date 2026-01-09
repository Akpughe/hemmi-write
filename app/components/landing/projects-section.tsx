"use client";

import { useState } from "react";
import { useProjects } from "@/lib/hooks/use-projects";
import { ProjectCard } from "./project-card";
import { ProjectsTabs } from "./projects-tabs";
import { Skeleton } from "@/app/components/ui/skeleton";
import { BrowseAllProjectsDialog } from "./browse-all-projects-dialog";

export function ProjectsSection() {
  const [activeTab, setActiveTab] = useState<
    "recent" | "my-projects" | "archived"
  >("recent");
  const [isBrowseAllOpen, setIsBrowseAllOpen] = useState(false);

  // Fetch projects based on active tab
  const { data, isLoading, error } = useProjects({
    limit: 6,
    archived: activeTab === "archived",
    // For now, "recent" shows all, "my-projects" could filter in the future
  });

  const projects = data?.projects || [];
  const skeletonKeys = ["s1", "s2", "s3"];

  // Don't render if no projects and not loading
  if (!isLoading && projects.length === 0) {
    return null;
  }

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
    <section className="w-full max-w-6xl mx-auto px-4 pb-12 pt-4">
      {/* Tabs */}
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Projects</h2>
            <p className="text-sm text-muted-foreground">
              Pick up where you left off.
            </p>
          </div>
        </div>
        <ProjectsTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onBrowseAll={() => {
            setIsBrowseAllOpen(true);
          }}
        />
      </div>

      {/* Projects grid */}
      {content}

      {/* Browse all dialog */}
      <BrowseAllProjectsDialog
        isOpen={isBrowseAllOpen}
        onClose={() => setIsBrowseAllOpen(false)}
      />
    </section>
  );
}
