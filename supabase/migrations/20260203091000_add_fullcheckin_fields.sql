-- Add fields for Full Check-in tracking
ALTER TABLE meeting_time_log
  ADD COLUMN IF NOT EXISTS stretch_goal_action text CHECK (stretch_goal_action IN (
    'kept',       -- renewed same goal
    'completed',  -- marked as done
    'new',        -- created new goal
    'none'        -- had no goal, didn't create one
  )),
  ADD COLUMN IF NOT EXISTS requested_support boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_stretch_goal_id uuid REFERENCES commitments(id);
