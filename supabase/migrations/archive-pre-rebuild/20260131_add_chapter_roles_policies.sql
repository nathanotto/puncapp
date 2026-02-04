-- Add RLS policies for chapter_roles table
-- These were missing from the initial schema

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON chapter_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view roles of members in their chapters
CREATE POLICY "Users can view chapter members' roles"
  ON chapter_roles
  FOR SELECT
  USING (
    chapter_id IN (SELECT user_chapters())
  );

-- Leaders can insert roles for their chapter
CREATE POLICY "Leaders can assign roles"
  ON chapter_roles
  FOR INSERT
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM chapter_roles
      WHERE user_id = auth.uid()
      AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );

-- Leaders can update roles in their chapter
CREATE POLICY "Leaders can update roles"
  ON chapter_roles
  FOR UPDATE
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_roles
      WHERE user_id = auth.uid()
      AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );

-- Leaders can delete roles in their chapter
CREATE POLICY "Leaders can delete roles"
  ON chapter_roles
  FOR DELETE
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_roles
      WHERE user_id = auth.uid()
      AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );
