-- Meeting ratings and "most value" selections
CREATE TABLE IF NOT EXISTS meeting_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),

  -- Rating: 1-10, or null if "No response"
  value_rating integer CHECK (value_rating IS NULL OR (value_rating >= 1 AND value_rating <= 10)),
  skipped_rating boolean DEFAULT false,

  -- "Which man caused the most value for you?" (cannot be self)
  most_value_user_id uuid REFERENCES public.users(id),
  skipped_most_value boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),

  UNIQUE(meeting_id, user_id)
);

-- Meeting audio recordings
CREATE TABLE IF NOT EXISTS meeting_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

  -- Storage
  storage_path text NOT NULL, -- path in Supabase storage
  duration_seconds integer,
  file_size_bytes integer,

  -- Metadata
  recorded_by uuid NOT NULL REFERENCES public.users(id), -- the Scribe
  recorded_at timestamptz DEFAULT now(),

  UNIQUE(meeting_id) -- one recording per meeting
);

-- Enable RLS
ALTER TABLE meeting_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_feedback
DROP POLICY IF EXISTS "Users can view meeting feedback" ON meeting_feedback;
CREATE POLICY "Users can view meeting feedback" ON meeting_feedback
  FOR SELECT USING (
    meeting_id IN (
      SELECT meeting_id FROM attendance WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own feedback" ON meeting_feedback;
CREATE POLICY "Users can insert own feedback" ON meeting_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for meeting_recordings
DROP POLICY IF EXISTS "Users can view meeting recordings" ON meeting_recordings;
CREATE POLICY "Users can view meeting recordings" ON meeting_recordings
  FOR SELECT USING (
    meeting_id IN (
      SELECT meeting_id FROM attendance WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated can insert recordings" ON meeting_recordings;
CREATE POLICY "Authenticated can insert recordings" ON meeting_recordings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meeting_feedback_meeting ON meeting_feedback(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_feedback_most_value ON meeting_feedback(most_value_user_id)
  WHERE most_value_user_id IS NOT NULL;

-- Add completed_at to meetings table if not exists
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
