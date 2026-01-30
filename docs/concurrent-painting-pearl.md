# Write Nuton - Supabase Backend Schema Documentation

## Overview

This document outlines a complete Supabase backend architecture for Write Nuton, an AI-powered academic writing assistant. The schema supports multi-user authentication, document sharing (private/link-based/public gallery), version control with snapshots, and full source content caching.

**Status:** Planning/Documentation Phase - NOT YET IMPLEMENTED

---

## Implementation Task Breakdown

### Phase 1: Supabase Project Setup (2-3 hours)

- [ ] **Task 1.1**: Initialize Supabase in project
  - Run `npx supabase init`
  - Create Supabase project on dashboard (if not exists)
  - Link local to remote: `npx supabase link --project-ref <ref>`

- [ ] **Task 1.2**: Configure environment variables
  - Add `NEXT_PUBLIC_SUPABASE_URL` to `.env.local`
  - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
  - Update `.env.example` with Supabase variables

- [ ] **Task 1.3**: Install Supabase dependencies
  - `npm install @supabase/supabase-js @supabase/auth-helpers-nextjs`

### Phase 2: Database Schema Creation (3-4 hours)

- [ ] **Task 2.1**: Create migration file 1 - Initial Schema
  - File: `supabase/migrations/20250001000000_initial_schema.sql`
  - Create all 11 tables with constraints
  - Add all indexes
  - Add table/column comments

- [ ] **Task 2.2**: Create migration file 2 - Row Level Security
  - File: `supabase/migrations/20250002000000_enable_rls.sql`
  - Enable RLS on all tables
  - Create policies for own/shared/public access patterns

- [ ] **Task 2.3**: Create migration file 3 - Functions & Triggers
  - File: `supabase/migrations/20250003000000_functions_triggers.sql`
  - Auto-update timestamp triggers
  - User profile auto-creation
  - Single current structure/document enforcement
  - Share token generation

- [ ] **Task 2.4**: Create migration file 4 - Storage Buckets
  - File: `supabase/migrations/20250004000000_storage_buckets.sql`
  - Create avatars bucket
  - Create exports bucket
  - Set up storage RLS policies

- [ ] **Task 2.5**: Apply migrations locally
  - Run `npx supabase db reset`
  - Verify all tables created
  - Test RLS policies with test data

- [ ] **Task 2.6**: Generate TypeScript types
  - Run `npx supabase gen types typescript --local > lib/supabase/database.types.ts`
  - Verify types match schema

### Phase 3: Authentication Setup (4-5 hours)

- [ ] **Task 3.1**: Create Supabase client wrapper
  - File: `lib/supabase/client.ts`
  - Initialize Supabase client with types

- [ ] **Task 3.2**: Create auth helper functions
  - File: `lib/supabase/auth.ts`
  - Functions: signUp, signIn, signOut, getSession, resetPassword

- [ ] **Task 3.3**: Create Supabase context provider
  - File: `lib/context/SupabaseContext.tsx`
  - Manage auth state
  - Listen for auth changes
  - Export useSupabase hook

- [ ] **Task 3.4**: Update app layout
  - Modify `app/layout.tsx`
  - Wrap with SupabaseProvider
  - Test auth state persistence

- [ ] **Task 3.5**: Create authentication pages
  - File: `app/auth/login/page.tsx`
  - File: `app/auth/signup/page.tsx`
  - File: `app/auth/callback/page.tsx` (OAuth)
  - File: `app/auth/reset-password/page.tsx`

- [ ] **Task 3.6**: Configure Supabase Auth settings
  - Enable email/password authentication
  - Configure email templates
  - Set up redirect URLs
  - (Optional) Enable social providers (Google, GitHub)

### Phase 4: Core API Integration (6-8 hours)

- [ ] **Task 4.1**: Create projects CRUD API
  - File: `app/api/projects/route.ts`
  - GET: List user's projects
  - POST: Create new project

