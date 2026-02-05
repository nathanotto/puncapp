-- Enable real-time replication for attendance table
-- This allows the start meeting page to receive instant updates when members check in

DO $$
BEGIN
  -- Add attendance if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
  END IF;
END $$;
