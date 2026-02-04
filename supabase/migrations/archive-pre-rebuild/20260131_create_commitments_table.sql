-- Create commitments table for tracking member commitments

CREATE TABLE commitments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  made_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  made_at_meeting UUID REFERENCES meetings(id) ON DELETE SET NULL,
  commitment_type TEXT NOT NULL CHECK (commitment_type IN ('stretch_goal', 'to_member', 'volunteer_activity', 'help_favor')),
  description TEXT NOT NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'abandoned')),
  self_reported_status TEXT NOT NULL DEFAULT 'pending' CHECK (self_reported_status IN ('pending', 'completed', 'abandoned')),
  recipient_reported_status TEXT CHECK (recipient_reported_status IN ('pending', 'completed', 'abandoned')),
  discrepancy_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_commitments_chapter_id ON commitments(chapter_id);
CREATE INDEX idx_commitments_made_by ON commitments(made_by);
CREATE INDEX idx_commitments_recipient_id ON commitments(recipient_id);
CREATE INDEX idx_commitments_status ON commitments(status);
CREATE INDEX idx_commitments_discrepancy_flagged ON commitments(discrepancy_flagged);

-- Update timestamp trigger
CREATE TRIGGER update_commitments_updated_at
  BEFORE UPDATE ON commitments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view commitments they made
CREATE POLICY "Users can view their own commitments"
  ON commitments
  FOR SELECT
  USING (made_by = auth.uid());

-- Users can view commitments made to them
CREATE POLICY "Users can view commitments made to them"
  ON commitments
  FOR SELECT
  USING (recipient_id = auth.uid());

-- Users can view all commitments in their chapters
CREATE POLICY "Users can view commitments in their chapters"
  ON commitments
  FOR SELECT
  USING (chapter_id IN (SELECT user_chapters()));

-- Users can create commitments in their chapters
CREATE POLICY "Users can create commitments in their chapters"
  ON commitments
  FOR INSERT
  WITH CHECK (
    chapter_id IN (SELECT user_chapters())
    AND made_by = auth.uid()
  );

-- Users can update their own commitment status
CREATE POLICY "Users can update their own commitments"
  ON commitments
  FOR UPDATE
  USING (made_by = auth.uid())
  WITH CHECK (made_by = auth.uid());

-- Recipients can update recipient_reported_status
CREATE POLICY "Recipients can update status"
  ON commitments
  FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Leaders can update all commitments in their chapters
CREATE POLICY "Leaders can update commitments in their chapters"
  ON commitments
  FOR UPDATE
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_roles
      WHERE user_id = auth.uid()
      AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );

-- Leaders can delete commitments in their chapters
CREATE POLICY "Leaders can delete commitments"
  ON commitments
  FOR DELETE
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_roles
      WHERE user_id = auth.uid()
      AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );
