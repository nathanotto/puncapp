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

-- Add curriculum_ditched field to meetings table
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS curriculum_ditched boolean DEFAULT false;

-- Update current_section check constraint to include curriculum
ALTER TABLE meetings
  DROP CONSTRAINT IF EXISTS meetings_current_section_check;

ALTER TABLE meetings
  ADD CONSTRAINT meetings_current_section_check
  CHECK (current_section IN (
    'not_started',
    'opening_meditation',
    'opening_ethos',
    'lightning_round',
    'full_checkins',
    'curriculum',
    'closing',
    'ended'
  ));

-- Also update meeting_time_log section constraint
ALTER TABLE meeting_time_log
  DROP CONSTRAINT IF EXISTS meeting_time_log_section_check;

ALTER TABLE meeting_time_log
  ADD CONSTRAINT meeting_time_log_section_check
  CHECK (section IN (
    'opening_meditation',
    'opening_ethos',
    'lightning_round',
    'full_checkins',
    'curriculum',
    'closing'
  ));
