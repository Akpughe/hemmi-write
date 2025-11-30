-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_profiles_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- Create writing_projects table
CREATE TABLE writing_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  instructions TEXT,

  -- Document Configuration
  document_type TEXT NOT NULL CHECK (document_type IN ('RESEARCH_PAPER', 'ESSAY', 'REPORT')),
  academic_level TEXT NOT NULL CHECK (academic_level IN ('HIGH_SCHOOL', 'UNDERGRADUATE', 'GRADUATE', 'DOCTORAL', 'PROFESSIONAL')),
  writing_style TEXT NOT NULL CHECK (writing_style IN ('ANALYTICAL', 'ARGUMENTATIVE', 'DESCRIPTIVE', 'EXPOSITORY', 'NARRATIVE', 'TECHNICAL')),
  citation_style TEXT NOT NULL CHECK (citation_style IN ('APA', 'MLA', 'HARVARD', 'CHICAGO')),

  -- Settings
  target_word_count INTEGER CHECK (target_word_count >= 500 AND target_word_count <= 100000),
  ai_provider TEXT DEFAULT 'GROQ' CHECK (ai_provider IN ('GROQ', 'GEMINI')),

  -- Workflow State
  workflow_step TEXT NOT NULL DEFAULT 'research' CHECK (workflow_step IN ('research', 'planning', 'writing', 'complete')),
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  CONSTRAINT writing_projects_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 500),
  CONSTRAINT writing_projects_topic_length CHECK (char_length(topic) >= 1 AND char_length(topic) <= 2000)
);

CREATE INDEX idx_writing_projects_user_id ON writing_projects(user_id, created_at DESC);
CREATE INDEX idx_writing_projects_workflow_step ON writing_projects(workflow_step);

-- Create research_sources table
CREATE TABLE research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,

  -- Source Identity
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  author TEXT,
  published_date TEXT,

  -- Content (CACHED)
  excerpt TEXT NOT NULL,
  full_content TEXT,
  highlights JSONB,

  -- Metadata
  source_type TEXT DEFAULT 'web' CHECK (source_type IN ('web', 'academic', 'news', 'blog')),
  relevance_score DECIMAL(4, 3),
  is_selected BOOLEAN NOT NULL DEFAULT TRUE,
  position INTEGER,

  -- Timestamps
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT research_sources_url_check CHECK (url ~* '^https?://'),
  CONSTRAINT research_sources_score_range CHECK (relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 1))
);

CREATE INDEX idx_research_sources_project_id ON research_sources(project_id, position);

-- Create document_structures table
CREATE TABLE document_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,

  -- Structure Info
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  approach TEXT NOT NULL,
  tone TEXT NOT NULL,

  -- Table of Contents
  table_of_contents JSONB,

  -- Overall Estimates
  estimated_word_count INTEGER,

  -- Status
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,

  -- Regeneration Tracking
  regeneration_report JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX document_structures_unique_current ON document_structures(project_id) WHERE is_current = TRUE;

CREATE INDEX idx_document_structures_project_id ON document_structures(project_id, version DESC);
CREATE INDEX idx_document_structures_current ON document_structures(project_id, is_current) WHERE is_current = TRUE;

-- Create document_sections table
CREATE TABLE document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL REFERENCES document_structures(id) ON DELETE CASCADE,

  -- Section Info
  heading TEXT NOT NULL,
  description TEXT NOT NULL,
  key_points JSONB NOT NULL,

  -- Metadata
  position INTEGER NOT NULL,
  estimated_word_count INTEGER,
  section_number TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT document_sections_position_positive CHECK (position >= 0)
);

CREATE INDEX idx_document_sections_structure_id ON document_sections(structure_id, position);

-- Create generated_documents table
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
  structure_id UUID REFERENCES document_structures(id) ON DELETE SET NULL,

  -- Content
  content TEXT NOT NULL,
  references_text TEXT,

  -- Generation Info
  generation_method TEXT CHECK (generation_method IN ('full', 'block', 'chapter')),
  block_info JSONB,

  -- Metadata
  word_count INTEGER,
  character_count INTEGER,

  -- Status
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  generation_completed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX generated_documents_unique_current ON generated_documents(project_id) WHERE is_current = TRUE;

CREATE INDEX idx_generated_documents_project_id ON generated_documents(project_id, created_at DESC);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,

  -- Message Content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Context
  context JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chat_messages_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 50000)
);

CREATE INDEX idx_chat_messages_project_created ON chat_messages(project_id, created_at DESC);

-- Create citations table
CREATE TABLE citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES research_sources(id) ON DELETE CASCADE,

  -- Citation Info
  marker TEXT NOT NULL,
  in_text_format TEXT NOT NULL,
  reference_format TEXT NOT NULL,

  -- Location Tracking
  used_in_sections JSONB,

  -- Metadata
  citation_style TEXT NOT NULL CHECK (citation_style IN ('APA', 'MLA', 'HARVARD', 'CHICAGO')),
  position INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT citations_unique_source_per_project UNIQUE (project_id, source_id)
);

CREATE INDEX idx_citations_project_id ON citations(project_id, position);

-- Create document_versions table
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,

  -- Version Info
  version_number INTEGER NOT NULL,
  version_name TEXT,
  description TEXT,

  -- Snapshot Data
  structure_snapshot JSONB NOT NULL,
  sources_snapshot JSONB NOT NULL,
  content_snapshot TEXT,

  -- Checkpoint Type
  checkpoint_type TEXT NOT NULL CHECK (checkpoint_type IN (
    'initial_structure',
    'structure_regeneration',
    'chapter_complete',
    'manual_save',
    'before_major_edit',
    'final_complete'
  )),

  -- Metadata
  word_count INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT document_versions_version_positive CHECK (version_number > 0),
  CONSTRAINT document_versions_unique_version UNIQUE (project_id, version_number)
);

CREATE INDEX idx_document_versions_project_version ON document_versions(project_id, version_number DESC);

-- Create shared_links table
CREATE TABLE shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,

  -- Link Info
  share_token TEXT NOT NULL UNIQUE,
  permissions TEXT NOT NULL DEFAULT 'view' CHECK (permissions IN ('view', 'comment', 'edit')),

  -- Access Control
  password_hash TEXT,
  max_views INTEGER,
  current_views INTEGER NOT NULL DEFAULT 0,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,

  CONSTRAINT shared_links_max_views_positive CHECK (max_views IS NULL OR max_views > 0)
);

CREATE INDEX idx_shared_links_token ON shared_links(share_token) WHERE is_active = TRUE;

-- Create public_documents table
CREATE TABLE public_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES writing_projects(id) ON DELETE CASCADE,

  -- Display Info
  display_title TEXT NOT NULL,
  description TEXT,
  tags JSONB,

  -- Analytics
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,

  -- Moderation
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderation_notes TEXT,

  -- Metadata
  published_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT public_documents_title_length CHECK (char_length(display_title) >= 1 AND char_length(display_title) <= 200)
);

CREATE INDEX idx_public_documents_active_featured ON public_documents(is_active, featured, view_count DESC);
CREATE INDEX idx_public_documents_tags ON public_documents USING GIN (tags);
