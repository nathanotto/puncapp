-- ============================================================================
-- CREATE MEETING TIME LOG TABLE
-- ============================================================================
-- Track time spent in each meeting section and by each member
-- ============================================================================

CREATE TABLE IF NOT EXISTS meeting_time_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN (
    'opening_meditation',
    'opening_ethos',
    'lightning_round',
    'full_checkins',
    'closing'
  )),

  -- For lightning_round section, this is the member who is sharing
  -- For other sections, this is NULL
  member_user_id uuid REFERENCES users(id) ON DELETE SET NULL,

  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (ended_at - started_at))::integer
  ) STORED,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_meeting_time_log_meeting_id ON meeting_time_log(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_time_log_section ON meeting_time_log(section);
CREATE INDEX IF NOT EXISTS idx_meeting_time_log_member ON meeting_time_log(member_user_id);

-- RLS Policies
ALTER TABLE meeting_time_log ENABLE ROW LEVEL SECURITY;

-- Chapter members can view time logs for their chapter's meetings
CREATE POLICY IF NOT EXISTS "Chapter members can view meeting time logs"
  ON meeting_time_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN chapter_memberships cm ON cm.chapter_id = m.chapter_id
      WHERE m.id = meeting_time_log.meeting_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

-- Meeting runner can insert and update time logs
CREATE POLICY IF NOT EXISTS "Meeting runner can manage time logs"
  ON meeting_time_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN attendance a ON a.meeting_id = m.id
      WHERE m.id = meeting_time_log.meeting_id
        AND a.user_id = auth.uid()
        AND a.is_runner = true
        AND m.status = 'in_progress'
    )
  );
