-- Add monthly_support field to chapters table
ALTER TABLE chapters ADD COLUMN monthly_support DECIMAL(10,2) NOT NULL DEFAULT 55.00;

-- Create chapter_funding table to track donations
CREATE TABLE chapter_funding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  funding_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_chapter_funding_chapter ON chapter_funding(chapter_id);
CREATE INDEX idx_chapter_funding_user ON chapter_funding(user_id);
CREATE INDEX idx_chapter_funding_date ON chapter_funding(funding_date);

-- Enable RLS
ALTER TABLE chapter_funding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_funding
-- Users can view funding for their own chapters
CREATE POLICY "Users can view funding for their chapters"
  ON chapter_funding FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can create funding records for any chapter
CREATE POLICY "Users can create funding records"
  ON chapter_funding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create chapter_updates table for message board
CREATE TABLE chapter_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chapter_updates_chapter ON chapter_updates(chapter_id);
CREATE INDEX idx_chapter_updates_created ON chapter_updates(created_at DESC);

-- Enable RLS
ALTER TABLE chapter_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_updates
-- Members can view updates for their chapters
CREATE POLICY "Members can view chapter updates"
  ON chapter_updates FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Members can create updates for their chapters
CREATE POLICY "Members can create chapter updates"
  ON chapter_updates FOR INSERT
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
