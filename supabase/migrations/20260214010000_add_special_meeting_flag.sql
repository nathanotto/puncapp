-- ============================================================================
-- ADD SPECIAL MEETING FLAG
-- ============================================================================
-- Special consideration meetings bypass normal meeting structure
-- They only have place, time, and notes from scribe
-- ============================================================================

-- Add is_special_meeting flag to meetings table
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS is_special_meeting boolean DEFAULT false;

-- Add index for querying special vs regular meetings
CREATE INDEX IF NOT EXISTS idx_meetings_is_special
  ON meetings(is_special_meeting);

-- Add message_to_members field for special meeting notifications
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS message_to_members text;
