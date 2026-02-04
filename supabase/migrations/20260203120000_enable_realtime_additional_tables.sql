-- Enable real-time replication for meeting_time_log and curriculum_responses
-- This allows the meeting runner to receive instant updates

-- Only add if not already in publication (idempotent)
DO $$
BEGIN
  -- Add meeting_time_log if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'meeting_time_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE meeting_time_log;
  END IF;

  -- Add curriculum_responses if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'curriculum_responses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE curriculum_responses;
  END IF;
END $$;
