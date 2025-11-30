-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_documents ENABLE ROW LEVEL SECURITY;

-- User Profiles
CREATE POLICY user_profiles_select_own ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY user_profiles_insert_own ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Writing Projects
-- Own projects
CREATE POLICY writing_projects_select_own ON writing_projects
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Shared via link
CREATE POLICY writing_projects_select_shared ON writing_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shared_links
      WHERE shared_links.project_id = writing_projects.id
        AND shared_links.is_active = TRUE
        AND (shared_links.expires_at IS NULL OR shared_links.expires_at > NOW())
    ) AND deleted_at IS NULL
  );

-- Public gallery
CREATE POLICY writing_projects_select_public ON writing_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public_documents
      WHERE public_documents.project_id = writing_projects.id
        AND public_documents.is_active = TRUE
        AND public_documents.moderation_status = 'approved'
    ) AND deleted_at IS NULL
  );

-- CRUD for own projects
CREATE POLICY writing_projects_insert_own ON writing_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY writing_projects_update_own ON writing_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY writing_projects_delete_own ON writing_projects
  FOR DELETE USING (auth.uid() = user_id);

-- Child Tables (Inherit Project Access)
-- research_sources
CREATE POLICY research_sources_select_own ON research_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = research_sources.project_id
        AND writing_projects.user_id = auth.uid()
        AND writing_projects.deleted_at IS NULL
    )
  );

CREATE POLICY research_sources_select_shared ON research_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN shared_links ON shared_links.project_id = writing_projects.id
      WHERE writing_projects.id = research_sources.project_id
        AND shared_links.is_active = TRUE
        AND (shared_links.expires_at IS NULL OR shared_links.expires_at > NOW())
    )
  );

CREATE POLICY research_sources_select_public ON research_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN public_documents ON public_documents.project_id = writing_projects.id
      WHERE writing_projects.id = research_sources.project_id
        AND public_documents.is_active = TRUE
        AND public_documents.moderation_status = 'approved'
    )
  );

CREATE POLICY research_sources_insert_own ON research_sources
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = research_sources.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY research_sources_update_own ON research_sources
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = research_sources.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY research_sources_delete_own ON research_sources
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = research_sources.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

-- document_structures
CREATE POLICY document_structures_select_own ON document_structures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = document_structures.project_id
        AND writing_projects.user_id = auth.uid()
        AND writing_projects.deleted_at IS NULL
    )
  );

CREATE POLICY document_structures_select_shared ON document_structures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN shared_links ON shared_links.project_id = writing_projects.id
      WHERE writing_projects.id = document_structures.project_id
        AND shared_links.is_active = TRUE
        AND (shared_links.expires_at IS NULL OR shared_links.expires_at > NOW())
    )
  );

CREATE POLICY document_structures_select_public ON document_structures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN public_documents ON public_documents.project_id = writing_projects.id
      WHERE writing_projects.id = document_structures.project_id
        AND public_documents.is_active = TRUE
        AND public_documents.moderation_status = 'approved'
    )
  );

CREATE POLICY document_structures_insert_own ON document_structures
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = document_structures.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY document_structures_update_own ON document_structures
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = document_structures.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY document_structures_delete_own ON document_structures
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = document_structures.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

-- document_sections (indirectly linked via structure_id, need to join document_structures)
CREATE POLICY document_sections_select_own ON document_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_structures
      JOIN writing_projects ON writing_projects.id = document_structures.project_id
      WHERE document_structures.id = document_sections.structure_id
        AND writing_projects.user_id = auth.uid()
        AND writing_projects.deleted_at IS NULL
    )
  );

CREATE POLICY document_sections_select_shared ON document_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_structures
      JOIN writing_projects ON writing_projects.id = document_structures.project_id
      JOIN shared_links ON shared_links.project_id = writing_projects.id
      WHERE document_structures.id = document_sections.structure_id
        AND shared_links.is_active = TRUE
        AND (shared_links.expires_at IS NULL OR shared_links.expires_at > NOW())
    )
  );

CREATE POLICY document_sections_select_public ON document_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_structures
      JOIN writing_projects ON writing_projects.id = document_structures.project_id
      JOIN public_documents ON public_documents.project_id = writing_projects.id
      WHERE document_structures.id = document_sections.structure_id
        AND public_documents.is_active = TRUE
        AND public_documents.moderation_status = 'approved'
    )
  );

CREATE POLICY document_sections_insert_own ON document_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_structures
      JOIN writing_projects ON writing_projects.id = document_structures.project_id
      WHERE document_structures.id = document_sections.structure_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY document_sections_update_own ON document_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM document_structures
      JOIN writing_projects ON writing_projects.id = document_structures.project_id
      WHERE document_structures.id = document_sections.structure_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY document_sections_delete_own ON document_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM document_structures
      JOIN writing_projects ON writing_projects.id = document_structures.project_id
      WHERE document_structures.id = document_sections.structure_id
        AND writing_projects.user_id = auth.uid()
    )
  );

