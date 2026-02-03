-- ============================================================================
-- SEED OAK CHAPTER WITH 7 ADDITIONAL MEMBERS
-- ============================================================================
-- Creates a full chapter with varied RSVP responses
-- ============================================================================

-- Insert 7 new users into auth.users (trigger will auto-create public.users)
-- Note: We can't insert directly into auth.users via SQL in this way
-- Instead, we'll insert directly into public.users and create membership/attendance

-- Create 7 additional users in public.users
INSERT INTO public.users (id, email, name, created_at) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'marcus.chen@example.com', 'Marcus Chen', NOW()),
  ('a2222222-2222-2222-2222-222222222222', 'david.thompson@example.com', 'David Thompson', NOW()),
  ('a3333333-3333-3333-3333-333333333333', 'james.rodriguez@example.com', 'James Rodriguez', NOW()),
  ('a4444444-4444-4444-4444-444444444444', 'robert.kim@example.com', 'Robert Kim', NOW()),
  ('a5555555-5555-5555-5555-555555555555', 'michael.anderson@example.com', 'Michael Anderson', NOW()),
  ('a6666666-6666-6666-6666-666666666666', 'thomas.wright@example.com', 'Thomas Wright', NOW()),
  ('a7777777-7777-7777-7777-777777777777', 'christopher.lee@example.com', 'Christopher Lee', NOW());

-- Add all 7 as members of The Oak Chapter
INSERT INTO chapter_memberships (chapter_id, user_id, role, is_active) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a1111111-1111-1111-1111-111111111111', 'member', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a2222222-2222-2222-2222-222222222222', 'member', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a3333333-3333-3333-3333-333333333333', 'member', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a4444444-4444-4444-4444-444444444444', 'member', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a5555555-5555-5555-5555-555555555555', 'member', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a6666666-6666-6666-6666-666666666666', 'member', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a7777777-7777-7777-7777-777777777777', 'member', true);

-- Create attendance records for the upcoming meeting
-- Meeting ID: b2c3d4e5-f6a7-8901-bcde-f23456789012

-- 5 "Yes" responses
INSERT INTO attendance (meeting_id, user_id, rsvp_status, rsvp_at) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'a1111111-1111-1111-1111-111111111111', 'yes', NOW() - INTERVAL '2 days'),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'a2222222-2222-2222-2222-222222222222', 'yes', NOW() - INTERVAL '1 day'),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'a3333333-3333-3333-3333-333333333333', 'yes', NOW() - INTERVAL '3 days'),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'a4444444-4444-4444-4444-444444444444', 'yes', NOW() - INTERVAL '1 day'),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'a5555555-5555-5555-5555-555555555555', 'yes', NOW() - INTERVAL '4 hours');

-- 1 "No" response with reason
INSERT INTO attendance (meeting_id, user_id, rsvp_status, rsvp_reason, rsvp_at) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'a6666666-6666-6666-6666-666666666666', 'no', 'Child is sick', NOW() - INTERVAL '1 day');

-- 1 "No Response" (hasn't RSVPed yet)
INSERT INTO attendance (meeting_id, user_id, rsvp_status) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'a7777777-7777-7777-7777-777777777777', 'no_response');

-- Create pending task for Christopher Lee (the no response person)
INSERT INTO pending_tasks (task_type, assigned_to, related_entity_type, related_entity_id, metadata, due_at)
VALUES (
  'respond_to_rsvp',
  'a7777777-7777-7777-7777-777777777777',
  'meeting',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  jsonb_build_object(
    'chapter_name', 'The Oak Chapter',
    'meeting_date', (CURRENT_DATE + INTERVAL '7 days')::text
  ),
  CURRENT_DATE + INTERVAL '5 days'
);

-- Summary of The Oak Chapter RSVPs:
-- Total: 8 members
-- - You (Nathan): Yes (already responded)
-- - Marcus Chen: Yes
-- - David Thompson: Yes
-- - James Rodriguez: Yes
-- - Robert Kim: Yes
-- - Michael Anderson: Yes
-- - Thomas Wright: No ("Child is sick")
-- - Christopher Lee: No Response (has pending task)