- [ ] **Task 4.2**: Create single project API
  - File: `app/api/projects/[id]/route.ts`
  - GET: Get project with all relations
  - PATCH: Update project
  - DELETE: Soft delete project

- [ ] **Task 4.3**: Update research API to use database
  - Modify `app/api/write/research/route.ts`
  - Save fetched sources to `research_sources` table
  - Return saved sources instead of ephemeral data

- [ ] **Task 4.4**: Update structure API to use database
  - Modify `app/api/write/structure/route.ts`
  - Save structure to `document_structures` table
  - Save sections to `document_sections` table
  - Create version snapshot on initial creation

- [ ] **Task 4.5**: Update structure regeneration API
  - Modify `app/api/write/structure/deep-regenerate/route.ts`
  - Save regeneration report to structure
  - Create version snapshot
  - Save new sources if research conducted

- [ ] **Task 4.6**: Update document generation API
  - Modify `app/api/write/generate/route.ts`
  - Save content to `generated_documents` table
  - Update word count
  - Create version snapshot on completion

- [ ] **Task 4.7**: Update chat API to use database
  - Modify `app/api/chat/route.ts`
  - Save all messages to `chat_messages` table
  - Load message history from database

### Phase 5: Sharing Features (4-5 hours)

- [ ] **Task 5.1**: Create share link management API
  - File: `app/api/projects/[id]/share/route.ts`
  - POST: Create share link
  - GET: List share links for project
  - PATCH: Update share link (disable, change permissions)
  - DELETE: Delete share link

- [ ] **Task 5.2**: Create shared project access page
  - File: `app/shared/[token]/page.tsx`
  - Validate share token
  - Load project based on permissions
  - Read-only or editable view based on permissions

- [ ] **Task 5.3**: Create public gallery API
  - File: `app/api/projects/[id]/publish/route.ts`
  - POST: Publish to gallery
  - PATCH: Update published document
  - DELETE: Unpublish from gallery

- [ ] **Task 5.4**: Create public gallery page
  - File: `app/gallery/page.tsx`
  - List approved public documents
  - Filter by tags, sort by views/likes
  - Search functionality

- [ ] **Task 5.5**: Create public document view page
  - File: `app/gallery/[id]/page.tsx`
  - Display public document
  - Increment view count
  - Like functionality

### Phase 6: Version Control (3-4 hours)

- [ ] **Task 6.1**: Create version management API
  - File: `app/api/projects/[id]/versions/route.ts`
  - GET: List all versions for project
  - POST: Create manual version snapshot
  - GET: Get specific version details

- [ ] **Task 6.2**: Create version restore functionality
  - Add restore endpoint to versions API
  - Load snapshot data
  - Create new structure/document from snapshot

- [ ] **Task 6.3**: Add version UI to workspace
  - Version history sidebar
  - View version details
  - Restore version button

### Phase 7: Frontend Integration (8-10 hours)

- [ ] **Task 7.1**: Update landing page
  - Modify `app/page.tsx`
  - Check authentication status
  - Save WritingBrief to database instead of sessionStorage
  - Create `writing_projects` record
  - Redirect to workspace with project ID

- [ ] **Task 7.2**: Update workspace to load from database
  - Modify `app/workspace/page.tsx`
  - Load project from database by ID (URL param)
  - Remove sessionStorage dependencies
  - Implement real-time sync with Supabase Realtime (optional)

- [ ] **Task 7.3**: Implement auto-save functionality
  - Auto-save on content changes (debounced)
  - Show save status indicator
  - Handle save errors gracefully

- [ ] **Task 7.4**: Create projects dashboard
  - File: `app/dashboard/page.tsx`
  - List user's projects
  - Create new project button
  - Filter by status (in progress, complete)
  - Search projects

- [ ] **Task 7.5**: Add project management UI
  - Rename project
  - Duplicate project
  - Delete project
  - Export project

