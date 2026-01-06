-- Add new checkpoint type for version snapshots before source regeneration
-- This allows users to rollback if regeneration overwrites their manual edits

-- Modify the CHECK constraint on document_versions table
ALTER TABLE document_versions
DROP CONSTRAINT IF EXISTS document_versions_checkpoint_type_check;

ALTER TABLE document_versions
ADD CONSTRAINT document_versions_checkpoint_type_check
CHECK (checkpoint_type IN (
  'initial_structure',
  'structure_regeneration',
  'chapter_complete',
  'manual_save',
  'before_major_edit',
  'before_source_regeneration', -- NEW: Snapshot before regenerating with new source
  'final_complete'
));

-- Add comment to explain the new checkpoint type
COMMENT ON CONSTRAINT document_versions_checkpoint_type_check ON document_versions IS
'Valid checkpoint types including before_source_regeneration for snapshots before regenerating content with newly added sources';
