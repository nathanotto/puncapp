-- Chapter Lifecycle Requests Migration
-- Session 11: Formation, Split, and Dissolution requests

-- Chapter lifecycle requests table
CREATE TABLE IF NOT EXISTS chapter_lifecycle_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL CHECK (request_type IN ('formation', 'split', 'dissolution')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'withdrawn')),

  -- Who submitted
  submitted_by uuid NOT NULL REFERENCES public.users(id),
  submitted_at timestamptz,

  -- For split/dissolution: which chapter (null for formation)
  chapter_id uuid REFERENCES chapters(id),

  -- Request data (varies by type)
  request_data jsonb NOT NULL DEFAULT '{}',

  -- Review
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  review_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversation thread on requests
CREATE TABLE IF NOT EXISTS lifecycle_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES chapter_lifecycle_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Member opt-ins for formation and split
CREATE TABLE IF NOT EXISTS member_opt_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES chapter_lifecycle_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),

  -- Type of opt-in
  opt_in_type text NOT NULL CHECK (opt_in_type IN ('formation', 'split_existing', 'split_new')),

  -- For split: which chapter assignment to confirm
  proposed_assignment text CHECK (proposed_assignment IN ('original', 'new', 'both')),

  -- Response
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  confirmed_assignment text CHECK (confirmed_assignment IN ('original', 'new', 'both')),

  -- Confirmed contact info (for formation and split_new)
  confirmed_address text,
  confirmed_phone text,

  -- Timestamps
  notified_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),

  UNIQUE(request_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lifecycle_requests_status ON chapter_lifecycle_requests(status);
CREATE INDEX IF NOT EXISTS idx_lifecycle_requests_type ON chapter_lifecycle_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_lifecycle_requests_submitted_by ON chapter_lifecycle_requests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_lifecycle_requests_chapter ON chapter_lifecycle_requests(chapter_id) WHERE chapter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lifecycle_request_messages_request ON lifecycle_request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_opt_ins_request ON member_opt_ins(request_id);
CREATE INDEX IF NOT EXISTS idx_opt_ins_user ON member_opt_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_opt_ins_status ON member_opt_ins(status) WHERE status = 'pending';

-- Comments for documentation
COMMENT ON TABLE chapter_lifecycle_requests IS 'Requests for chapter formation, split, or dissolution';
COMMENT ON TABLE lifecycle_request_messages IS 'Conversation thread on lifecycle requests between leaders, members, and admins';
COMMENT ON TABLE member_opt_ins IS 'Member confirmations for formation and split requests';
