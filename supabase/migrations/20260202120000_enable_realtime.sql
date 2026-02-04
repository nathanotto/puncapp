-- Enable real-time replication for meeting-related tables
-- This allows the app to receive instant updates when these tables change

ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_time_log;
ALTER PUBLICATION supabase_realtime ADD TABLE curriculum_responses;
