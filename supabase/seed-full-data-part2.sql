-- Part 2: Meetings and Commitments
-- Run after seed-full-data.sql

-- =====================================================
-- 7. CREATE MEETINGS (18 for established, fewer for new)
-- =====================================================

-- Helper function to create meetings with attendance and feedback
DO $$
DECLARE
  nathan_id UUID;
  meeting_counter INTEGER;

  -- Chapter IDs
  oak_id UUID := '11111111-1111-1111-1111-111111111111';
  six_id UUID := '22222222-2222-2222-2222-222222222222';
  iron_id UUID := '33333333-3333-3333-3333-333333333333';
  mountain_id UUID := '44444444-4444-4444-4444-444444444444';
  phoenix_id UUID := '55555555-5555-5555-5555-555555555555';
  forge_id UUID := '66666666-6666-6666-6666-666666666666';
  wildwood_id UUID := '77777777-7777-7777-7777-777777777777';

  meeting_id UUID;
  member_id UUID;
  curriculum_ids UUID[] := ARRAY[
    'a1111111-1111-1111-1111-111111111111'::UUID,
    'a2222222-2222-2222-2222-222222222222'::UUID,
    'a3333333-3333-3333-3333-333333333333'::UUID,
    'a4444444-4444-4444-4444-444444444444'::UUID,
    'a5555555-5555-5555-5555-555555555555'::UUID,
    'a6666666-6666-6666-6666-666666666666'::UUID,
    'a7777777-7777-7777-7777-777777777777'::UUID,
    'a8888888-8888-8888-8888-888888888888'::UUID
  ];

