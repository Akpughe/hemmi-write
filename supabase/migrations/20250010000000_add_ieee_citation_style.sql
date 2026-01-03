-- Migration: Add IEEE citation style
-- This migration adds IEEE to the allowed citation styles

-- Update the check constraint on writing_projects table
ALTER TABLE writing_projects
DROP CONSTRAINT IF EXISTS writing_projects_citation_style_check;

ALTER TABLE writing_projects
ADD CONSTRAINT writing_projects_citation_style_check
CHECK (citation_style IN ('APA', 'MLA', 'HARVARD', 'CHICAGO', 'IEEE'));

-- Update the check constraint on citations table
ALTER TABLE citations
DROP CONSTRAINT IF EXISTS citations_citation_style_check;

ALTER TABLE citations
ADD CONSTRAINT citations_citation_style_check
CHECK (citation_style IN ('APA', 'MLA', 'HARVARD', 'CHICAGO', 'IEEE'));
