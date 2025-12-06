"use client";

import { useState } from "react";
import { useProjects } from "@/lib/hooks/use-projects";
import { ProjectCard } from "./project-card";
import { ProjectsTabs } from "./projects-tabs";
import { Skeleton } from "@/app/components/ui/skeleton";

export function ProjectsSection() {
  const [activeTab, setActiveTab] = useState<"recent" | "my-projects">(
    "recent"
  );

  // Fetch projects based on active tab
  const { data, isLoading, error } = useProjects({
    limit: 6,
    // For now, "recent" shows all, "my-projects" could filter in the future
  });

  const projects = data?.projects || [];

  // Don't render if no projects and not loading
  if (!isLoading && projects.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Tabs */}
      <div className="mb-6">
        <ProjectsTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onBrowseAll={() => {
            // Could navigate to a projects page in the future
            console.log("Browse all clicked");
          }}
        />
      </div>

      {/* Projects grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border overflow-hidden">
              <div className="aspect-4/3 overflow-hidden bg-muted group-hover:scale-105 transition-transform duration-300"></div>
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8 text-muted-foreground">
          Failed to load projects
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}
