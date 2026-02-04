-- Create tester_state table
-- Track tester-specific settings like simulated role

CREATE TABLE IF NOT EXISTS tester_state (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,

  -- Role override for current chapter
  override_chapter_id uuid REFERENCES chapters(id),
  override_role text CHECK (override_role IN ('leader', 'backup_leader', 'member', 'scribe')),

  -- Any other tester state we need
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tester_state ENABLE ROW LEVEL SECURITY;

-- Only testers can access this
DROP POLICY IF EXISTS "Testers can manage own state" ON tester_state;

CREATE POLICY "Testers can manage own state" ON tester_state
  FOR ALL USING (user_id = auth.uid());
