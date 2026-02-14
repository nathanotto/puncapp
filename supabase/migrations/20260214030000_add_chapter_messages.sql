-- ============================================================================
-- CHAPTER MESSAGES TABLE
-- ============================================================================
-- Message board for chapter members to communicate with their group
-- ============================================================================

CREATE TABLE IF NOT EXISTS chapter_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text text NOT NULL CHECK (char_length(message_text) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited boolean NOT NULL DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chapter_messages_chapter_id
  ON chapter_messages(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_messages_created_at
  ON chapter_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapter_messages_user_id
  ON chapter_messages(user_id);

-- Enable RLS
ALTER TABLE chapter_messages ENABLE ROW LEVEL SECURITY;

-- Chapter members can view messages for their chapter
CREATE POLICY "Chapter members can view their chapter messages" ON chapter_messages
  FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id
      FROM chapter_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );

-- Active chapter members can create messages
CREATE POLICY "Chapter members can create messages" ON chapter_messages
  FOR INSERT
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id
      FROM chapter_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
    )
    AND user_id = auth.uid()
  );

-- Users can update their own messages within 24 hours
CREATE POLICY "Users can update their own messages within 24 hours" ON chapter_messages
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND created_at > now() - interval '24 hours'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND created_at > now() - interval '24 hours'
  );

-- Users can delete their own messages within 24 hours
-- Leaders can delete any message in their chapter
CREATE POLICY "Users can delete their own messages, leaders can delete any" ON chapter_messages
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND created_at > now() - interval '24 hours'
    OR
    chapter_id IN (
      SELECT chapter_id
      FROM chapter_memberships
      WHERE user_id = auth.uid()
        AND role IN ('leader', 'backup_leader')
        AND is_active = true
    )
  );
