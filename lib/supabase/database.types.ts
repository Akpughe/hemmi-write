export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          context: Json | null
          created_at: string
          id: string
          project_id: string
          role: string
        }
        Insert: {
          content: string
          context?: Json | null
          created_at?: string
          id?: string
          project_id: string
          role: string
        }
        Update: {
          content?: string
          context?: Json | null
          created_at?: string
          id?: string
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "writing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      citations: {
        Row: {
          citation_style: string
          created_at: string
          id: string
          in_text_format: string
          marker: string
          position: number | null
          project_id: string
          reference_format: string
          source_id: string
          updated_at: string
          used_in_sections: Json | null
        }
        Insert: {
          citation_style: string
          created_at?: string
          id?: string
          in_text_format: string
          marker: string
          position?: number | null
          project_id: string
          reference_format: string
          source_id: string
          updated_at?: string
          used_in_sections?: Json | null
        }
        Update: {
          citation_style?: string
          created_at?: string
          id?: string
          in_text_format?: string
          marker?: string
          position?: number | null
          project_id?: string
          reference_format?: string
          source_id?: string
          updated_at?: string
          used_in_sections?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "citations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "writing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "research_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sections: {
        Row: {
          created_at: string
          description: string
          estimated_word_count: number | null
          heading: string
          id: string
          key_points: Json
          position: number
          section_number: string | null
          structure_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          estimated_word_count?: number | null
          heading: string
          id?: string
          key_points: Json
          position: number
          section_number?: string | null
          structure_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          estimated_word_count?: number | null
          heading?: string
          id?: string
          key_points?: Json
          position?: number
          section_number?: string | null
          structure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sections_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "document_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      document_structures: {
        Row: {
          approach: string
          created_at: string
          estimated_word_count: number | null
          id: string
          is_approved: boolean
          is_current: boolean
          project_id: string
          regeneration_report: Json | null
          table_of_contents: Json | null
          title: string
          tone: string
          updated_at: string
          version: number
        }
        Insert: {
          approach: string
          created_at?: string
          estimated_word_count?: number | null
          id?: string
          is_approved?: boolean
          is_current?: boolean
          project_id: string
          regeneration_report?: Json | null
          table_of_contents?: Json | null
          title: string
          tone: string
          updated_at?: string
          version?: number
        }
        Update: {
          approach?: string
          created_at?: string
          estimated_word_count?: number | null
          id?: string
          is_approved?: boolean
          is_current?: boolean
          project_id?: string
          regeneration_report?: Json | null
          table_of_contents?: Json | null
          title?: string
          tone?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_structures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "writing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          checkpoint_type: string
          content_snapshot: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          project_id: string
          sources_snapshot: Json
          structure_snapshot: Json
          version_name: string | null
          version_number: number
          word_count: number | null
        }
        Insert: {
          checkpoint_type: string
          content_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id: string
          sources_snapshot: Json
          structure_snapshot: Json
          version_name?: string | null
          version_number: number
          word_count?: number | null
        }
        Update: {
          checkpoint_type?: string
          content_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id?: string
          sources_snapshot?: Json
          structure_snapshot?: Json
          version_name?: string | null
          version_number?: number
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "writing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          block_info: Json | null
          character_count: number | null
          completed_at: string | null
          content: string
          created_at: string
          generation_completed: boolean
          generation_method: string | null
          id: string
          is_current: boolean
          project_id: string
          references_text: string | null
          structure_id: string | null
          updated_at: string
          word_count: number | null
        }
        Insert: {
          block_info?: Json | null
          character_count?: number | null
          completed_at?: string | null
          content: string
          created_at?: string
          generation_completed?: boolean
          generation_method?: string | null
          id?: string
          is_current?: boolean
          project_id: string
          references_text?: string | null
          structure_id?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          block_info?: Json | null
          character_count?: number | null
          completed_at?: string | null
          content?: string
          created_at?: string
          generation_completed?: boolean
          generation_method?: string | null
          id?: string
          is_current?: boolean
          project_id?: string
          references_text?: string | null
          structure_id?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "writing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "document_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      public_documents: {
        Row: {
          description: string | null
          display_title: string
          featured: boolean
          id: string
          is_active: boolean
          like_count: number
          moderation_notes: string | null
          moderation_status: string
          project_id: string
          published_at: string
          published_by: string
          tags: Json | null
          updated_at: string
          view_count: number
        }
        Insert: {
          description?: string | null
          display_title: string
          featured?: boolean
          id?: string
          is_active?: boolean
          like_count?: number
          moderation_notes?: string | null
          moderation_status?: string
          project_id: string
          published_at?: string
          published_by: string
          tags?: Json | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          description?: string | null
          display_title?: string
          featured?: boolean
          id?: string
          is_active?: boolean
          like_count?: number
          moderation_notes?: string | null
          moderation_status?: string
          project_id?: string
          published_at?: string
          published_by?: string
          tags?: Json | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "writing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sources: {
        Row: {
          author: string | null
          created_at: string
          excerpt: string
          fetched_at: string
          full_content: string | null
          highlights: Json | null
          id: string
          is_selected: boolean
          position: number | null
          project_id: string
          published_date: string | null
          relevance_score: number | null
          source_type: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          excerpt: string
          fetched_at?: string
          full_content?: string | null
          highlights?: Json | null
          id?: string
          is_selected?: boolean
          position?: number | null
          project_id: string
          published_date?: string | null
          relevance_score?: number | null
          source_type?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          author?: string | null
          created_at?: string
          excerpt?: string
          fetched_at?: string
          full_content?: string | null
          highlights?: Json | null
          id?: string
          is_selected?: boolean
          position?: number | null
          project_id?: string
          published_date?: string | null
          relevance_score?: number | null
          source_type?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "writing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_links: {
        Row: {
          created_at: string
          created_by: string
          current_views: number
          expires_at: string | null
          id: string
          is_active: boolean
          last_accessed_at: string | null
          max_views: number | null
          password_hash: string | null
          permissions: string
          project_id: string
          share_token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_views?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          max_views?: number | null
          password_hash?: string | null
          permissions?: string
          project_id: string
          share_token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_views?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          max_views?: number | null
          password_hash?: string | null
          permissions?: string
          project_id?: string
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "writing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      writing_projects: {
        Row: {
          academic_level: string
          ai_provider: string | null
          citation_style: string
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          document_type: string
          id: string
          instructions: string | null
          is_complete: boolean
          metadata: Json | null
          target_word_count: number | null
          title: string
          topic: string
          updated_at: string
          user_id: string
          workflow_step: string
          writing_style: string
        }
        Insert: {
          academic_level: string
          ai_provider?: string | null
          citation_style: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          document_type: string
          id?: string
          instructions?: string | null
          is_complete?: boolean
          metadata?: Json | null
          target_word_count?: number | null
          title: string
          topic: string
          updated_at?: string
          user_id: string
          workflow_step?: string
          writing_style: string
        }
        Update: {
          academic_level?: string
          ai_provider?: string | null
          citation_style?: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          document_type?: string
          id?: string
          instructions?: string | null
          is_complete?: boolean
          metadata?: Json | null
          target_word_count?: number | null
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string
          workflow_step?: string
          writing_style?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_share_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      increment_share_view: {
        Args: {
          share_token_param: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

