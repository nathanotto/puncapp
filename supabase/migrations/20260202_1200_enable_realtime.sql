-- Enable real-time replication for attendance and meetings tables
-- This allows the app to receive instant updates when these tables change

ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
