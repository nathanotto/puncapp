-- ============================================================================
-- CREATE NOTIFICATION LOG TABLE
-- ============================================================================
-- Records all notifications (simulated for now, real later)
-- ============================================================================

CREATE TABLE notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('email', 'sms')),
  purpose text NOT NULL, -- 'rsvp_reminder', 'task_created', 'meeting_reminder', etc.
  status text NOT NULL DEFAULT 'simulated' CHECK (status IN ('simulated', 'pending', 'sent', 'failed')),

  -- What would be / was sent
  subject text, -- for email
  content text NOT NULL,

  -- For linking to related entities
  related_entity_type text, -- 'meeting', 'task', etc.
  related_entity_id uuid,

  -- Tracking
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz,

  -- For future real sends
  external_id text, -- ID from Resend/Twilio
  error_message text
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Admins can see all (for now, let authenticated users see all for testing)
CREATE POLICY "Authenticated users can view notification log" ON notification_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- System inserts (service role), but for testing allow authenticated
CREATE POLICY "Authenticated users can insert notifications" ON notification_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
