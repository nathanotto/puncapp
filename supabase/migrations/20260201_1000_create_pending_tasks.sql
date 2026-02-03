-- ============================================================================
-- CREATE PENDING TASKS TABLE
-- ============================================================================
-- Task-Oriented Design infrastructure for tracking user-assigned tasks
-- ============================================================================

create table pending_tasks (
  id uuid primary key default gen_random_uuid(),
  task_type text not null,
  assigned_to uuid references auth.users not null,
  related_entity_type text not null,
  related_entity_id uuid not null,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  due_at timestamptz,
  completed_at timestamptz,
  dismissed_at timestamptz
);

-- Index for fetching a user's pending tasks
create index idx_pending_tasks_user_pending
  on pending_tasks(assigned_to)
  where completed_at is null and dismissed_at is null;

-- Index for fetching tasks by related entity
create index idx_pending_tasks_entity
  on pending_tasks(related_entity_type, related_entity_id);

-- Enable Row Level Security
alter table pending_tasks enable row level security;

-- Policy: Users can see their own pending tasks
create policy "Users can view their own pending tasks"
  on pending_tasks
  for select
  using (auth.uid() = assigned_to);

-- Policy: Users can update their own pending tasks (mark as completed/dismissed)
create policy "Users can update their own pending tasks"
  on pending_tasks
  for update
  using (auth.uid() = assigned_to);

-- Note: INSERT will be done via server actions with service role
-- This allows the app to create tasks for users without giving users insert permission
