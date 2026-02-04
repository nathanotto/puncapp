-- ============================================================================
-- ADD RLS POLICIES TO PENDING_TASKS
-- ============================================================================
-- Enable users to see and manage their own pending tasks
-- ============================================================================

-- Users can see their own pending tasks
CREATE POLICY IF NOT EXISTS "Users can view own pending tasks" ON pending_tasks
  FOR SELECT USING (assigned_to = auth.uid());

-- Users can update their own pending tasks (mark complete/dismissed)
CREATE POLICY IF NOT EXISTS "Users can update own pending tasks" ON pending_tasks
  FOR UPDATE USING (assigned_to = auth.uid());

-- System can insert tasks (we'll use service role for this)
-- For now, allow authenticated users to insert (simplifies seeding)
CREATE POLICY IF NOT EXISTS "Authenticated users can insert pending tasks" ON pending_tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
