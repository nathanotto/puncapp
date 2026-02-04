-- Add fields to track the current timer for syncing across all viewers

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS current_timer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_timer_start timestamptz;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_meetings_current_timer ON meetings(current_timer_user_id) WHERE current_timer_user_id IS NOT NULL;
