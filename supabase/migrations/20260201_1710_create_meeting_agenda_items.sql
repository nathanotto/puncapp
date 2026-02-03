-- ============================================================================
-- CREATE MEETING AGENDA ITEMS TABLE
-- ============================================================================
-- Auto-generated items (like "check in about non-responder") go here
-- ============================================================================

CREATE TABLE meeting_agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

  item_type text NOT NULL CHECK (item_type IN ('housekeeping', 'follow_up', 'custom')),
  title text NOT NULL,
  notes text,

  -- For auto-generated items, link to source
  source_type text, -- 'unresponsive_member_outreach', 'commitment_discrepancy', etc.
  source_entity_id uuid,
  related_user_id uuid REFERENCES public.users(id), -- the member this is about

  -- Status
  is_addressed boolean DEFAULT false,
  addressed_at timestamptz,

  created_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_agenda_items ENABLE ROW LEVEL SECURITY;

-- Members can see agenda items for their chapter's meetings
CREATE POLICY "Users can view agenda items in their chapters" ON meeting_agenda_items
  FOR SELECT USING (
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN chapter_memberships cm ON cm.chapter_id = m.chapter_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Leaders can insert/update (for now, allow authenticated for testing)
CREATE POLICY "Authenticated users can manage agenda items" ON meeting_agenda_items
  FOR ALL USING (auth.role() = 'authenticated');
