-- FINAL ONE-TIME: Sync migration tracking with renamed files
-- Run this ONCE in Supabase SQL Editor

-- Clear old tracking
DELETE FROM supabase_migrations.schema_migrations;

-- Mark all existing migrations as applied (with proper timestamps)
INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES
  ('20260201090000', 'drop_all_custom_tables', ARRAY[]::text[]),
  ('20260201100000', 'create_pending_tasks', ARRAY[]::text[]),
  ('20260201110000', 'create_public_users', ARRAY[]::text[]),
  ('20260201120000', 'create_core_tables', ARRAY[]::text[]),
  ('20260201130000', 'add_pending_tasks_policies', ARRAY[]::text[]),
  ('20260201140000', 'seed_test_data', ARRAY[]::text[]),
  ('20260201150000', 'fix_chapter_memberships_policy', ARRAY[]::text[]),
  ('20260201160000', 'seed_oak_chapter_members', ARRAY[]::text[]),
  ('20260201170000', 'create_notification_log', ARRAY[]::text[]),
  ('20260201171000', 'create_meeting_agenda_items', ARRAY[]::text[]),
  ('20260201172000', 'add_attendance_tracking_fields', ARRAY[]::text[]),
  ('20260201173000', 'add_pending_tasks_urgency', ARRAY[]::text[]),
  ('20260202090000', 'add_meeting_start_fields', ARRAY[]::text[]),
  ('20260202091000', 'create_leadership_log', ARRAY[]::text[]),
  ('20260202120000', 'enable_realtime', ARRAY[]::text[]),
  ('20260202130000', 'add_meeting_duration', ARRAY[]::text[]),
  ('20260202131000', 'create_meeting_time_log', ARRAY[]::text[]),
  ('20260203090000', 'create_commitments', ARRAY[]::text[]),
  ('20260203091000', 'add_fullcheckin_fields', ARRAY[]::text[]);

-- After running this: supabase db push
-- Will ONLY apply the 2 NEW migrations (curriculum and closing tables)
