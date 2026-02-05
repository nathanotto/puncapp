-- Set replica identity to FULL for attendance table
-- This is required for realtime subscriptions to work with RLS policies
-- FULL sends all column values in change events, allowing RLS to evaluate policies

ALTER TABLE attendance REPLICA IDENTITY FULL;
