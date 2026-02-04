-- ============================================================================
-- ADD URGENCY FIELD TO PENDING TASKS
-- ============================================================================
-- Track escalation state on tasks
-- ============================================================================

ALTER TABLE pending_tasks
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'normal' CHECK (urgency IN ('normal', 'reminded', 'escalated'));
