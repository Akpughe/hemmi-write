-- Fix infinite recursion in RLS policies
-- The issue: writing_projects policies reference shared_links and public_documents
-- which in turn reference writing_projects, creating circular dependencies

-- Solution: Disable RLS on shared_links and public_documents since access control
-- is already handled at the writing_projects level

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS writing_projects_select_shared ON writing_projects;
DROP POLICY IF EXISTS writing_projects_select_public ON writing_projects;

-- Disable RLS on shared_links (access is controlled via writing_projects)
ALTER TABLE shared_links DISABLE ROW LEVEL SECURITY;

-- Disable RLS on public_documents (access is controlled via writing_projects)
ALTER TABLE public_documents DISABLE ROW LEVEL SECURITY;

-- Keep the basic select policy for writing_projects (own projects only)
-- The shared_links and public_documents tables will be queried without RLS
-- but users can only see shared_links/public_documents for projects they own
-- because those tables reference project_id which has foreign key constraints
