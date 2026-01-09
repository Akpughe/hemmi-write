-- Add status and completed_at columns to document_sections
-- This allows tracking per-section progress (pending/writing/review/complete)

ALTER TABLE document_sections
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'writing', 'review', 'complete')),
ADD COLUMN completed_at TIMESTAMPTZ;

-- Add index for efficient queries on status
CREATE INDEX idx_document_sections_status ON document_sections(structure_id, status);

-- Add comment to explain the status field
COMMENT ON COLUMN document_sections.status IS 'Tracks section progress: pending (not started), writing (in progress), review (draft complete, awaiting approval), complete (approved)';
COMMENT ON COLUMN document_sections.completed_at IS 'Timestamp when section was marked complete by user approval';