- [ ] **Task 7.6**: Add sharing UI to workspace
  - Share button in header
  - Share modal with link generation
  - Permission selection (view/comment/edit)
  - Copy link functionality
  - Publish to gallery option

### Phase 8: Testing & Migration (4-6 hours)

- [ ] **Task 8.1**: Test RLS policies
  - Create multiple test users
  - Verify data isolation
  - Test shared access
  - Test public access

- [ ] **Task 8.2**: Test all API endpoints
  - Unit tests for each endpoint
  - Test error handling
  - Test edge cases (expired links, max views, etc.)

- [ ] **Task 8.3**: Test frontend integration
  - E2E tests for complete workflow
  - Test authentication flow
  - Test sharing workflow
  - Test version snapshots

- [ ] **Task 8.4**: Push to production
  - Run `npx supabase db push`
  - Verify production deployment
  - Test production environment

- [ ] **Task 8.5**: Data migration (if needed)
  - Export existing data
  - Transform to new schema
  - Import to Supabase
  - Verify data integrity

### Phase 9: Documentation & Cleanup (2-3 hours)

- [ ] **Task 9.1**: Create API documentation
  - Document all endpoints
  - Request/response examples
  - Authentication requirements

- [ ] **Task 9.2**: Create database schema diagram
  - Visual ER diagram
  - Table relationships
  - Access patterns

- [ ] **Task 9.3**: Update README
  - Add Supabase setup instructions
  - Environment variables documentation
  - Local development guide

- [ ] **Task 9.4**: Code cleanup
  - Remove old sessionStorage code
  - Remove unused dependencies
  - Format and lint all new files

### Phase 10: Monitoring & Optimization (Ongoing)

- [ ] **Task 10.1**: Set up monitoring
  - Enable Supabase monitoring dashboard
  - Set up error tracking (Sentry, etc.)
  - Monitor query performance

- [ ] **Task 10.2**: Performance optimization
  - Analyze slow queries
  - Add missing indexes if needed
  - Optimize RLS policies if overhead high

- [ ] **Task 10.3**: Usage analytics
  - Track API endpoint usage
  - Monitor storage usage
  - Track authentication metrics

---

## Estimated Timeline

- **Phase 1**: 2-3 hours
- **Phase 2**: 3-4 hours
- **Phase 3**: 4-5 hours
- **Phase 4**: 6-8 hours
- **Phase 5**: 4-5 hours
- **Phase 6**: 3-4 hours
- **Phase 7**: 8-10 hours
- **Phase 8**: 4-6 hours
- **Phase 9**: 2-3 hours

**Total Estimated Time**: 36-48 hours (4-6 working days)

---

### Application Context

Write Nuton guides users through a 4-step workflow:
1. **Research**: Web search for sources using Exa API
2. **Planning**: AI-generated document structure/outline
3. **Writing**: Chapter-by-chapter content generation with streaming
4. **Complete**: Finalized document with citations

### Requirements Summary

- **Authentication**: Full multi-user with Supabase Auth (email/password + social logins)
- **Sharing**: Private documents, share via link, and public gallery
- **Versioning**: Snapshot checkpoints at key milestones (regenerations, not every edit)
- **Source Caching**: Full source content stored in database
- **Document Types**: Research Paper, Essay, Report
- **Academic Levels**: High School → Professional
- **Writing Styles**: Analytical, Argumentative, Descriptive, Expository, Narrative, Technical
- **Citation Styles**: APA, MLA, Harvard, Chicago

---

## Database Architecture

### Entity Relationship Model

```
auth.users (Supabase Auth)
    ↓ 1:1
user_profiles
    ↓ 1:N
writing_projects
    ├─ research_sources (1:N)
    ├─ document_structures (1:N) → document_sections (1:N)
    ├─ generated_documents (1:N)
    ├─ chat_messages (1:N)
    ├─ citations (1:N)
    ├─ document_versions (1:N)
    ├─ shared_links (1:N) [for sharing]
    └─ public_documents (1:1) [for gallery]
```

