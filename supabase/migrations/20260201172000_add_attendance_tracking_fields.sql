-- ============================================================================
-- ADD TRACKING FIELDS TO ATTENDANCE TABLE
-- ============================================================================
-- Track reminder status and leader outreach
-- ============================================================================

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS leader_outreach_logged_at timestamptz,
  ADD COLUMN IF NOT EXISTS leader_outreach_notes text,
  ADD COLUMN IF NOT EXISTS leader_outreach_by uuid REFERENCES public.users(id);
