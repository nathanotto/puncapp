-- Quick Seed Data for Testing
-- Automatically uses notto@nathanotto.com

-- =====================================================
-- STEP 1: Get user ID and update profile
-- =====================================================

-- Make Nathan a leader certified user
UPDATE users
SET
  leader_certified = true,
  leader_certification_date = NOW(),
  status = 'assigned'
WHERE email = 'notto@nathanotto.com';

-- =====================================================
-- STEP 2: Create Test Chapter
-- =====================================================

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
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 3: Add Nathan as member and leader
-- =====================================================

-- Add to chapter
INSERT INTO chapter_memberships (chapter_id, user_id, is_active)
SELECT
  '11111111-1111-1111-1111-111111111111',
  id,
  true
FROM users
WHERE email = 'notto@nathanotto.com'
ON CONFLICT DO NOTHING;

-- Make Chapter Leader
INSERT INTO chapter_roles (chapter_id, user_id, role_type, assigned_by)
SELECT
  '11111111-1111-1111-1111-111111111111',
  id,
  'Chapter Leader',
  id
FROM users
WHERE email = 'notto@nathanotto.com'
ON CONFLICT DO NOTHING;

-- Make contributing member
INSERT INTO chapter_member_types (chapter_id, user_id, member_type, upgraded_at)
SELECT
  '11111111-1111-1111-1111-111111111111',
  id,
  'contributing',
  NOW()
FROM users
WHERE email = 'notto@nathanotto.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 4: Create Test Meetings
-- =====================================================

-- Upcoming meeting this Saturday
INSERT INTO meetings (id, chapter_id, scheduled_datetime, location, topic, status)
VALUES (
  '22222222-2222-2222-2222-222222222222',
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
)
ON CONFLICT (id) DO NOTHING;

-- Next meeting in 2 weeks
INSERT INTO meetings (id, chapter_id, scheduled_datetime, location, topic, status)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  (DATE_TRUNC('week', NOW()) + INTERVAL '19 days' + INTERVAL '10 hours')::timestamptz,
  jsonb_build_object(
    'street', '123 Main St',
    'city', 'Austin',
    'state', 'TX',
    'zip', '78701'
  ),
  'Relationships and Vulnerability',
  'scheduled'
)
ON CONFLICT (id) DO NOTHING;

-- Past completed meeting
INSERT INTO meetings (id, chapter_id, scheduled_datetime, actual_datetime, location, duration_minutes, topic, status, validated_by, validated_at)
SELECT
  '44444444-4444-4444-4444-444444444444',
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
  'Addiction and Recovery',
  'completed',
  id,
  NOW() - INTERVAL '13 days'
FROM users
WHERE email = 'notto@nathanotto.com'
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 5: Add Attendance
-- =====================================================

-- RSVP for upcoming meeting
INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type)
SELECT
  '22222222-2222-2222-2222-222222222222',
  id,
  'yes',
  'in_person'
FROM users
WHERE email = 'notto@nathanotto.com'
ON CONFLICT DO NOTHING;

-- Past meeting attendance
INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type, checked_in_at)
SELECT
  '44444444-4444-4444-4444-444444444444',
  id,
  'yes',
  'in_person',
  NOW() - INTERVAL '2 weeks'
FROM users
WHERE email = 'notto@nathanotto.com'
ON CONFLICT DO NOTHING;

-- Past meeting feedback
INSERT INTO meeting_feedback (meeting_id, user_id, value_rating, submitted_at)
SELECT
  '44444444-4444-4444-4444-444444444444',
  id,
  9,
  NOW() - INTERVAL '13 days'
FROM users
WHERE email = 'notto@nathanotto.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION - See what was created
-- =====================================================

SELECT
  'User Profile' as type,
  name,
  email,
  status,
  leader_certified
FROM users
WHERE email = 'notto@nathanotto.com';

SELECT
  'Chapter' as type,
  name,
  status,
  funding_status
FROM chapters
WHERE id = '11111111-1111-1111-1111-111111111111';

SELECT
  'Meetings' as type,
  COUNT(*) as count
FROM meetings
WHERE chapter_id = '11111111-1111-1111-1111-111111111111';

-- =====================================================
-- DONE!
-- =====================================================
-- Refresh your dashboard to see the changes!
