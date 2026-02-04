-- Add new status values for meetings: incomplete, never_started, timed_out

ALTER TABLE meetings
  DROP CONSTRAINT IF EXISTS meetings_status_check;

ALTER TABLE meetings
  ADD CONSTRAINT meetings_status_check
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'validated', 'cancelled', 'incomplete', 'never_started', 'timed_out'));
