-- Session 4 Step 1: Add Meeting Start Fields to Database
-- Add fields to track meeting start, late flags, and scribe

-- Add fields to meetings table for tracking start time and late flag
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS actual_start_time timestamptz,
  ADD COLUMN IF NOT EXISTS started_late boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS scribe_id uuid REFERENCES public.users(id);

-- Add fields to attendance for late check-in tracking
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS checked_in_late boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS absence_note text;

-- Add helpful comments
COMMENT ON COLUMN meetings.actual_start_time IS 'Timestamp when Leader clicked "Start Meeting" (may differ from scheduled_time)';
COMMENT ON COLUMN meetings.started_late IS 'True if meeting started more than 10 minutes after scheduled time';
COMMENT ON COLUMN meetings.scribe_id IS 'User running the app during this meeting';
COMMENT ON COLUMN attendance.checked_in_late IS 'True if member checked in more than 10 minutes after meeting started';
COMMENT ON COLUMN attendance.absence_note IS 'Optional note for members who did not attend';