### Security Model

- **Row Level Security (RLS)** enabled on all tables
- **Multi-tenant isolation** via `user_id` filtering
- **Three access patterns**:
  1. Own data (user owns the project)
  2. Shared data (via secure share links)
  3. Public data (approved gallery items)

---

## Complete Table Schemas

### 1. User Profiles

Extended user profile linked to Supabase Auth.

```sql
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
```

**Preferences JSONB Structure:**
```json
{
  "default_academic_level": "GRADUATE",
  "default_writing_style": "ANALYTICAL",
  "default_ai_provider": "GROQ",
  "default_citation_style": "APA",
  "theme": "light"
}
```

### 2. Writing Projects

Main container for all writing projects with configuration.

```sql
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
```

**Metadata JSONB Structure:**
```json
{
  "num_sources_requested": 20,
  "chapters": 5,
  "include_sources": true
}
```

### 3. Research Sources

Cached research sources with full content.

```sql
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
```

### 4. Document Structures

Document outline/plan from the planning step.

```sql
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT document_structures_unique_current UNIQUE (project_id, is_current) WHERE is_current = TRUE
);

CREATE INDEX idx_document_structures_project_id ON document_structures(project_id, version DESC);
CREATE INDEX idx_document_structures_current ON document_structures(project_id, is_current) WHERE is_current = TRUE;
```

**Regeneration Report JSONB:**
```json
{
  "feedbackAnalysis": {
    "intents": ["add_section", "expand_methodology"],
    "specificRequests": ["Add case studies section"],
    "knowledgeGaps": ["Need more recent data"],
    "searchQueries": ["recent AI case studies 2024"],
    "requiresNewSources": true
  },
  "researchConducted": [{
    "query": "AI case studies 2024",
    "rationale": "User requested recent examples",
    "sourcesFound": 5
  }],
  "changesSummary": "Added 'Case Studies' section, expanded 'Methodology'"
}
```

### 5. Document Sections

Individual sections/chapters in the outline.

```sql
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
```

**Key Points JSONB:**
```json
{
  "points": [
    "Define the research problem",
    "State the research questions",
    "Outline the significance of the study"
  ]
}
```

### 6. Generated Documents

Final generated document content.

```sql
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
  structure_id UUID REFERENCES document_structures(id) ON DELETE SET NULL,

  -- Content
  content TEXT NOT NULL,
  references TEXT,

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
  completed_at TIMESTAMPTZ,

  CONSTRAINT generated_documents_unique_current UNIQUE (project_id, is_current) WHERE is_current = TRUE
);

CREATE INDEX idx_generated_documents_project_id ON generated_documents(project_id, created_at DESC);
```

### 7. Chat Messages

Conversation history with Hemmi AI assistant.

```sql
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
```

### 8. Citations

Citation tracking and formatting.

```sql
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
```

### 9. Document Versions

Snapshot versions at key milestones.

```sql
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
```

### 10. Shared Links

Secure sharing via generated links.

```sql
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
```

### 11. Public Documents

Public gallery of shared documents.

```sql
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
```

---

## Row Level Security (RLS) Policies

### User Profiles

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profiles_select_own ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY user_profiles_insert_own ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

### Writing Projects

```sql
ALTER TABLE writing_projects ENABLE ROW LEVEL SECURITY;

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
```

### Child Tables (Inherit Project Access)

Apply to: `research_sources`, `document_structures`, `document_sections`, `generated_documents`, `chat_messages`, `citations`, `document_versions`

```sql
-- Example for research_sources (repeat pattern for all child tables)
ALTER TABLE research_sources ENABLE ROW LEVEL SECURITY;

-- Own projects
CREATE POLICY research_sources_select_own ON research_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_projects
      WHERE writing_projects.id = research_sources.project_id
        AND writing_projects.user_id = auth.uid()
        AND writing_projects.deleted_at IS NULL
    )
  );

-- Shared projects
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

-- Public projects
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

-- Insert/Update/Delete for own projects
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
```