-- generated_documents
CREATE POLICY generated_documents_select_own ON generated_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = generated_documents.project_id
        AND writing_projects.user_id = auth.uid()
        AND writing_projects.deleted_at IS NULL
    )
  );

CREATE POLICY generated_documents_select_shared ON generated_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN shared_links ON shared_links.project_id = writing_projects.id
      WHERE writing_projects.id = generated_documents.project_id
        AND shared_links.is_active = TRUE
        AND (shared_links.expires_at IS NULL OR shared_links.expires_at > NOW())
    )
  );

CREATE POLICY generated_documents_select_public ON generated_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN public_documents ON public_documents.project_id = writing_projects.id
      WHERE writing_projects.id = generated_documents.project_id
        AND public_documents.is_active = TRUE
        AND public_documents.moderation_status = 'approved'
    )
  );

CREATE POLICY generated_documents_insert_own ON generated_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = generated_documents.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY generated_documents_update_own ON generated_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = generated_documents.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY generated_documents_delete_own ON generated_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = generated_documents.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

-- chat_messages
CREATE POLICY chat_messages_select_own ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = chat_messages.project_id
        AND writing_projects.user_id = auth.uid()
        AND writing_projects.deleted_at IS NULL
    )
  );

-- Chat messages are usually private, but maybe shared? Assuming private for now unless specified otherwise, but docs say "Child Tables (Inherit Project Access)". Let's follow that pattern.
CREATE POLICY chat_messages_select_shared ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN shared_links ON shared_links.project_id = writing_projects.id
      WHERE writing_projects.id = chat_messages.project_id
        AND shared_links.is_active = TRUE
        AND (shared_links.expires_at IS NULL OR shared_links.expires_at > NOW())
    )
  );

CREATE POLICY chat_messages_select_public ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN public_documents ON public_documents.project_id = writing_projects.id
      WHERE writing_projects.id = chat_messages.project_id
        AND public_documents.is_active = TRUE
        AND public_documents.moderation_status = 'approved'
    )
  );

CREATE POLICY chat_messages_insert_own ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = chat_messages.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY chat_messages_update_own ON chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = chat_messages.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY chat_messages_delete_own ON chat_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = chat_messages.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

-- citations
CREATE POLICY citations_select_own ON citations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = citations.project_id
        AND writing_projects.user_id = auth.uid()
        AND writing_projects.deleted_at IS NULL
    )
  );

CREATE POLICY citations_select_shared ON citations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN shared_links ON shared_links.project_id = writing_projects.id
      WHERE writing_projects.id = citations.project_id
        AND shared_links.is_active = TRUE
        AND (shared_links.expires_at IS NULL OR shared_links.expires_at > NOW())
    )
  );

CREATE POLICY citations_select_public ON citations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN public_documents ON public_documents.project_id = writing_projects.id
      WHERE writing_projects.id = citations.project_id
        AND public_documents.is_active = TRUE
        AND public_documents.moderation_status = 'approved'
    )
  );

CREATE POLICY citations_insert_own ON citations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = citations.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY citations_update_own ON citations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = citations.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY citations_delete_own ON citations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = citations.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

-- document_versions
CREATE POLICY document_versions_select_own ON document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = document_versions.project_id
        AND writing_projects.user_id = auth.uid()
        AND writing_projects.deleted_at IS NULL
    )
  );

CREATE POLICY document_versions_select_shared ON document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN shared_links ON shared_links.project_id = writing_projects.id
      WHERE writing_projects.id = document_versions.project_id
        AND shared_links.is_active = TRUE
        AND (shared_links.expires_at IS NULL OR shared_links.expires_at > NOW())
    )
  );

CREATE POLICY document_versions_select_public ON document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      JOIN public_documents ON public_documents.project_id = writing_projects.id
      WHERE writing_projects.id = document_versions.project_id
        AND public_documents.is_active = TRUE
        AND public_documents.moderation_status = 'approved'
    )
  );

CREATE POLICY document_versions_insert_own ON document_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = document_versions.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY document_versions_update_own ON document_versions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = document_versions.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY document_versions_delete_own ON document_versions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = document_versions.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

-- Shared Links
CREATE POLICY shared_links_select_own ON shared_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = shared_links.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY shared_links_insert_own ON shared_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = shared_links.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY shared_links_update_own ON shared_links
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = shared_links.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY shared_links_delete_own ON shared_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = shared_links.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

-- Public Documents
-- Anyone can read approved public documents
CREATE POLICY public_documents_select_public ON public_documents
  FOR SELECT USING (is_active = TRUE AND moderation_status = 'approved');

-- Only owner can manage their public documents
CREATE POLICY public_documents_select_own ON public_documents
  FOR SELECT USING (auth.uid() = published_by);

CREATE POLICY public_documents_insert_own ON public_documents
  FOR INSERT WITH CHECK (
    auth.uid() = published_by
    AND EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = public_documents.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY public_documents_update_own ON public_documents
  FOR UPDATE USING (auth.uid() = published_by);

CREATE POLICY public_documents_delete_own ON public_documents
  FOR DELETE USING (auth.uid() = published_by);
