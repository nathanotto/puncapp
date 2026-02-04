-- ONE-TIME SCRIPT: Mark all manually-applied migrations as complete
-- Run this ONCE in Supabase SQL Editor, then supabase db push will work forever after

-- Clear any existing tracking
TRUNCATE supabase_migrations.schema_migrations;

-- Mark all existing migrations as applied
INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES
  ('20260201', '0900_drop_all_custom_tables', ARRAY[]::text[]),
  ('20260201', '1000_create_pending_tasks', ARRAY[]::text[]),
  ('20260201', '1100_create_public_users', ARRAY[]::text[]),
  ('20260201', '1200_create_core_tables', ARRAY[]::text[]),
  ('20260201', '1300_add_pending_tasks_policies', ARRAY[]::text[]),
  ('20260201', '1400_seed_test_data', ARRAY[]::text[]),
  ('20260201', '1500_fix_chapter_memberships_policy', ARRAY[]::text[]),
  ('20260201', '1600_seed_oak_chapter_members', ARRAY[]::text[]),
  ('20260201', '1700_create_notification_log', ARRAY[]::text[]),
  ('20260201', '1710_create_meeting_agenda_items', ARRAY[]::text[]),
  ('20260201', '1720_add_attendance_tracking_fields', ARRAY[]::text[]),
  ('20260201', '1730_add_pending_tasks_urgency', ARRAY[]::text[]),
  ('20260202', '0900_add_meeting_start_fields', ARRAY[]::text[]),
  ('20260202', '0910_create_leadership_log', ARRAY[]::text[]),
  ('20260202', '1200_enable_realtime', ARRAY[]::text[]),
  ('20260202', '1300_add_meeting_duration', ARRAY[]::text[]),
  ('20260202', '1310_create_meeting_time_log', ARRAY[]::text[]),
  ('20260203', '0900_create_commitments', ARRAY[]::text[]),
  ('20260203', '0910_add_fullcheckin_fields', ARRAY[]::text[]);

-- After running this, you can use: supabase db push
-- It will only apply NEW migrations (1000 and 1010 curriculum/closing)
