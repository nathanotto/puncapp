-- Seed commitment data for testing
-- Assumes The Oak Chapter exists with Nathan as a member

-- Get Nathan's user ID
DO $$
DECLARE
  nathan_id UUID;
  oak_chapter_id UUID;
  member2_id UUID;
  member3_id UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO nathan_id FROM users WHERE email = 'notto@nathanotto.com';
  SELECT id INTO oak_chapter_id FROM chapters WHERE name = 'The Oak Chapter';

  -- Get other members (if they exist, otherwise use Nathan for both)
  SELECT id INTO member2_id FROM users WHERE email != 'notto@nathanotto.com' LIMIT 1;
  SELECT id INTO member3_id FROM users WHERE email != 'notto@nathanotto.com' OFFSET 1 LIMIT 1;

  -- If no other members exist, use Nathan
  IF member2_id IS NULL THEN
    member2_id := nathan_id;
  END IF;
  IF member3_id IS NULL THEN
    member3_id := nathan_id;
  END IF;

  -- Create some commitments

  -- 1. Nathan's stretch goal (no recipient)
  INSERT INTO commitments (
    chapter_id,
    made_by,
    commitment_type,
    description,
    deadline,
    status,
    self_reported_status
  ) VALUES (
    oak_chapter_id,
    nathan_id,
    'stretch_goal',
    'Call my father every Sunday for the next month',
    NOW() + INTERVAL '30 days',
    'pending',
    'pending'
  );

  -- 2. Nathan's commitment to another member
  INSERT INTO commitments (
    chapter_id,
    made_by,
    recipient_id,
    commitment_type,
    description,
    deadline,
    status,
    self_reported_status,
    recipient_reported_status
  ) VALUES (
    oak_chapter_id,
    nathan_id,
    member2_id,
    'to_member',
    'Help John move his furniture next Saturday',
    NOW() + INTERVAL '7 days',
    'pending',
    'pending',
    NULL
  );

  -- 3. Overdue stretch goal
  INSERT INTO commitments (
    chapter_id,
    made_by,
    commitment_type,
    description,
    deadline,
    status,
    self_reported_status
  ) VALUES (
    oak_chapter_id,
    nathan_id,
    'stretch_goal',
    'Read one book about emotional intelligence',
    NOW() - INTERVAL '5 days',
    'pending',
    'pending'
  );

  -- 4. Completed volunteer activity
  INSERT INTO commitments (
    chapter_id,
    made_by,
    commitment_type,
    description,
    status,
    self_reported_status
  ) VALUES (
    oak_chapter_id,
    nathan_id,
    'volunteer_activity',
    'Volunteer at the local food bank for 4 hours',
    'completed',
    'completed'
  );

  -- 5. Commitment with discrepancy (Nathan says complete, recipient says pending)
  INSERT INTO commitments (
    chapter_id,
    made_by,
    recipient_id,
    commitment_type,
    description,
    deadline,
    status,
    self_reported_status,
    recipient_reported_status,
    discrepancy_flagged
  ) VALUES (
    oak_chapter_id,
    nathan_id,
    member3_id,
    'to_member',
    'Fix the leak in Mike''s kitchen sink',
    NOW() - INTERVAL '2 days',
    'pending',
    'completed',
    'pending',
    true
  );

  -- 6. Help/favor request
  INSERT INTO commitments (
    chapter_id,
    made_by,
    commitment_type,
    description,
    status,
    self_reported_status
  ) VALUES (
    oak_chapter_id,
    nathan_id,
    'help_favor',
    'Looking for recommendations on a good therapist in the area',
    'pending',
    'pending'
  );

  RAISE NOTICE 'Successfully created 6 commitments for testing';
END $$;
