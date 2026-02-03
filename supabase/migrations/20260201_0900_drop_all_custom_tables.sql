-- ============================================================================
-- DROP ALL CUSTOM TABLES AND OBJECTS
-- ============================================================================
-- This migration removes all custom application tables, types, and functions
-- while preserving Supabase core functionality (auth, storage, etc.)
-- ============================================================================

-- Drop tables in reverse dependency order (children first, then parents)

-- Drop junction/dependent tables first
DROP TABLE IF EXISTS chapter_updates CASCADE;
DROP TABLE IF EXISTS chapter_funding CASCADE;
DROP TABLE IF EXISTS join_requests CASCADE;
DROP TABLE IF EXISTS meeting_curriculum CASCADE;
DROP TABLE IF EXISTS meeting_feedback CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS commitments CASCADE;
DROP TABLE IF EXISTS chapter_member_types CASCADE;
DROP TABLE IF EXISTS chapter_roles CASCADE;
DROP TABLE IF EXISTS chapter_memberships CASCADE;

-- Drop main entity tables
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS curriculum_modules CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom functions
DROP FUNCTION IF EXISTS exec_sql(text) CASCADE;
DROP FUNCTION IF EXISTS exec_sql(sql_query text) CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(
  user_id uuid,
  user_name text,
  user_phone text,
  user_email text,
  user_address text,
  user_username text,
  user_display_preference display_preference
) CASCADE;

-- Drop admin RPC functions (if they exist)
DROP FUNCTION IF EXISTS get_all_users() CASCADE;
DROP FUNCTION IF EXISTS get_all_chapters() CASCADE;
DROP FUNCTION IF EXISTS get_chapter_details(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_user_status(uuid, user_status) CASCADE;

-- Drop custom ENUM types
DROP TYPE IF EXISTS funding_status CASCADE;
DROP TYPE IF EXISTS attendance_type CASCADE;
DROP TYPE IF EXISTS rsvp_status CASCADE;
DROP TYPE IF EXISTS meeting_status CASCADE;
DROP TYPE IF EXISTS meeting_frequency CASCADE;
DROP TYPE IF EXISTS chapter_status CASCADE;
DROP TYPE IF EXISTS member_type CASCADE;
DROP TYPE IF EXISTS display_preference CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After this migration, only Supabase core schemas remain:
-- - auth.users (authentication)
-- - storage.* (file storage)
-- - realtime.* (realtime subscriptions)
-- - public schema should be empty of custom tables
-- ============================================================================