BEGIN
  SELECT id INTO nathan_id FROM users WHERE email = 'notto@nathanotto.com';

  -- ====================
  -- THE OAK CHAPTER - 18 meetings (established for 10 months)
  -- ====================
  FOR meeting_counter IN 1..18 LOOP
    meeting_id := gen_random_uuid();

    INSERT INTO meetings (
      id,
      chapter_id,
      scheduled_datetime,
      location,
      topic,
      curriculum_module_id,
      status
    ) VALUES (
      meeting_id,
      oak_id,
      NOW() - INTERVAL '10 months' + (meeting_counter * INTERVAL '2 weeks'),
      jsonb_build_object('street', '1234 Oak Street', 'city', 'Denver', 'state', 'CO', 'zip', '80202'),
      CASE
        WHEN meeting_counter % 8 = 1 THEN 'Fear of Men'
        WHEN meeting_counter % 8 = 2 THEN 'Addiction and Compulsive Behavior'
        WHEN meeting_counter % 8 = 3 THEN 'Relationships and Intimacy'
        WHEN meeting_counter % 8 = 4 THEN 'Anger and Rage'
        WHEN meeting_counter % 8 = 5 THEN 'Purpose and Calling'
        WHEN meeting_counter % 8 = 6 THEN 'Grief and Loss'
        WHEN meeting_counter % 8 = 7 THEN 'Shame and Vulnerability'
        ELSE 'Leadership and Responsibility'
      END,
      curriculum_ids[(meeting_counter % 8) + 1],
      CASE WHEN meeting_counter <= 16 THEN 'completed' ELSE 'scheduled' END
    );

    -- Create attendance for all Oak Chapter members
    IF meeting_counter <= 16 THEN -- Past meetings
      FOR member_id IN (
        SELECT user_id FROM chapter_memberships WHERE chapter_id = oak_id AND is_active = true
      ) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type, checked_in_at) VALUES (
          meeting_id,
          member_id,
          'yes',
          CASE WHEN random() > 0.15 THEN 'in_person' ELSE 'video' END,
          NOW() - INTERVAL '10 months' + (meeting_counter * INTERVAL '2 weeks')
        );

        -- Some members submit feedback (80% participation)
        IF random() > 0.2 THEN
          INSERT INTO meeting_feedback (meeting_id, user_id, value_rating, submitted_at) VALUES (
            meeting_id,
            member_id,
            FLOOR(6 + random() * 5)::INTEGER, -- Rating between 6-10
            NOW() - INTERVAL '10 months' + (meeting_counter * INTERVAL '2 weeks') + INTERVAL '1 hour'
          );
        END IF;
      END LOOP;
    ELSE -- Upcoming meetings
      FOR member_id IN (
        SELECT user_id FROM chapter_memberships WHERE chapter_id = oak_id AND is_active = true
      ) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type) VALUES (
          meeting_id,
          member_id,
          CASE
            WHEN random() > 0.7 THEN 'yes'
            WHEN random() > 0.5 THEN 'maybe'
            WHEN random() > 0.3 THEN 'no'
            ELSE 'no_response'
          END,
          'absent'
        );
      END LOOP;
    END IF;
  END LOOP;

  -- ====================
  -- THE SIX CHAPTER - 18 meetings
  -- ====================
  FOR meeting_counter IN 1..18 LOOP
    meeting_id := gen_random_uuid();

    INSERT INTO meetings (
      id,
      chapter_id,
      scheduled_datetime,
      location,
      topic,
      curriculum_module_id,
      status
    ) VALUES (
      meeting_id,
      six_id,
      NOW() - INTERVAL '9 months' + (meeting_counter * INTERVAL '2 weeks'),
      jsonb_build_object('street', '3345 Chestnut Drive', 'city', 'Denver', 'state', 'CO', 'zip', '80213'),
      CASE
        WHEN meeting_counter % 8 = 1 THEN 'Fear of Men'
        WHEN meeting_counter % 8 = 2 THEN 'Addiction and Compulsive Behavior'
        WHEN meeting_counter % 8 = 3 THEN 'Relationships and Intimacy'
        WHEN meeting_counter % 8 = 4 THEN 'Anger and Rage'
        WHEN meeting_counter % 8 = 5 THEN 'Purpose and Calling'
        WHEN meeting_counter % 8 = 6 THEN 'Grief and Loss'
        WHEN meeting_counter % 8 = 7 THEN 'Shame and Vulnerability'
        ELSE 'Leadership and Responsibility'
      END,
      curriculum_ids[(meeting_counter % 8) + 1],
      CASE WHEN meeting_counter <= 16 THEN 'completed' ELSE 'scheduled' END
    );

    IF meeting_counter <= 16 THEN
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = six_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type, checked_in_at) VALUES (
          meeting_id, member_id, 'yes',
          CASE WHEN random() > 0.2 THEN 'in_person' ELSE 'video' END,
          NOW() - INTERVAL '9 months' + (meeting_counter * INTERVAL '2 weeks')
        );
        IF random() > 0.2 THEN
          INSERT INTO meeting_feedback (meeting_id, user_id, value_rating, submitted_at) VALUES (
            meeting_id, member_id, FLOOR(6 + random() * 5)::INTEGER,
            NOW() - INTERVAL '9 months' + (meeting_counter * INTERVAL '2 weeks') + INTERVAL '1 hour'
          );
        END IF;
      END LOOP;
    ELSE
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = six_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type) VALUES (
          meeting_id, member_id,
          CASE WHEN random() > 0.7 THEN 'yes' WHEN random() > 0.5 THEN 'maybe' WHEN random() > 0.3 THEN 'no' ELSE 'no_response' END,
          'absent'
        );
      END LOOP;
    END IF;
  END LOOP;

  -- ====================
  -- THE IRON BROTHERHOOD - 18 meetings
  -- ====================
  FOR meeting_counter IN 1..18 LOOP
    meeting_id := gen_random_uuid();

    INSERT INTO meetings (
      id, chapter_id, scheduled_datetime, location, topic, curriculum_module_id, status
    ) VALUES (
      meeting_id, iron_id,
      NOW() - INTERVAL '11 months' + (meeting_counter * INTERVAL '2 weeks'),
      jsonb_build_object('street', '8890 Dogwood Place', 'city', 'Denver', 'state', 'CO', 'zip', '80218'),
      CASE WHEN meeting_counter % 8 = 1 THEN 'Fear of Men' WHEN meeting_counter % 8 = 2 THEN 'Addiction and Compulsive Behavior'
        WHEN meeting_counter % 8 = 3 THEN 'Relationships and Intimacy' WHEN meeting_counter % 8 = 4 THEN 'Anger and Rage'
        WHEN meeting_counter % 8 = 5 THEN 'Purpose and Calling' WHEN meeting_counter % 8 = 6 THEN 'Grief and Loss'
        WHEN meeting_counter % 8 = 7 THEN 'Shame and Vulnerability' ELSE 'Leadership and Responsibility' END,
      curriculum_ids[(meeting_counter % 8) + 1],
      CASE WHEN meeting_counter <= 16 THEN 'completed' ELSE 'scheduled' END
    );

    IF meeting_counter <= 16 THEN
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = iron_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type, checked_in_at) VALUES (
          meeting_id, member_id, 'yes', CASE WHEN random() > 0.1 THEN 'in_person' ELSE 'video' END,
          NOW() - INTERVAL '11 months' + (meeting_counter * INTERVAL '2 weeks')
        );
        IF random() > 0.15 THEN
          INSERT INTO meeting_feedback (meeting_id, user_id, value_rating, submitted_at) VALUES (
            meeting_id, member_id, FLOOR(7 + random() * 4)::INTEGER,
            NOW() - INTERVAL '11 months' + (meeting_counter * INTERVAL '2 weeks') + INTERVAL '1 hour'
          );
        END IF;
      END LOOP;
    ELSE
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = iron_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type) VALUES (
          meeting_id, member_id,
          CASE WHEN random() > 0.6 THEN 'yes' WHEN random() > 0.4 THEN 'maybe' WHEN random() > 0.2 THEN 'no' ELSE 'no_response' END,
          'absent'
        );
      END LOOP;
    END IF;
  END LOOP;

  -- ====================
  -- THE MOUNTAIN CHAPTER - 10 meetings (6 months old)
  -- ====================
  FOR meeting_counter IN 1..10 LOOP
    meeting_id := gen_random_uuid();

    INSERT INTO meetings (
      id, chapter_id, scheduled_datetime, location, topic, curriculum_module_id, status
    ) VALUES (
      meeting_id, mountain_id,
      NOW() - INTERVAL '6 months' + (meeting_counter * INTERVAL '2 weeks'),
      jsonb_build_object('street', '2012 Summit Lane', 'city', 'Denver', 'state', 'CO', 'zip', '80230'),
      CASE WHEN meeting_counter % 8 = 1 THEN 'Fear of Men' WHEN meeting_counter % 8 = 2 THEN 'Addiction and Compulsive Behavior'
        WHEN meeting_counter % 8 = 3 THEN 'Relationships and Intimacy' WHEN meeting_counter % 8 = 4 THEN 'Anger and Rage'
        WHEN meeting_counter % 8 = 5 THEN 'Purpose and Calling' ELSE 'Grief and Loss' END,
      curriculum_ids[(meeting_counter % 6) + 1],
      CASE WHEN meeting_counter <= 8 THEN 'completed' ELSE 'scheduled' END
    );

    IF meeting_counter <= 8 THEN
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = mountain_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type, checked_in_at) VALUES (
          meeting_id, member_id, 'yes', CASE WHEN random() > 0.2 THEN 'in_person' ELSE 'video' END,
          NOW() - INTERVAL '6 months' + (meeting_counter * INTERVAL '2 weeks')
        );
        IF random() > 0.25 THEN
          INSERT INTO meeting_feedback (meeting_id, user_id, value_rating, submitted_at) VALUES (
            meeting_id, member_id, FLOOR(6 + random() * 5)::INTEGER,
            NOW() - INTERVAL '6 months' + (meeting_counter * INTERVAL '2 weeks') + INTERVAL '1 hour'
          );
        END IF;
      END LOOP;
    ELSE
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = mountain_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type) VALUES (
          meeting_id, member_id,
          CASE WHEN random() > 0.6 THEN 'yes' WHEN random() > 0.4 THEN 'maybe' ELSE 'no_response' END,
          'absent'
        );
      END LOOP;
    END IF;
  END LOOP;

  -- ====================
  -- THE PHOENIX RISING - 5 meetings (3 months old)
  -- ====================
  FOR meeting_counter IN 1..5 LOOP
    meeting_id := gen_random_uuid();

    INSERT INTO meetings (
      id, chapter_id, scheduled_datetime, location, topic, curriculum_module_id, status
    ) VALUES (
      meeting_id, phoenix_id,
      NOW() - INTERVAL '3 months' + (meeting_counter * INTERVAL '2 weeks'),
      jsonb_build_object('street', '9789 Ember Drive', 'city', 'Lakewood', 'state', 'CO', 'zip', '80226'),
      CASE WHEN meeting_counter = 1 THEN 'Fear of Men' WHEN meeting_counter = 2 THEN 'Addiction and Compulsive Behavior'
        WHEN meeting_counter = 3 THEN 'Relationships and Intimacy' WHEN meeting_counter = 4 THEN 'Anger and Rage'
        ELSE 'Purpose and Calling' END,
      curriculum_ids[meeting_counter],
      CASE WHEN meeting_counter <= 3 THEN 'completed' ELSE 'scheduled' END
    );

    IF meeting_counter <= 3 THEN
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = phoenix_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type, checked_in_at) VALUES (
          meeting_id, member_id, 'yes', 'in_person',
          NOW() - INTERVAL '3 months' + (meeting_counter * INTERVAL '2 weeks')
        );
        IF random() > 0.3 THEN
          INSERT INTO meeting_feedback (meeting_id, user_id, value_rating, submitted_at) VALUES (
            meeting_id, member_id, FLOOR(7 + random() * 4)::INTEGER,
            NOW() - INTERVAL '3 months' + (meeting_counter * INTERVAL '2 weeks') + INTERVAL '1 hour'
          );
        END IF;
      END LOOP;
    ELSE
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = phoenix_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type) VALUES (
          meeting_id, member_id, CASE WHEN random() > 0.5 THEN 'yes' ELSE 'maybe' END, 'absent'
        );
      END LOOP;
    END IF;
  END LOOP;

  -- ====================
  -- THE FORGE - 2 meetings (forming, 5 weeks old)
  -- ====================
  FOR meeting_counter IN 1..2 LOOP
    meeting_id := gen_random_uuid();

    INSERT INTO meetings (
      id, chapter_id, scheduled_datetime, location, topic, status
    ) VALUES (
      meeting_id, forge_id,
      NOW() - INTERVAL '5 weeks' + (meeting_counter * INTERVAL '2 weeks'),
      jsonb_build_object('street', '4123 Foundry Way', 'city', 'Aurora', 'state', 'CO', 'zip', '80010'),
      CASE WHEN meeting_counter = 1 THEN 'Getting to Know Each Other' ELSE 'Fear of Men' END,
      CASE WHEN meeting_counter = 1 THEN 'completed' ELSE 'scheduled' END
    );

    IF meeting_counter = 1 THEN
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = forge_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type, checked_in_at) VALUES (
          meeting_id, member_id, 'yes', 'in_person', NOW() - INTERVAL '5 weeks' + INTERVAL '2 weeks'
        );
      END LOOP;
    ELSE
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = forge_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type) VALUES (
          meeting_id, member_id, 'yes', 'absent'
        );
      END LOOP;
    END IF;
  END LOOP;

  -- ====================
  -- THE WILDWOOD - 2 meetings (forming, 4 weeks old)
  -- ====================
  FOR meeting_counter IN 1..2 LOOP
    meeting_id := gen_random_uuid();

    INSERT INTO meetings (
      id, chapter_id, scheduled_datetime, location, topic, status
    ) VALUES (
      meeting_id, wildwood_id,
      NOW() - INTERVAL '4 weeks' + (meeting_counter * INTERVAL '2 weeks'),
      jsonb_build_object('street', '7456 Forest Avenue', 'city', 'Arvada', 'state', 'CO', 'zip', '80001'),
      CASE WHEN meeting_counter = 1 THEN 'First Gathering' ELSE 'Fear of Men' END,
      CASE WHEN meeting_counter = 1 THEN 'completed' ELSE 'scheduled' END
    );

    IF meeting_counter = 1 THEN
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = wildwood_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type, checked_in_at) VALUES (
          meeting_id, member_id, 'yes', 'in_person', NOW() - INTERVAL '4 weeks' + INTERVAL '2 weeks'
        );
      END LOOP;
    ELSE
      FOR member_id IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = wildwood_id AND is_active = true) LOOP
        INSERT INTO attendance (meeting_id, user_id, rsvp_status, attendance_type) VALUES (
          meeting_id, member_id, CASE WHEN random() > 0.3 THEN 'yes' ELSE 'maybe' END, 'absent'
        );
      END LOOP;
    END IF;
  END LOOP;

