-- Session 9 Step 1: Database Schema Updates
-- Add fields for admin foundation, chapter management, and member management

-- Add location fields to users for geographic chapter formation
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS participation_score integer DEFAULT 0;

-- Add leader certification tracking
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_leader_certified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS leader_certified_at timestamptz,
  ADD COLUMN IF NOT EXISTS leader_certification_expires_at timestamptz;

-- Add flags to chapters for attention tracking
ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS needs_attention boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS attention_reason text,
  ADD COLUMN IF NOT EXISTS parent_chapter_id uuid REFERENCES chapters(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chapters_attention ON chapters(needs_attention) WHERE needs_attention = true;
CREATE INDEX IF NOT EXISTS idx_users_certification ON public.users(is_leader_certified) WHERE is_leader_certified = true;

-- Comment the new fields
COMMENT ON COLUMN public.users.address IS 'User physical address for geographic chapter formation';
COMMENT ON COLUMN public.users.phone IS 'User phone number for contact';
COMMENT ON COLUMN public.users.participation_score IS 'Calculated score based on meeting attendance and commitment completion';
COMMENT ON COLUMN public.users.is_leader_certified IS 'Whether user has completed leader certification';
COMMENT ON COLUMN public.users.leader_certified_at IS 'When user became leader certified';
COMMENT ON COLUMN public.users.leader_certification_expires_at IS 'When leader certification expires (if applicable)';
COMMENT ON COLUMN chapters.needs_attention IS 'Flag for PUNC admin to review this chapter';
COMMENT ON COLUMN chapters.attention_reason IS 'Reason why chapter needs admin attention';
COMMENT ON COLUMN chapters.parent_chapter_id IS 'Reference to parent chapter if this was created via split';
