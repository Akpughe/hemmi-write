-- Add academic metadata columns to research_sources table
-- This migration enhances the citation system to support proper academic references

-- Add academic metadata columns
ALTER TABLE research_sources
  -- Core academic fields
  ADD COLUMN IF NOT EXISTS journal_name TEXT,
  ADD COLUMN IF NOT EXISTS volume TEXT,
  ADD COLUMN IF NOT EXISTS issue TEXT,
  ADD COLUMN IF NOT EXISTS pages TEXT,
  ADD COLUMN IF NOT EXISTS doi TEXT,
  ADD COLUMN IF NOT EXISTS year INTEGER,

  -- Publication details
  ADD COLUMN IF NOT EXISTS publisher TEXT,
  ADD COLUMN IF NOT EXISTS publication_type TEXT CHECK (
    publication_type IS NULL OR
    publication_type IN ('journal', 'conference', 'book', 'book_chapter', 'web', 'thesis', 'report', 'preprint')
  ),

  -- Additional fields
  ADD COLUMN IF NOT EXISTS isbn TEXT,
  ADD COLUMN IF NOT EXISTS conference_name TEXT,
  ADD COLUMN IF NOT EXISTS editors TEXT,

  -- Structured author data (for proper citation formatting)
  ADD COLUMN IF NOT EXISTS authors_structured JSONB;

-- Create index for efficient queries by publication type
CREATE INDEX IF NOT EXISTS idx_research_sources_publication_type
  ON research_sources(publication_type, project_id);

-- Add column comments for documentation
COMMENT ON COLUMN research_sources.journal_name IS 'Journal name for academic papers (e.g., "IEEE Transactions on Sustainable Energy")';
COMMENT ON COLUMN research_sources.volume IS 'Journal volume number';
COMMENT ON COLUMN research_sources.issue IS 'Journal issue number';
COMMENT ON COLUMN research_sources.pages IS 'Page range (e.g., "94-101")';
COMMENT ON COLUMN research_sources.doi IS 'Digital Object Identifier (e.g., "10.1109/TSTE.2011.2163324")';
COMMENT ON COLUMN research_sources.year IS 'Publication year (extracted separately from published_date for easier querying)';
COMMENT ON COLUMN research_sources.publication_type IS 'Type of publication: journal, conference, book, book_chapter, web, thesis, report, preprint';
COMMENT ON COLUMN research_sources.publisher IS 'Publisher name (for books, conference proceedings, etc.)';
COMMENT ON COLUMN research_sources.isbn IS 'International Standard Book Number (for books)';
COMMENT ON COLUMN research_sources.conference_name IS 'Conference name (for conference papers)';
COMMENT ON COLUMN research_sources.editors IS 'Editor names (for edited books, conference proceedings)';
COMMENT ON COLUMN research_sources.authors_structured IS 'Structured author data for proper citation formatting: [{"first": "Stephen", "last": "Gill", "middle": ""}]';
