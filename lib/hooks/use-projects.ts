import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types for project data from API
export interface Project {
  id: string;
  title: string;
  topic: string;
  document_type: string;
  workflow_step: string;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface ProjectsResponse {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseProjectsOptions {
  status?: "in_progress" | "complete";
  limit?: number;
  page?: number;
}

/**
 * Hook to fetch user's projects
 */
export function useProjects(options: UseProjectsOptions = {}) {
  const { status, limit = 10, page = 1 } = options;

  return useQuery({
    queryKey: ["projects", { status, limit, page }],
    queryFn: async (): Promise<ProjectsResponse> => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      params.append("limit", String(limit));
      params.append("page", String(page));

      const response = await fetch(`/api/projects?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - return empty list
          return {
            projects: [],
            pagination: { page: 1, limit, total: 0, totalPages: 0 },
          };
        }
        throw new Error("Failed to fetch projects");
      }

      return response.json();
    },
  });
}

/**
 * Hook to fetch a single project
 */
export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const response = await fetch(`/api/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch project");
      }

      return response.json();
    },
    enabled: !!projectId,
  });
}

/**
 * Hook to create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      topic: string;
      document_type: string;
      academic_level?: string;
      writing_style?: string;
      citation_style?: string;
      target_word_count?: number;
    }) => {
      // Convert snake_case to camelCase for API
      const payload = {
        title: data.title,
        topic: data.topic,
        documentType: data.document_type,
        academicLevel: data.academic_level,
        writingStyle: data.writing_style,
        citationStyle: data.citation_style,
        targetWordCount: data.target_word_count,
      };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/**
 * Hook to delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
