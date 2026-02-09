-- Session 10 Step 1: Database Schema Updates for Curriculum Management & Meeting Validation

-- Add fields to curriculum_modules
ALTER TABLE curriculum_modules
  ADD COLUMN IF NOT EXISTS assignment_text text,
  ADD COLUMN IF NOT EXISTS assignment_due_days integer DEFAULT 14,
  ADD COLUMN IF NOT EXISTS is_meeting_only boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add is_active to sequences
ALTER TABLE curriculum_sequences
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Junction table for modules in multiple sequences
CREATE TABLE IF NOT EXISTS curriculum_module_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES curriculum_modules(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES curriculum_sequences(id) ON DELETE CASCADE,
  order_in_sequence integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module_id, sequence_id)
);

-- Track member module completion
CREATE TABLE IF NOT EXISTS member_curriculum_completion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES curriculum_modules(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_id, meeting_id)
);

-- Meeting validation fields
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS leader_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS leader_validation_notes text,
  ADD COLUMN IF NOT EXISTS admin_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_validated_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS admin_validation_notes text,
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'awaiting_leader', 'awaiting_admin', 'approved', 'rejected'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_module_sequences_module ON curriculum_module_sequences(module_id);
CREATE INDEX IF NOT EXISTS idx_module_sequences_sequence ON curriculum_module_sequences(sequence_id);
CREATE INDEX IF NOT EXISTS idx_member_completion_user ON member_curriculum_completion(user_id);
CREATE INDEX IF NOT EXISTS idx_member_completion_module ON member_curriculum_completion(module_id);
CREATE INDEX IF NOT EXISTS idx_meetings_validation ON meetings(validation_status)
  WHERE validation_status IN ('awaiting_leader', 'awaiting_admin');
