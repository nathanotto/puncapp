-- Create curriculum_modules table for PUNC official content and custom modules

CREATE TABLE curriculum_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- e.g., "relationship", "fear", "addiction", "emotion", "purpose", "leadership"
  exercises JSONB DEFAULT '[]'::jsonb,
  assignments JSONB DEFAULT '[]'::jsonb,
  commitment_prompts JSONB DEFAULT '[]'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  punc_managed BOOLEAN NOT NULL DEFAULT false, -- true for official PUNC curriculum
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_curriculum_modules_category ON curriculum_modules(category);
CREATE INDEX idx_curriculum_modules_punc_managed ON curriculum_modules(punc_managed);
CREATE INDEX idx_curriculum_modules_order_index ON curriculum_modules(order_index);

-- Update timestamp trigger
CREATE TRIGGER update_curriculum_modules_updated_at
  BEFORE UPDATE ON curriculum_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE curriculum_modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Everyone can view curriculum modules (they're public content)
CREATE POLICY "Anyone can view curriculum modules"
  ON curriculum_modules
  FOR SELECT
  USING (true);

-- Only PUNC admins can create/update/delete modules (for now, we'll allow all authenticated for testing)
-- In production, this would check for admin role
CREATE POLICY "Authenticated users can manage custom modules"
  ON curriculum_modules
  FOR ALL
  USING (punc_managed = false)
  WITH CHECK (punc_managed = false);

-- PUNC-managed modules can only be modified by admins (blocked for now)
-- When we add admin roles, we'll update this policy