END $$;

-- =====================================================
-- 8. CREATE COMMITMENTS (among chapter members only)
-- =====================================================

DO $$
DECLARE
  nathan_id UUID;
  chapter_members UUID[];
  member1 UUID;
  member2 UUID;
  recent_meeting UUID;

BEGIN
  SELECT id INTO nathan_id FROM users WHERE email = 'notto@nathanotto.com';

  -- ====================
  -- THE OAK CHAPTER COMMITMENTS
  -- ====================
  SELECT ARRAY_AGG(user_id) INTO chapter_members FROM chapter_memberships WHERE chapter_id = '11111111-1111-1111-1111-111111111111' AND is_active = true;
  SELECT id INTO recent_meeting FROM meetings WHERE chapter_id = '11111111-1111-1111-1111-111111111111' AND status = 'completed' ORDER BY scheduled_datetime DESC LIMIT 1;

  -- Nathan's stretch goal (active)
  INSERT INTO commitments (chapter_id, made_by, made_at_meeting, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('11111111-1111-1111-1111-111111111111', nathan_id, recent_meeting, 'stretch_goal',
    'Call my father every Sunday for the next month', NOW() + INTERVAL '30 days', 'pending', 'pending');

  -- Nathan's commitment to another member
  member1 := chapter_members[2]; -- Marcus Stone
  INSERT INTO commitments (chapter_id, made_by, recipient_id, made_at_meeting, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('11111111-1111-1111-1111-111111111111', nathan_id, member1, recent_meeting, 'to_member',
    'Help Marcus move his furniture next Saturday', NOW() + INTERVAL '7 days', 'pending', 'pending');

  -- Nathan's overdue stretch goal
  INSERT INTO commitments (chapter_id, made_by, made_at_meeting, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('11111111-1111-1111-1111-111111111111', nathan_id, recent_meeting, 'stretch_goal',
    'Read one book about emotional intelligence', NOW() - INTERVAL '5 days', 'pending', 'pending');

  -- Nathan's completed volunteer activity
  INSERT INTO commitments (chapter_id, made_by, made_at_meeting, commitment_type, description, status, self_reported_status)
  VALUES ('11111111-1111-1111-1111-111111111111', nathan_id, recent_meeting, 'volunteer_activity',
    'Volunteer at the local food bank for 4 hours', 'completed', 'completed');

  -- Commitment with discrepancy (Nathan says complete, recipient says pending)
  member2 := chapter_members[3]; -- David Rivers
  INSERT INTO commitments (chapter_id, made_by, recipient_id, made_at_meeting, commitment_type, description, deadline, status,
    self_reported_status, recipient_reported_status, discrepancy_flagged)
  VALUES ('11111111-1111-1111-1111-111111111111', nathan_id, member2, recent_meeting, 'to_member',
    'Fix the leak in David''s kitchen sink', NOW() - INTERVAL '2 days', 'pending', 'completed', 'pending', true);

  -- Other members' commitments
  member1 := chapter_members[2];
  INSERT INTO commitments (chapter_id, made_by, made_at_meeting, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('11111111-1111-1111-1111-111111111111', member1, recent_meeting, 'stretch_goal',
    'Go to the gym 3 times this week', NOW() + INTERVAL '7 days', 'pending', 'pending');

  member1 := chapter_members[4];
  member2 := chapter_members[5];
  INSERT INTO commitments (chapter_id, made_by, recipient_id, made_at_meeting, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('11111111-1111-1111-1111-111111111111', member1, member2, recent_meeting, 'to_member',
    'Review Michael''s resume and give feedback', NOW() + INTERVAL '10 days', 'pending', 'pending');

  -- ====================
  -- THE SIX CHAPTER COMMITMENTS
  -- ====================
  SELECT ARRAY_AGG(user_id) INTO chapter_members FROM chapter_memberships WHERE chapter_id = '22222222-2222-2222-2222-222222222222' AND is_active = true;
  SELECT id INTO recent_meeting FROM meetings WHERE chapter_id = '22222222-2222-2222-2222-222222222222' AND status = 'completed' ORDER BY scheduled_datetime DESC LIMIT 1;

  -- Nathan's commitments in The Six
  INSERT INTO commitments (chapter_id, made_by, made_at_meeting, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('22222222-2222-2222-2222-222222222222', nathan_id, recent_meeting, 'stretch_goal',
    'Have a difficult conversation with my partner about intimacy', NOW() + INTERVAL '14 days', 'pending', 'pending');

  member1 := chapter_members[2]; -- Thomas Steel
  INSERT INTO commitments (chapter_id, made_by, recipient_id, made_at_meeting, commitment_type, description, status, self_reported_status, recipient_reported_status)
  VALUES ('22222222-2222-2222-2222-222222222222', nathan_id, member1, recent_meeting, 'to_member',
    'Go hiking with Thomas and talk about grief', 'completed', 'completed', 'completed');

  -- Other members' commitments
  member1 := chapter_members[3];
  INSERT INTO commitments (chapter_id, made_by, made_at_meeting, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('22222222-2222-2222-2222-222222222222', member1, recent_meeting, 'volunteer_activity',
    'Volunteer at homeless shelter this weekend', NOW() + INTERVAL '5 days', 'pending', 'pending');

  -- ====================
  -- THE IRON BROTHERHOOD COMMITMENTS
  -- ====================
  SELECT ARRAY_AGG(user_id) INTO chapter_members FROM chapter_memberships WHERE chapter_id = '33333333-3333-3333-3333-333333333333' AND is_active = true;
  SELECT id INTO recent_meeting FROM meetings WHERE chapter_id = '33333333-3333-3333-3333-333333333333' AND status = 'completed' ORDER BY scheduled_datetime DESC LIMIT 1;

  FOR member1 IN (SELECT user_id FROM chapter_memberships WHERE chapter_id = '33333333-3333-3333-3333-333333333333' AND is_active = true ORDER BY random() LIMIT 5) LOOP
    INSERT INTO commitments (chapter_id, made_by, made_at_meeting, commitment_type, description, deadline, status, self_reported_status)
    VALUES ('33333333-3333-3333-3333-333333333333', member1, recent_meeting, 'stretch_goal',
      'Practice expressing anger in a healthy way this week', NOW() + INTERVAL '7 days', 'pending', 'pending');
  END LOOP;

  -- ====================
  -- OTHER CHAPTERS get 2-3 commitments each
  -- ====================

  -- Mountain Chapter
  SELECT ARRAY_AGG(user_id) INTO chapter_members FROM chapter_memberships WHERE chapter_id = '44444444-4444-4444-4444-444444444444' AND is_active = true;
  member1 := chapter_members[1];
  member2 := chapter_members[2];
  INSERT INTO commitments (chapter_id, made_by, made_at_meeting, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('44444444-4444-4444-4444-444444444444', member1, NULL, 'stretch_goal',
    'Meditate for 10 minutes every morning', NOW() + INTERVAL '21 days', 'pending', 'pending');

  INSERT INTO commitments (chapter_id, made_by, recipient_id, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('44444444-4444-4444-4444-444444444444', member1, member2, 'to_member',
    'Introduce Tyler to my therapist', NOW() + INTERVAL '14 days', 'pending', 'pending');

  -- Phoenix Rising
  SELECT ARRAY_AGG(user_id) INTO chapter_members FROM chapter_memberships WHERE chapter_id = '55555555-5555-5555-5555-555555555555' AND is_active = true;
  member1 := chapter_members[1];
  INSERT INTO commitments (chapter_id, made_by, commitment_type, description, deadline, status, self_reported_status)
  VALUES ('55555555-5555-5555-5555-555555555555', member1, 'help_favor',
    'Looking for recommendations on a good car mechanic in Lakewood', NOW() + INTERVAL '30 days', 'pending', 'pending');

END $$;
