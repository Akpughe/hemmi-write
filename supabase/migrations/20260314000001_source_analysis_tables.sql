-- Migration: Source analysis tables
-- Creates source_analysis, section_source_mappings, and chapter_argument_summaries
-- tables with RLS policies and indexes.

-- =============================================================================
-- 1. source_analysis
-- =============================================================================
CREATE TABLE source_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_source_analysis_project_id ON source_analysis(project_id);

-- Reuse existing updated_at trigger function
CREATE TRIGGER set_source_analysis_updated_at
  BEFORE UPDATE ON source_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE source_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY source_analysis_select ON source_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = source_analysis.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY source_analysis_insert ON source_analysis
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = source_analysis.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 2. section_source_mappings
-- =============================================================================
CREATE TABLE section_source_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES document_structures(id) ON DELETE CASCADE,
  mappings JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_section_source_mappings_project_id ON section_source_mappings(project_id);
CREATE INDEX idx_section_source_mappings_structure_id ON section_source_mappings(structure_id);

-- RLS
ALTER TABLE section_source_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY section_source_mappings_select ON section_source_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = section_source_mappings.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY section_source_mappings_insert ON section_source_mappings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = section_source_mappings.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 3. chapter_argument_summaries
-- =============================================================================
CREATE TABLE chapter_argument_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES document_sections(id) ON DELETE CASCADE,
  chapter_heading TEXT NOT NULL,
  thesis_advanced TEXT NOT NULL,
  key_evidence TEXT[] NOT NULL DEFAULT '{}',
  connection_to_next TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chapter_argument_summaries_project_id ON chapter_argument_summaries(project_id);
CREATE INDEX idx_chapter_argument_summaries_section_id ON chapter_argument_summaries(section_id);

-- RLS
ALTER TABLE chapter_argument_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY chapter_argument_summaries_select ON chapter_argument_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = chapter_argument_summaries.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );

CREATE POLICY chapter_argument_summaries_insert ON chapter_argument_summaries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = chapter_argument_summaries.project_id
        AND writing_projects.user_id = auth.uid()
    )
  );
