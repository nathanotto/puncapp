-- ============================================================================
-- ENABLE REALTIME FOR CHAPTER MESSAGES
-- ============================================================================
-- Enable realtime updates for the chapter_messages table
-- ============================================================================

-- Enable replica identity for realtime to work properly
ALTER TABLE chapter_messages REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE chapter_messages;
