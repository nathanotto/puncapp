-- Update commitments foreign key constraints to SET NULL on meeting deletion
-- This preserves commitment history even when meetings are deleted

-- Drop existing constraints
ALTER TABLE commitments
  DROP CONSTRAINT IF EXISTS commitments_created_at_meeting_id_fkey;

ALTER TABLE commitments
  DROP CONSTRAINT IF EXISTS commitments_completed_at_meeting_id_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE commitments
  ADD CONSTRAINT commitments_created_at_meeting_id_fkey
  FOREIGN KEY (created_at_meeting_id)
  REFERENCES meetings(id)
  ON DELETE SET NULL;

ALTER TABLE commitments
  ADD CONSTRAINT commitments_completed_at_meeting_id_fkey
  FOREIGN KEY (completed_at_meeting_id)
  REFERENCES meetings(id)
  ON DELETE SET NULL;
