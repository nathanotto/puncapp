-- ============================================================================
-- ADD 'curriculum' TO current_section CHECK CONSTRAINT
-- ============================================================================
-- The code references 'curriculum' as a valid section but it was missing
-- from the database constraint
-- ============================================================================

-- Drop the old check constraint
ALTER TABLE meetings
  DROP CONSTRAINT IF EXISTS meetings_current_section_check;

-- Add the new check constraint with 'curriculum' included
ALTER TABLE meetings
  ADD CONSTRAINT meetings_current_section_check
  CHECK (current_section IN (
    'not_started',
    'opening_meditation',
    'opening_ethos',
    'lightning_round',
    'full_checkins',
    'curriculum',
    'closing',
    'ended'
  ));
