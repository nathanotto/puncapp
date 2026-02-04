-- Session 4 Step 2: Create Leadership Log Table
-- Track issues for PUNC admin review (late starts, late check-ins, uncontacted no-shows, etc.)

CREATE TABLE IF NOT EXISTS leadership_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL, -- the leader/member involved

  log_type text NOT NULL CHECK (log_type IN (
    'meeting_started_late',
    'member_checked_in_late',
    'uncontacted_no_show',
    'leader_absence',
    'other'
  )),

  description text NOT NULL,
  metadata jsonb DEFAULT '{}', -- additional context (e.g., how many minutes late)

  -- Resolution tracking (for PUNC admin)
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES public.users(id),
  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leadership_log ENABLE ROW LEVEL SECURITY;

-- Leaders can see their own chapter's log
CREATE POLICY IF NOT EXISTS "Leaders can view own chapter log" ON leadership_log
  FOR SELECT USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships
      WHERE user_id = auth.uid()
      AND role IN ('leader', 'backup_leader')
    )
  );

-- System inserts (for now, allow authenticated for testing)
CREATE POLICY IF NOT EXISTS "Authenticated users can insert leadership log" ON leadership_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Index for finding unresolved issues
CREATE INDEX IF NOT EXISTS idx_leadership_log_unresolved
  ON leadership_log(chapter_id, is_resolved)
  WHERE is_resolved = false;

-- Index for performance on chapter queries
CREATE INDEX IF NOT EXISTS idx_leadership_log_chapter_created
  ON leadership_log(chapter_id, created_at DESC);

-- Comments
COMMENT ON TABLE leadership_log IS 'Tracks chapter leadership issues for PUNC admin review and follow-up';
COMMENT ON COLUMN leadership_log.log_type IS 'Type of issue: meeting_started_late, member_checked_in_late, uncontacted_no_show, leader_absence, other';
COMMENT ON COLUMN leadership_log.metadata IS 'Additional context as JSON (e.g., {"minutes_late": 15})';
COMMENT ON COLUMN leadership_log.is_resolved IS 'Whether PUNC admin has addressed this issue';
