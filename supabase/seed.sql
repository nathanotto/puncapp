-- PUNC Chapter Management - Quick Test Seed Data
-- This creates realistic test data for development/testing

-- INSTRUCTIONS:
-- 1. First, sign up through the app at http://localhost:3000/auth/signup
-- 2. After signing up, go to Supabase > Authentication > Users and copy your user ID
-- 3. Replace 'YOUR_USER_ID_HERE' below with your actual user ID
-- 4. Run this entire script in the Supabase SQL Editor

-- =====================================================
-- STEP 1: Update your user to be leader certified
-- =====================================================

-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from Supabase Auth
UPDATE users
SET leader_certified = true,
    leader_certification_date = NOW(),
    status = 'assigned'
WHERE id = 'YOUR_USER_ID_HERE';

-- =====================================================
-- STEP 2: Create Test Chapters
-- =====================================================

-- Create "The Oak Chapter" (your chapter)
INSERT INTO chapters (id, name, status, max_members, meeting_schedule, next_meeting_location, monthly_cost, current_balance, funding_status, funding_visibility)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'The Oak Chapter',
  'open',
  12,
  jsonb_build_object(
    'frequency', 'biweekly',
    'day_of_week', 6,
    'time', '10:00',
    'location', jsonb_build_object(
      'street', '123 Main St',
      'city', 'Austin',
      'state', 'TX',
      'zip', '78701'
    )
  ),
  jsonb_build_object(
    'street', '123 Main St',
    'city', 'Austin',
    'state', 'TX',
    'zip', '78701'
  ),
  55.00,
  120.00,
  'fully_funded',
  true
);

-- Create "The Willow Chapter" (another chapter for testing)
INSERT INTO chapters (id, name, status, max_members, meeting_schedule, next_meeting_location, monthly_cost, current_balance, funding_status, funding_visibility)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'The Willow Chapter',
  'open',
  12,
  jsonb_build_object(
    'frequency', 'monthly',
    'day_of_week', 0,
    'time', '14:00',
    'location', jsonb_build_object(
      'street', '456 Oak Ave',
      'city', 'Austin',
      'state', 'TX',
      'zip', '78702'
    )
  ),
  jsonb_build_object(
    'street', '456 Oak Ave',
    'city', 'Austin',
    'state', 'TX',
    'zip', '78702'
  ),
  55.00,
  30.00,
  'partially_funded',
  false
);

-- =====================================================
-- STEP 3: Add you as a member and leader
-- =====================================================

-- Add you to The Oak Chapter
INSERT INTO chapter_memberships (chapter_id, user_id, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'YOUR_USER_ID_HERE',
  true
);

-- Make you the Chapter Leader
INSERT INTO chapter_roles (chapter_id, user_id, role_type, assigned_by)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'YOUR_USER_ID_HERE',
  'Chapter Leader',
  'YOUR_USER_ID_HERE'
);

-- Set you as a contributing member
INSERT INTO chapter_member_types (chapter_id, user_id, member_type, upgraded_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'YOUR_USER_ID_HERE',
  'contributing',
  NOW()
);

-- =====================================================
-- STEP 4: Create Test Meetings
-- =====================================================

-- Upcoming meeting (this Saturday)
INSERT INTO meetings (chapter_id, scheduled_datetime, location, topic, status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  (DATE_TRUNC('week', NOW()) + INTERVAL '5 days' + INTERVAL '10 hours')::timestamptz,
  jsonb_build_object(
    'street', '123 Main St',
    'city', 'Austin',
    'state', 'TX',
    'zip', '78701'
  ),
  'Fear of Men',
  'scheduled'
);

-- Past completed meeting (2 weeks ago)
INSERT INTO meetings (id, chapter_id, scheduled_datetime, actual_datetime, location, duration_minutes, topic, status, validated_by, validated_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  NOW() - INTERVAL '2 weeks',
  NOW() - INTERVAL '2 weeks',
  jsonb_build_object(
    'street', '123 Main St',
    'city', 'Austin',
    'state', 'TX',
    'zip', '78701'
  ),
  90,
  'Relationships and Vulnerability',
  'completed',
  'YOUR_USER_ID_HERE',
  NOW() - INTERVAL '13 days'
);

-- =====================================================
-- STEP 5: Add Your Attendance
-- =====================================================

-- Add your attendance to the past meeting
INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type, checked_in_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'YOUR_USER_ID_HERE',
  'yes',
  'in_person',
  NOW() - INTERVAL '2 weeks'
);

-- Add your feedback for the past meeting
INSERT INTO meeting_feedback (meeting_id, user_id, value_rating, submitted_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'YOUR_USER_ID_HERE',
  9,
  NOW() - INTERVAL '13 days'
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify everything worked:

-- Check your user profile
-- SELECT * FROM users WHERE id = 'YOUR_USER_ID_HERE';

-- Check chapters
-- SELECT * FROM chapters;

-- Check your memberships
-- SELECT * FROM chapter_memberships WHERE user_id = 'YOUR_USER_ID_HERE';

-- Check your roles
-- SELECT * FROM chapter_roles WHERE user_id = 'YOUR_USER_ID_HERE';

-- Check meetings
-- SELECT * FROM meetings WHERE chapter_id = '11111111-1111-1111-1111-111111111111';

-- =====================================================
-- DONE!
-- =====================================================

-- Now refresh your dashboard at http://localhost:3000/dashboard
-- You should see:
-- - Status changed to "assigned" and "leader certified"
-- - Chapter information
-- - Upcoming meeting
-- - Past meeting attendance