### Shared Links

```sql
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

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
```

### Public Documents

```sql
ALTER TABLE public_documents ENABLE ROW LEVEL SECURITY;

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
```

---

## Database Functions & Triggers

### Auto-Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_writing_projects_updated_at
  BEFORE UPDATE ON writing_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_sources_updated_at
  BEFORE UPDATE ON research_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_structures_updated_at
  BEFORE UPDATE ON document_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_sections_updated_at
  BEFORE UPDATE ON document_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON generated_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_citations_updated_at
  BEFORE UPDATE ON citations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_documents_updated_at
  BEFORE UPDATE ON public_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Auto-Create User Profile

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Enforce Single Current Structure

```sql
CREATE OR REPLACE FUNCTION enforce_single_current_structure()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE document_structures
    SET is_current = FALSE
    WHERE project_id = NEW.project_id
      AND id != NEW.id
      AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_current_structure
  BEFORE INSERT OR UPDATE ON document_structures
  FOR EACH ROW WHEN (NEW.is_current = TRUE)
  EXECUTE FUNCTION enforce_single_current_structure();
```

### Enforce Single Current Document

```sql
CREATE OR REPLACE FUNCTION enforce_single_current_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE generated_documents
    SET is_current = FALSE
    WHERE project_id = NEW.project_id
      AND id != NEW.id
      AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_current_document
  BEFORE INSERT OR UPDATE ON generated_documents
  FOR EACH ROW WHEN (NEW.is_current = TRUE)
  EXECUTE FUNCTION enforce_single_current_document();
```

### Share Link Token Generation

```sql
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(24), 'base64')
    REPLACE '/', '_'
    REPLACE '+', '-'
    SUBSTRING 1, 32;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL OR NEW.share_token = '' THEN
    NEW.share_token = generate_share_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shared_links_token
  BEFORE INSERT ON shared_links
  FOR EACH ROW EXECUTE FUNCTION set_share_token();
```

### Increment Share Link Views

```sql
CREATE OR REPLACE FUNCTION increment_share_view(share_token_param TEXT)
RETURNS void AS $$
BEGIN
  UPDATE shared_links
  SET
    current_views = current_views + 1,
    last_accessed_at = NOW()
  WHERE share_token = share_token_param
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Migration Strategy

### Migration Files Structure

```
supabase/
└── migrations/
    ├── 20250001000000_initial_schema.sql
    ├── 20250002000000_enable_rls.sql
    ├── 20250003000000_functions_triggers.sql
    └── 20250004000000_storage_buckets.sql
```

### Migration 1: Initial Schema

Create all tables with constraints, indexes, and comments.

**File:** `supabase/migrations/20250001000000_initial_schema.sql`

Contents:
- All 11 table CREATE statements
- All CHECK constraints
- All indexes
- All COMMENT statements

### Migration 2: Enable RLS

Enable RLS and create all policies.

**File:** `supabase/migrations/20250002000000_enable_rls.sql`

Contents:
- ALTER TABLE ... ENABLE ROW LEVEL SECURITY for all tables
- CREATE POLICY statements for all access patterns (own/shared/public)

### Migration 3: Functions & Triggers

Create all database functions and triggers.

**File:** `supabase/migrations/20250003000000_functions_triggers.sql`

Contents:
- `update_updated_at_column()` function + triggers
- `handle_new_user()` function + trigger
- `enforce_single_current_structure()` function + trigger
- `enforce_single_current_document()` function + trigger
- `generate_share_token()` and `set_share_token()` functions + trigger
- `increment_share_view()` function

### Migration 4: Storage Buckets (Optional)

**File:** `supabase/migrations/20250004000000_storage_buckets.sql`

```sql
-- Avatar storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Export documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false);

-- RLS for avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatars publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS for exports
CREATE POLICY "Users can manage own exports" ON storage.objects
  FOR ALL USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Implementation Steps

