-- Drop remaining tables that weren't cleaned up
DROP TABLE IF EXISTS chapter_updates CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;

-- Also clean up any remaining types that might not have been dropped
DROP TYPE IF EXISTS funding_status CASCADE;
DROP TYPE IF EXISTS attendance_type CASCADE;
DROP TYPE IF EXISTS rsvp_status CASCADE;
DROP TYPE IF EXISTS meeting_status CASCADE;
DROP TYPE IF EXISTS meeting_frequency CASCADE;
DROP TYPE IF EXISTS chapter_status CASCADE;
DROP TYPE IF EXISTS member_type CASCADE;
DROP TYPE IF EXISTS display_preference CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
