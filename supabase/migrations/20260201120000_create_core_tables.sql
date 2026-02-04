-- ============================================================================
-- CREATE CORE TABLES FOR RSVP FLOW
-- ============================================================================
-- Chapters, Memberships, Meetings, Attendance
-- ============================================================================

-- Chapters: A group of men meeting regularly
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('forming', 'open', 'closed', 'splitting')),

  -- Recurring schedule
  meeting_frequency text CHECK (meeting_frequency IN ('weekly', 'biweekly', 'threeweekly', 'monthly')),
  meeting_day_of_week integer CHECK (meeting_day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  meeting_time time,
  meeting_location text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- For now, authenticated users can see all chapters
CREATE POLICY IF NOT EXISTS "Authenticated users can view chapters" ON chapters
  FOR SELECT USING (auth.role() = 'authenticated');

-- Chapter Memberships: Connecting users to chapters
CREATE TABLE IF NOT EXISTS chapter_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('member', 'leader', 'backup_leader', 'scribe')),
  member_type text DEFAULT 'regular' CHECK (member_type IN ('regular', 'contributing')),
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),

  UNIQUE(chapter_id, user_id)
);

ALTER TABLE chapter_memberships ENABLE ROW LEVEL SECURITY;

-- Members can see memberships in their chapters
CREATE POLICY IF NOT EXISTS "Users can view memberships in their chapters" ON chapter_memberships
  FOR SELECT USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships WHERE user_id = auth.uid()
    )
  );

-- Meetings: A scheduled chapter gathering
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  location text,

  meeting_type text DEFAULT 'standard' CHECK (meeting_type IN ('standard', 'special_consideration')),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'validated', 'cancelled')),

  -- For special consideration meetings
  topic text,
  description text,

  rsvp_deadline timestamptz, -- typically 2 days before meeting

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Members can see meetings for their chapters
CREATE POLICY IF NOT EXISTS "Users can view meetings in their chapters" ON meetings
  FOR SELECT USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships WHERE user_id = auth.uid()
    )
  );

-- Attendance: RSVPs and actual attendance
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- RSVP (before meeting)
  rsvp_status text CHECK (rsvp_status IN ('yes', 'no', 'maybe', 'no_response')),
  rsvp_reason text, -- required if rsvp_status = 'no'
  rsvp_at timestamptz,

  -- Actual attendance (during meeting)
  attendance_type text CHECK (attendance_type IN ('in_person', 'video', 'absent')),
  checked_in_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(meeting_id, user_id)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Members can see attendance for meetings in their chapters
CREATE POLICY IF NOT EXISTS "Users can view attendance in their chapters" ON attendance
  FOR SELECT USING (
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN chapter_memberships cm ON cm.chapter_id = m.chapter_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Users can insert/update their own attendance
CREATE POLICY IF NOT EXISTS "Users can manage own attendance" ON attendance
  FOR ALL USING (user_id = auth.uid());
