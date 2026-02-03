-- Add attendance table to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- Verify both tables are now included
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