### Phase 1: Supabase Setup

1. **Initialize Supabase project**
   ```bash
   npx supabase init
   ```

2. **Link to remote project** (if already created on Supabase dashboard)
   ```bash
   npx supabase link --project-ref <project-ref>
   ```

3. **Create migration files**
   ```bash
   npx supabase migration new initial_schema
   npx supabase migration new enable_rls
   npx supabase migration new functions_triggers
   npx supabase migration new storage_buckets
   ```

4. **Apply migrations locally**
   ```bash
   npx supabase db reset
   ```

5. **Push to production**
   ```bash
   npx supabase db push
   ```

### Phase 2: Type Generation

1. **Generate TypeScript types**
   ```bash
   npx supabase gen types typescript --local > lib/supabase/database.types.ts
   ```

2. **Create Supabase client wrapper**

   **File:** `lib/supabase/client.ts`
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   import type { Database } from './database.types'

   export const supabase = createClient<Database>(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   )
   ```

### Phase 3: Authentication Setup

1. **Configure Supabase Auth**
   - Enable email/password authentication
   - Enable social providers (Google, GitHub, etc.)
   - Configure email templates
   - Set up redirect URLs

2. **Create auth helpers**

   **File:** `lib/supabase/auth.ts`
   ```typescript
   import { supabase } from './client'

   export async function signUp(email: string, password: string, fullName: string) {
     const { data, error } = await supabase.auth.signUp({
       email,
       password,
       options: {
         data: {
           full_name: fullName,
         }
       }
     })
     return { data, error }
   }

   export async function signIn(email: string, password: string) {
     const { data, error } = await supabase.auth.signInWithPassword({
       email,
       password,
     })
     return { data, error }
   }

   export async function signOut() {
     const { error } = await supabase.auth.signOut()
     return { error }
   }

   export async function getSession() {
     const { data: { session } } = await supabase.auth.getSession()
     return session
   }
   ```

### Phase 4: API Integration

1. **Update API routes to use Supabase**

   Modify existing API routes:
   - `app/api/write/research/route.ts`
   - `app/api/write/structure/route.ts`
   - `app/api/write/generate/route.ts`
   - `app/api/chat/route.ts`

2. **Create new API routes**
   - `app/api/projects/route.ts` - CRUD for projects
   - `app/api/projects/[id]/route.ts` - Single project operations
   - `app/api/projects/[id]/share/route.ts` - Share link management
   - `app/api/projects/[id]/publish/route.ts` - Public gallery
   - `app/api/projects/[id]/versions/route.ts` - Version management

### Phase 5: Frontend Integration

1. **Create Supabase context provider**

   **File:** `lib/context/SupabaseContext.tsx`
   ```typescript
   'use client'
   import { createContext, useContext, useEffect, useState } from 'react'
   import { Session } from '@supabase/supabase-js'
   import { supabase } from '@/lib/supabase/client'

   const SupabaseContext = createContext<{
     session: Session | null
     loading: boolean
   }>({
     session: null,
     loading: true,
   })

   export function SupabaseProvider({ children }: { children: React.ReactNode }) {
     const [session, setSession] = useState<Session | null>(null)
     const [loading, setLoading] = useState(true)

     useEffect(() => {
       supabase.auth.getSession().then(({ data: { session } }) => {
         setSession(session)
         setLoading(false)
       })

       const {
         data: { subscription },
       } = supabase.auth.onAuthStateChange((_event, session) => {
         setSession(session)
       })

       return () => subscription.unsubscribe()
     }, [])

     return (
       <SupabaseContext.Provider value={{ session, loading }}>
         {children}
       </SupabaseContext.Provider>
     )
   }

   export const useSupabase = () => useContext(SupabaseContext)
   ```

2. **Update app layout to include provider**

   **File:** `app/layout.tsx`
   ```typescript
   import { SupabaseProvider } from '@/lib/context/SupabaseContext'

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           <SupabaseProvider>
             {children}
           </SupabaseProvider>
         </body>
       </html>
     )
   }
   ```

3. **Create authentication pages**
   - `app/auth/login/page.tsx`
   - `app/auth/signup/page.tsx`
   - `app/auth/callback/page.tsx` (for OAuth redirects)

4. **Update workspace to load from database**

   Modify `app/workspace/page.tsx` to:
   - Load project from Supabase instead of sessionStorage
   - Real-time sync with database
   - Automatic saving of changes

---

## Common Query Patterns

### Get User's Projects with Metadata

```typescript
const { data: projects } = await supabase
  .from('writing_projects')
  .select(`
    *,
    research_sources(count),
    document_structures!inner(
      title,
      estimated_word_count
    ),
    generated_documents!inner(
      word_count,
      generation_completed
    )
  `)
  .eq('user_id', userId)
  .eq('document_structures.is_current', true)
  .eq('generated_documents.is_current', true)
  .is('deleted_at', null)
  .order('updated_at', { ascending: false })
