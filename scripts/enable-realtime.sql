-- Enable real-time replication for attendance and meetings tables

-- Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;

-- Verify what tables are in the publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
