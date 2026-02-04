-- Curriculum sequences (groups of modules, like courses)
CREATE TABLE IF NOT EXISTS curriculum_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Individual curriculum modules
CREATE TABLE IF NOT EXISTS curriculum_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  title text NOT NULL,
  principle text NOT NULL,
  description text NOT NULL,
  reflective_question text NOT NULL,
  exercise text NOT NULL,

  -- Sequence positioning
  sequence_id uuid REFERENCES curriculum_sequences(id),
  order_in_sequence integer DEFAULT 0,

  -- Status
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Chapter-level curriculum completion history
CREATE TABLE IF NOT EXISTS chapter_curriculum_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES curriculum_modules(id),
  meeting_id uuid NOT NULL REFERENCES meetings(id),
  completed_at timestamptz DEFAULT now(),

  UNIQUE(chapter_id, module_id, meeting_id)
);

-- Individual member responses to reflective questions
CREATE TABLE IF NOT EXISTS curriculum_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  chapter_curriculum_history_id uuid NOT NULL REFERENCES chapter_curriculum_history(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  meeting_id uuid NOT NULL REFERENCES meetings(id),
  module_id uuid NOT NULL REFERENCES curriculum_modules(id),

  -- The response (1500 char limit enforced in app)
  response text NOT NULL,

  created_at timestamptz DEFAULT now(),

  UNIQUE(meeting_id, module_id, user_id)
);

-- Enable RLS
ALTER TABLE curriculum_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_curriculum_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for curriculum_sequences
DROP POLICY IF EXISTS "Users can view curriculum sequences" ON curriculum_sequences;
CREATE POLICY "Users can view curriculum sequences" ON curriculum_sequences
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can manage curriculum sequences" ON curriculum_sequences;
CREATE POLICY "Authenticated can manage curriculum sequences" ON curriculum_sequences
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for curriculum_modules
DROP POLICY IF EXISTS "Users can view curriculum modules" ON curriculum_modules;
CREATE POLICY "Users can view curriculum modules" ON curriculum_modules
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can manage curriculum modules" ON curriculum_modules;
CREATE POLICY "Authenticated can manage curriculum modules" ON curriculum_modules
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for chapter_curriculum_history
DROP POLICY IF EXISTS "Users can view chapter curriculum history" ON chapter_curriculum_history;
CREATE POLICY "Users can view chapter curriculum history" ON chapter_curriculum_history
  FOR SELECT USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Authenticated can insert chapter curriculum history" ON chapter_curriculum_history;
CREATE POLICY "Authenticated can insert chapter curriculum history" ON chapter_curriculum_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for curriculum_responses
DROP POLICY IF EXISTS "Users can view own curriculum responses" ON curriculum_responses;
CREATE POLICY "Users can view own curriculum responses" ON curriculum_responses
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own curriculum responses" ON curriculum_responses;
CREATE POLICY "Users can insert own curriculum responses" ON curriculum_responses
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_curriculum_modules_sequence ON curriculum_modules(sequence_id, order_in_sequence);
CREATE INDEX IF NOT EXISTS idx_chapter_curriculum_history_chapter ON chapter_curriculum_history(chapter_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_responses_user ON curriculum_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_responses_meeting ON curriculum_responses(meeting_id);

-- Add selected curriculum to meetings
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS selected_curriculum_id uuid REFERENCES curriculum_modules(id);