```

### Get Complete Project for Workspace

```typescript
const { data: project } = await supabase
  .from('writing_projects')
  .select(`
    *,
    research_sources(*),
    document_structures!inner(
      *,
      document_sections(*)
    ),
    generated_documents(*),
    chat_messages(*),
    citations(
      *,
      research_sources(*)
    )
  `)
  .eq('id', projectId)
  .eq('document_structures.is_current', true)
  .eq('generated_documents.is_current', true)
  .order('document_sections.position', { ascending: true })
  .order('chat_messages.created_at', { ascending: true })
  .single()
```

### Save New Research Sources

```typescript
const { data: sources, error } = await supabase
  .from('research_sources')
  .insert(
    researchResults.map((source, index) => ({
      project_id: projectId,
      title: source.title,
      url: source.url,
      author: source.author,
      published_date: source.publishedDate,
      excerpt: source.snippet,
      full_content: source.fullContent,
      relevance_score: source.score,
      position: index,
      is_selected: true,
    }))
  )
  .select()
```

### Create Version Snapshot

```typescript
async function createVersionSnapshot(
  projectId: string,
  checkpointType: string,
  description?: string
) {
  // Get current version number
  const { data: versions } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = (versions?.[0]?.version_number ?? 0) + 1

  // Get current state
  const { data: project } = await supabase
    .from('writing_projects')
    .select(`
      *,
      research_sources(*),
      document_structures!inner(*),
      generated_documents!inner(*)
    `)
    .eq('id', projectId)
    .eq('document_structures.is_current', true)
    .eq('generated_documents.is_current', true)
    .single()

  // Create snapshot
  const { data: version } = await supabase
    .from('document_versions')
    .insert({
      project_id: projectId,
      version_number: nextVersion,
      description,
      checkpoint_type: checkpointType,
      structure_snapshot: project.document_structures[0],
      sources_snapshot: project.research_sources,
      content_snapshot: project.generated_documents[0]?.content,
      word_count: project.generated_documents[0]?.word_count,
    })
    .select()
    .single()

  return version
}
```

### Validate and Use Share Link

```typescript
async function accessSharedProject(shareToken: string) {
  // Get share link with project
  const { data: link, error } = await supabase
    .from('shared_links')
    .select(`
      *,
      writing_projects(*)
    `)
    .eq('share_token', shareToken)
    .eq('is_active', true)
    .single()

  if (error || !link) {
    throw new Error('Invalid or expired share link')
  }

  // Check expiration
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    throw new Error('Share link has expired')
  }

  // Check view limit
  if (link.max_views && link.current_views >= link.max_views) {
    throw new Error('Share link view limit reached')
  }

  // Increment view count
  await supabase.rpc('increment_share_view', {
    share_token_param: shareToken
  })

  return {
    project: link.writing_projects,
    permissions: link.permissions,
  }
}
```

---

## Critical Files to Create/Modify

### New Files to Create

1. **supabase/migrations/20250001000000_initial_schema.sql**
   - All table definitions
   - Constraints and indexes

2. **supabase/migrations/20250002000000_enable_rls.sql**
   - All RLS policies

3. **supabase/migrations/20250003000000_functions_triggers.sql**
   - Database functions and triggers

4. **supabase/migrations/20250004000000_storage_buckets.sql**
   - Storage bucket configuration

5. **lib/supabase/client.ts**
   - Supabase client initialization

6. **lib/supabase/database.types.ts**
   - Auto-generated TypeScript types

7. **lib/supabase/auth.ts**
   - Authentication helper functions

8. **lib/context/SupabaseContext.tsx**
   - React context for auth state

9. **app/auth/login/page.tsx**
   - Login page

10. **app/auth/signup/page.tsx**
    - Signup page

11. **app/auth/callback/page.tsx**
    - OAuth callback handler

12. **app/api/projects/route.ts**
    - Projects CRUD API

13. **app/api/projects/[id]/route.ts**
    - Single project API

14. **app/api/projects/[id]/share/route.ts**
    - Share link management API

15. **app/api/projects/[id]/publish/route.ts**
    - Public gallery API

16. **app/api/projects/[id]/versions/route.ts**
    - Version management API

### Existing Files to Modify

1. **app/layout.tsx**
   - Add SupabaseProvider

2. **app/page.tsx**
   - Save WritingBrief to database instead of sessionStorage
   - Create writing_projects record

3. **app/workspace/page.tsx**
   - Load project from database
   - Real-time sync
   - Auto-save functionality

4. **app/api/write/research/route.ts**
   - Save sources to database after fetching

5. **app/api/write/structure/route.ts**
   - Save structure to database
   - Create version snapshot

6. **app/api/write/structure/deep-regenerate/route.ts**
   - Save regeneration report
   - Create version snapshot
   - Update structure in database

7. **app/api/write/generate/route.ts**
   - Save generated content to database
   - Update word count
   - Create version snapshot on completion

8. **app/api/chat/route.ts**
   - Save chat messages to database

9. **.env.local**
   - Add Supabase environment variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your-project-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```

