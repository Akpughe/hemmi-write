-- Add is_archived column to writing_projects table
ALTER TABLE writing_projects ADD COLUMN is_archived BOOLEAN DEFAULT false;
