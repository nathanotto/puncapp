-- ============================================================================
-- ADD MEETING DURATION AND CURRENT SECTION TRACKING
-- ============================================================================
-- Track meeting duration and what section the meeting is currently in
-- ============================================================================

-- Add default meeting duration (2 hours = 120 minutes)
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 120,
  ADD COLUMN IF NOT EXISTS current_section text CHECK (current_section IN (
    'not_started',
    'opening_meditation',
    'opening_ethos',
    'lightning_round',
    'full_checkins',
    'closing',
    'ended'
  )) DEFAULT 'not_started';

-- Update existing meetings to have the default section
UPDATE meetings
  SET current_section = 'not_started'
  WHERE current_section IS NULL;

-- When a meeting is started, set to opening_meditation
-- (This will be handled by the start meeting flow in the future)
