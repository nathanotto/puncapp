-- Activity Log: records every meaningful action in the system
-- Retained for 12 months trailing; older rows should be archived or deleted

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- When it happened
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Who did it
  -- For user actions, this is the user's ID
  -- For system/automated actions, this is NULL (check actor_type)
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'admin', 'cron')),

  -- What happened (short, machine-readable verb)
  action text NOT NULL,

  -- What entity was affected
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,

  -- Which chapter this relates to (NULL for org-wide actions)
  chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,

  -- Human-readable summary (what you'd show in a feed)
  summary text NOT NULL,

  -- Rich detail blob for drill-down
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for common queries
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_chapter_id ON activity_log(chapter_id, created_at DESC);
CREATE INDEX idx_activity_log_actor_id ON activity_log(actor_id, created_at DESC);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_action ON activity_log(action, created_at DESC);

-- RLS: Admins can see everything. Members see their own chapter's log.
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity"
  ON activity_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_punc_admin = true)
  );

CREATE POLICY "Members can view own chapter activity"
  ON activity_log FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Insert policy: any authenticated user or service role can write
CREATE POLICY "Authenticated users can insert activity"
  ON activity_log FOR INSERT
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE activity_log IS 'System-wide activity log with 12-month retention. Records every meaningful action across meetings, members, funding, and admin operations.';