---

## Environment Variables

Add to `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Existing variables (keep these)
EXA_API_KEY=...
GROQ_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

---

## Security Checklist

- [x] RLS enabled on all tables
- [x] User data isolated by `user_id`
- [x] Share links use secure random tokens
- [x] Password hashing for protected links
- [x] Expiration and view limits on share links
- [x] Public gallery with moderation workflow
- [x] Cascade delete rules to prevent orphaned data
- [x] Input validation via CHECK constraints
- [x] Proper indexes for query performance
- [x] Storage bucket RLS policies

---

## Next Steps After Schema Implementation

1. **Testing**
   - Test all RLS policies with multiple users
   - Test share link functionality
   - Test public gallery moderation
   - Test version snapshots

2. **Data Migration** (if needed)
   - Migrate any existing data to new schema
   - Backfill user profiles

3. **Monitoring**
   - Set up Supabase monitoring
   - Track query performance
   - Monitor RLS policy overhead

4. **Documentation**
   - API documentation for frontend team
   - Database schema diagram
   - Query pattern examples

5. **Future Enhancements**
   - Real-time collaboration with Supabase Realtime
   - Full-text search with PostgreSQL
   - Analytics dashboards
   - Export to PDF/DOCX with storage

---

## Summary

This Supabase backend schema provides:

- **Complete multi-user support** with Supabase Auth
- **Flexible sharing** via private, link-based, and public access
- **Version control** with snapshot checkpoints
- **Full source caching** for offline access
- **Scalable JSONB architecture** for complex data
- **Security-first design** with RLS on all tables
- **Performance optimization** with strategic indexes
- **Clean migration strategy** for implementation

The schema supports all current features of Write Nuton and provides a foundation for future enhancements like real-time collaboration, advanced analytics, and team workspaces.
