-- ============================================================================
-- SEED TEST DATA FOR RSVP FLOW
-- ============================================================================
-- NOTE: You MUST replace 'YOUR_USER_ID' with your actual auth.users id
-- Find it in: Supabase Dashboard → Authentication → Users
-- Copy your user's UUID and replace all instances of 'YOUR_USER_ID' below
-- ============================================================================

-- Create a test chapter
INSERT INTO chapters (id, name, status, meeting_frequency, meeting_day_of_week, meeting_time, meeting_location)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'The Oak Chapter',
  'open',
  'biweekly',
  6,  -- Saturday
  '09:00',
  '123 Main St, Austin, TX');

-- Make yourself a member (replace YOUR_USER_ID with your actual user UUID)
INSERT INTO chapter_memberships (chapter_id, user_id, role)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'YOUR_USER_ID',  -- ← REPLACE THIS
  'member');

-- Create a meeting 7 days from now
INSERT INTO meetings (id, chapter_id, scheduled_date, scheduled_time, location, status, rsvp_deadline)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  CURRENT_DATE + INTERVAL '7 days',
  '09:00',
  '123 Main St, Austin, TX',
  'scheduled',
  CURRENT_DATE + INTERVAL '5 days'  -- RSVP deadline 2 days before meeting
);

-- Create an attendance record (no RSVP yet)
INSERT INTO attendance (meeting_id, user_id, rsvp_status)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'YOUR_USER_ID',  -- ← REPLACE THIS
  'no_response');

-- Create the pending task for RSVP
INSERT INTO pending_tasks (task_type, assigned_to, related_entity_type, related_entity_id, metadata, due_at)
VALUES (
  'respond_to_rsvp',
  'YOUR_USER_ID',  -- ← REPLACE THIS
  'meeting',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  jsonb_build_object(
    'chapter_name', 'The Oak Chapter',
    'meeting_date', (CURRENT_DATE + INTERVAL '7 days')::text
  ),
  CURRENT_DATE + INTERVAL '5 days'  -- Due at RSVP deadline
);
