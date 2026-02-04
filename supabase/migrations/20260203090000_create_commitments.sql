-- Create commitments table
CREATE TABLE IF NOT EXISTS commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who made the commitment
  committer_id uuid NOT NULL REFERENCES public.users(id),

  -- Type of commitment
  commitment_type text NOT NULL CHECK (commitment_type IN (
    'stretch_goal',
    'support_a_man',
    'chapter',
    'community',
    'self'
  )),

  -- The commitment itself
  description text NOT NULL,

  -- Optional receiver (for support_a_man type, or self-commitments)
  receiver_id uuid REFERENCES public.users(id),

  -- Optional chapter reference (for chapter commitments)
  chapter_id uuid REFERENCES chapters(id),

  -- Optional due date (triggers pending_task if set)
  due_date date,

  -- Status tracking
  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'completed',
    'replaced',  -- when a new stretch goal replaces the old one
    'expired'    -- past due date without completion
  )),

  -- Meeting context
  created_at_meeting_id uuid REFERENCES meetings(id),  -- where it was created
  completed_at_meeting_id uuid REFERENCES meetings(id), -- where it was completed (if applicable)

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;

-- Users can see commitments they made or received
CREATE POLICY IF NOT EXISTS "Users can view own commitments" ON commitments
  FOR SELECT USING (
    committer_id = auth.uid() OR
    receiver_id = auth.uid() OR
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can create commitments
CREATE POLICY IF NOT EXISTS "Users can create commitments" ON commitments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own commitments
CREATE POLICY IF NOT EXISTS "Users can update own commitments" ON commitments
  FOR UPDATE USING (committer_id = auth.uid());

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_commitments_committer ON commitments(committer_id, status);
CREATE INDEX IF NOT EXISTS idx_commitments_receiver ON commitments(receiver_id, status) WHERE receiver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commitments_stretch_goal ON commitments(committer_id, commitment_type, status)
  WHERE commitment_type = 'stretch_goal' AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_commitments_due_date ON commitments(due_date, status)
  WHERE due_date IS NOT NULL AND status = 'active';

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_commitment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER commitments_updated_at
  BEFORE UPDATE ON commitments
  FOR EACH ROW
  EXECUTE FUNCTION update_commitment_timestamp();

-- Function to create pending_task when commitment has a due date
CREATE OR REPLACE FUNCTION create_commitment_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create task if there's a due date
  IF NEW.due_date IS NOT NULL AND NEW.status = 'active' THEN
    INSERT INTO pending_tasks (
      task_type,
      assigned_to,
      related_entity_type,
      related_entity_id,
      due_date,
      metadata
    ) VALUES (
      'fulfill_commitment',
      NEW.committer_id,
      'commitment',
      NEW.id,
      NEW.due_date,
      jsonb_build_object(
        'commitment_type', NEW.commitment_type,
        'description', NEW.description,
        'receiver_id', NEW.receiver_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER commitment_task_trigger
  AFTER INSERT ON commitments
  FOR EACH ROW
  EXECUTE FUNCTION create_commitment_task();
