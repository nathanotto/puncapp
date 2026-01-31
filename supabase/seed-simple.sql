-- Simple seed data using only Nathan's existing account
-- Creates chapters, meetings, and commitments for testing

-- Ensure Nathan exists and is certified
DO $$
DECLARE
  nathan_id UUID;
BEGIN
  SELECT id INTO nathan_id FROM users WHERE email = 'notto@nathanotto.com';

  IF nathan_id IS NULL THEN
    RAISE EXCEPTION 'Nathan Otto not found. Please sign up first at notto@nathanotto.com';
  END IF;

  -- Update Nathan to be leader certified
  UPDATE users
  SET status = 'assigned',
      leader_certified = true,
      leader_certification_date = NOW() - INTERVAL '6 months'
  WHERE id = nathan_id;

  -- ====================
  -- CURRICULUM MODULES
  -- ====================
  INSERT INTO curriculum_modules (id, title, description, category, punc_managed, order_index) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Fear of Men', 'Exploring how the fear of other men''s judgment holds us back from authentic connection and vulnerability.', 'fear', true, 1),
  ('a2222222-2222-2222-2222-222222222222', 'Addiction and Compulsive Behavior', 'Understanding the roots of addiction and building practices for freedom and self-control.', 'addiction', true, 2),
  ('a3333333-3333-3333-3333-333333333333', 'Relationships and Intimacy', 'Building deeper connections with partners, friends, and family through honest communication.', 'relationship', true, 3),
  ('a4444444-4444-4444-4444-444444444444', 'Anger and Rage', 'Unpacking anger, learning to feel it without causing harm, and channeling it constructively.', 'emotion', true, 4),
  ('a5555555-5555-5555-5555-555555555555', 'Purpose and Calling', 'Discovering what you''re meant to do and building a life around it.', 'purpose', true, 5),
  ('a6666666-6666-6666-6666-666666666666', 'Grief and Loss', 'Processing loss, honoring what was, and moving forward with integrity.', 'emotion', true, 6),
  ('a7777777-7777-7777-7777-777777777777', 'Shame and Vulnerability', 'Naming shame, practicing vulnerability, and building shame resilience.', 'emotion', true, 7),
  ('a8888888-8888-8888-8888-888888888888', 'Leadership and Responsibility', 'Taking ownership of your life and leading others with strength and humility.', 'leadership', true, 8)
  ON CONFLICT (id) DO NOTHING;

  -- ====================
  -- CHAPTERS
  -- ====================
  INSERT INTO chapters (id, name, status, max_members, meeting_schedule, next_meeting_location) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'The Oak Chapter',
    'open',
    12,
    jsonb_build_object(
      'frequency', 'biweekly',
      'day_of_week', 6,
      'time', '19:00',
      'location', jsonb_build_object('street', '1234 Oak Street', 'city', 'Denver', 'state', 'CO', 'zip', '80202')
    ),
    jsonb_build_object('street', '1234 Oak Street', 'city', 'Denver', 'state', 'CO', 'zip', '80202')
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'The Six Chapter',
    'open',
    12,
    jsonb_build_object(
      'frequency', 'biweekly',
      'day_of_week', 3,
      'time', '18:30',
      'location', jsonb_build_object('street', '3345 Chestnut Drive', 'city', 'Denver', 'state', 'CO', 'zip', '80213')
    ),
    jsonb_build_object('street', '3345 Chestnut Drive', 'city', 'Denver', 'state', 'CO', 'zip', '80213')
  )
  ON CONFLICT (id) DO NOTHING;

  -- ====================
  -- MEMBERSHIPS
  -- ====================
  INSERT INTO chapter_memberships (chapter_id, user_id, joined_at, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', nathan_id, NOW() - INTERVAL '10 months', true),
  ('22222222-2222-2222-2222-222222222222', nathan_id, NOW() - INTERVAL '9 months', true)
  ON CONFLICT DO NOTHING;

  -- ====================
  -- ROLES
  -- ====================
  INSERT INTO chapter_roles (chapter_id, user_id, role_type, assigned_at) VALUES
  ('11111111-1111-1111-1111-111111111111', nathan_id, 'Chapter Leader', NOW() - INTERVAL '10 months'),
  ('22222222-2222-2222-2222-222222222222', nathan_id, 'Backup Leader', NOW() - INTERVAL '9 months')
  ON CONFLICT DO NOTHING;

  -- ====================
  -- MEETINGS FOR THE OAK CHAPTER (21 meetings: 16 past, 5 upcoming)
  -- ====================
  FOR i IN 1..21 LOOP
    INSERT INTO meetings (
      chapter_id,
      scheduled_datetime,
      location,
      topic,
      curriculum_module_id,
      status
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      CASE
        WHEN i <= 16 THEN NOW() - INTERVAL '10 months' + (i * INTERVAL '2 weeks')
        ELSE NOW() + ((i - 16) * INTERVAL '2 weeks')
      END,
      jsonb_build_object('street', '1234 Oak Street', 'city', 'Denver', 'state', 'CO', 'zip', '80202'),
      CASE
        WHEN i % 8 = 1 THEN 'Fear of Men'
        WHEN i % 8 = 2 THEN 'Addiction and Compulsive Behavior'
        WHEN i % 8 = 3 THEN 'Relationships and Intimacy'
        WHEN i % 8 = 4 THEN 'Anger and Rage'
        WHEN i % 8 = 5 THEN 'Purpose and Calling'
        WHEN i % 8 = 6 THEN 'Grief and Loss'
        WHEN i % 8 = 7 THEN 'Shame and Vulnerability'
        ELSE 'Leadership and Responsibility'
      END,
      CASE
        WHEN i % 8 = 1 THEN 'a1111111-1111-1111-1111-111111111111'::UUID
        WHEN i % 8 = 2 THEN 'a2222222-2222-2222-2222-222222222222'::UUID
        WHEN i % 8 = 3 THEN 'a3333333-3333-3333-3333-333333333333'::UUID
        WHEN i % 8 = 4 THEN 'a4444444-4444-4444-4444-444444444444'::UUID
        WHEN i % 8 = 5 THEN 'a5555555-5555-5555-5555-555555555555'::UUID
        WHEN i % 8 = 6 THEN 'a6666666-6666-6666-6666-666666666666'::UUID
        WHEN i % 8 = 7 THEN 'a7777777-7777-7777-7777-777777777777'::UUID
        ELSE 'a8888888-8888-8888-8888-888888888888'::UUID
      END,
      CASE WHEN i <= 16 THEN 'completed'::meeting_status ELSE 'scheduled'::meeting_status END
    );

    -- Create attendance for Nathan
    INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type, checked_in_at)
    SELECT
      m.id,
      nathan_id,
      CASE WHEN i <= 16 THEN 'yes'::rsvp_status ELSE 'no_response'::rsvp_status END,
      CASE WHEN i <= 16 THEN 'in_person'::attendance_type ELSE 'absent'::attendance_type END,
      CASE WHEN i <= 16 THEN NOW() - INTERVAL '10 months' + (i * INTERVAL '2 weeks') ELSE NULL END
    FROM meetings m
    WHERE m.chapter_id = '11111111-1111-1111-1111-111111111111'
      AND m.scheduled_datetime = NOW() - INTERVAL '10 months' + (i * INTERVAL '2 weeks');

    -- Add feedback for completed meetings
    IF i <= 16 THEN
      INSERT INTO meeting_feedback (meeting_id, user_id, value_rating, submitted_at)
      SELECT
        m.id,
        nathan_id,
        FLOOR(7 + random() * 4)::INTEGER,
        NOW() - INTERVAL '10 months' + (i * INTERVAL '2 weeks') + INTERVAL '1 hour'
      FROM meetings m
      WHERE m.chapter_id = '11111111-1111-1111-1111-111111111111'
        AND m.scheduled_datetime = NOW() - INTERVAL '10 months' + (i * INTERVAL '2 weeks');
    END IF;
  END LOOP;

  -- ====================
  -- MEETINGS FOR THE SIX CHAPTER (21 meetings: 16 past, 5 upcoming)
  -- ====================
  FOR i IN 1..21 LOOP
    INSERT INTO meetings (
      chapter_id,
      scheduled_datetime,
      location,
      topic,
      curriculum_module_id,
      status
    ) VALUES (
      '22222222-2222-2222-2222-222222222222',
      CASE
        WHEN i <= 16 THEN NOW() - INTERVAL '9 months' + (i * INTERVAL '2 weeks')
        ELSE NOW() + ((i - 16) * INTERVAL '2 weeks')
      END,
      jsonb_build_object('street', '3345 Chestnut Drive', 'city', 'Denver', 'state', 'CO', 'zip', '80213'),
      CASE
        WHEN i % 8 = 1 THEN 'Fear of Men'
        WHEN i % 8 = 2 THEN 'Addiction and Compulsive Behavior'
        WHEN i % 8 = 3 THEN 'Relationships and Intimacy'
        WHEN i % 8 = 4 THEN 'Anger and Rage'
        WHEN i % 8 = 5 THEN 'Purpose and Calling'
        WHEN i % 8 = 6 THEN 'Grief and Loss'
        WHEN i % 8 = 7 THEN 'Shame and Vulnerability'
        ELSE 'Leadership and Responsibility'
      END,
      CASE
        WHEN i % 8 = 1 THEN 'a1111111-1111-1111-1111-111111111111'::UUID
        WHEN i % 8 = 2 THEN 'a2222222-2222-2222-2222-222222222222'::UUID
        WHEN i % 8 = 3 THEN 'a3333333-3333-3333-3333-333333333333'::UUID
        WHEN i % 8 = 4 THEN 'a4444444-4444-4444-4444-444444444444'::UUID
        WHEN i % 8 = 5 THEN 'a5555555-5555-5555-5555-555555555555'::UUID
        WHEN i % 8 = 6 THEN 'a6666666-6666-6666-6666-666666666666'::UUID
        WHEN i % 8 = 7 THEN 'a7777777-7777-7777-7777-777777777777'::UUID
        ELSE 'a8888888-8888-8888-8888-888888888888'::UUID
      END,
      CASE WHEN i <= 16 THEN 'completed'::meeting_status ELSE 'scheduled'::meeting_status END
    );

    -- Create attendance for Nathan
    INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type, checked_in_at)
    SELECT
      m.id,
      nathan_id,
      CASE WHEN i <= 16 THEN 'yes'::rsvp_status ELSE 'maybe'::rsvp_status END,
      CASE WHEN i <= 16 THEN 'in_person'::attendance_type ELSE 'absent'::attendance_type END,
      CASE WHEN i <= 16 THEN NOW() - INTERVAL '9 months' + (i * INTERVAL '2 weeks') ELSE NULL END
    FROM meetings m
    WHERE m.chapter_id = '22222222-2222-2222-2222-222222222222'
      AND m.scheduled_datetime = NOW() - INTERVAL '9 months' + (i * INTERVAL '2 weeks');

    -- Add feedback for completed meetings
    IF i <= 16 THEN
      INSERT INTO meeting_feedback (meeting_id, user_id, value_rating, submitted_at)
      SELECT
        m.id,
        nathan_id,
        FLOOR(8 + random() * 3)::INTEGER,
        NOW() - INTERVAL '9 months' + (i * INTERVAL '2 weeks') + INTERVAL '1 hour'
      FROM meetings m
      WHERE m.chapter_id = '22222222-2222-2222-2222-222222222222'
        AND m.scheduled_datetime = NOW() - INTERVAL '9 months' + (i * INTERVAL '2 weeks');
    END IF;
  END LOOP;

  -- ====================
  -- COMMITMENTS
  -- ====================

  -- Active stretch goal
  INSERT INTO commitments (chapter_id, made_by, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('11111111-1111-1111-1111-111111111111', nathan_id, 'stretch_goal',
    'Call my father every Sunday for the next month', NOW() + INTERVAL '30 days', 'pending', 'pending');

  -- Overdue stretch goal
  INSERT INTO commitments (chapter_id, made_by, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('11111111-1111-1111-1111-111111111111', nathan_id, 'stretch_goal',
    'Read one book about emotional intelligence', NOW() - INTERVAL '5 days', 'pending', 'pending');

  -- Completed volunteer activity
  INSERT INTO commitments (chapter_id, made_by, commitment_type, description, status, self_reported_status)
  VALUES ('11111111-1111-1111-1111-111111111111', nathan_id, 'volunteer_activity',
    'Volunteer at the local food bank for 4 hours', 'completed', 'completed');

  -- Help/favor request
  INSERT INTO commitments (chapter_id, made_by, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('11111111-1111-1111-1111-111111111111', nathan_id, 'help_favor',
    'Looking for recommendations on a good therapist in Denver', NOW() + INTERVAL '14 days', 'pending', 'pending');

  -- Six Chapter commitment
  INSERT INTO commitments (chapter_id, made_by, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('22222222-2222-2222-2222-222222222222', nathan_id, 'stretch_goal',
    'Have a difficult conversation with my partner about intimacy', NOW() + INTERVAL '14 days', 'pending', 'pending');

  -- Completed commitment in Six
  INSERT INTO commitments (chapter_id, made_by, commitment_type, description, status, self_reported_status)
  VALUES ('22222222-2222-2222-2222-222222222222', nathan_id, 'stretch_goal',
    'Attend three AA meetings this week', 'completed', 'completed');

END $$;
