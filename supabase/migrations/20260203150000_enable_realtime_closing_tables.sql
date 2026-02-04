-- Enable real-time replication for closing section tables

DO $$
BEGIN
  -- Add meeting_feedback if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'meeting_feedback'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE meeting_feedback;
  END IF;

  -- Add meeting_recordings if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'meeting_recordings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE meeting_recordings;
  END IF;
END $$;

-- Set replica identity FULL for realtime
ALTER TABLE meeting_feedback REPLICA IDENTITY FULL;
ALTER TABLE meeting_recordings REPLICA IDENTITY FULL;
