-- Add content fetch tracking columns to research_sources
ALTER TABLE research_sources
  ADD COLUMN IF NOT EXISTS content_fetch_status TEXT
    CHECK (content_fetch_status IN ('pending', 'fetching', 'success', 'failed', 'skipped'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS content_word_count INTEGER,
  ADD COLUMN IF NOT EXISTS content_char_count INTEGER,
  ADD COLUMN IF NOT EXISTS fetch_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fetch_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fetch_error TEXT,
  ADD COLUMN IF NOT EXISTS fetch_duration_ms INTEGER;

-- Create indexes for querying
CREATE INDEX IF NOT EXISTS idx_research_sources_fetch_status
  ON research_sources(content_fetch_status, project_id);

CREATE INDEX IF NOT EXISTS idx_research_sources_fetch_metrics
  ON research_sources(fetch_duration_ms, content_word_count)
  WHERE content_fetch_status = 'success';

-- Add comment for documentation
COMMENT ON COLUMN research_sources.full_content IS 'Full article content fetched from URL (Markdown format, max 500 words)';
COMMENT ON COLUMN research_sources.content_fetch_status IS 'Status of content fetch attempt: pending, fetching, success, failed, skipped';
