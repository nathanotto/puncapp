-- Set replica identity to FULL for realtime tables
-- This ensures realtime sends complete row data with change events

ALTER TABLE attendance REPLICA IDENTITY FULL;
ALTER TABLE meetings REPLICA IDENTITY FULL;
ALTER TABLE meeting_time_log REPLICA IDENTITY FULL;
ALTER TABLE curriculum_responses REPLICA IDENTITY FULL;
