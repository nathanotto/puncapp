# PUNCapp Session 1: Task-Oriented Design Infrastructure

## Context

I'm rebuilding PUNCapp using Task-Oriented Design (TOD). This is a fresh start—ignore any existing code patterns that conflict with TOD principles.

---

## Step 0: Clear the Decks (Safely)

Before building anything new, we need to preserve your existing work and create a clean starting point.

### 0A: Create a Git Branch (Do This Yourself First)

In your terminal (not Claude Code), run:

```bash
cd /path/to/puncapp

# Make sure everything is committed on main
git status
git add -A
git commit -m "Preserve pre-TOD version"

# Create and switch to new branch
git checkout -b tod-rebuild

# Push the branch so it exists on GitHub
git push -u origin tod-rebuild
```

**Your safety net is now in place.** The `main` branch has your old code. You can always `git checkout main` to get back to it.

### 0B: Keep Vercel Simple

**Don't change anything in Vercel yet.** 

Vercel will auto-deploy the `tod-rebuild` branch to a preview URL (something like `puncapp-tod-rebuild-yourname.vercel.app`). That's fine for testing.

Only after TOD is working and you're happy with it would you point the production domain at this branch (by merging to main or changing the production branch in Vercel settings).

**For now: just work on the branch. Vercel handles itself.**

### 0C: Reset the Application Code

Now, with Claude Code, clean out the old code but keep the infrastructure:

**DELETE these directories/files** (application code):
- `/app/*` (all routes and pages) — BUT KEEP `/app/layout.tsx` and `/app/globals.css`
- `/components/*` (all components)
- Any `/lib/*` files EXCEPT database/supabase connection utilities
- Any `/actions/*` or `/server/*` directories

**KEEP these** (infrastructure):
- `/lib/supabase/*` or however your Supabase client is configured
- `next.config.js`
- `tailwind.config.js`
- `package.json` and `package-lock.json`
- `.env.local` (your environment variables)
- `tsconfig.json`
- Any `/public` assets you want to keep

**KEEP BUT EMPTY** (we'll rebuild):
- `/app/layout.tsx` — keep the basic shell, remove any nav/sidebar components that reference deleted code
- `/app/page.tsx` — replace with a simple "PUNCapp - TOD Rebuild" placeholder

### 0D: Reset the Database Tables

You have two options:

**Option 1: Drop and recreate (cleanest)**

In Supabase SQL Editor, run:
```sql
-- List all tables you created (not Supabase system tables)
-- Then drop them. Example:
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS commitments CASCADE;
DROP TABLE IF EXISTS chapter_memberships CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
-- etc.

-- Keep auth.users (Supabase manages this)
-- Keep any Supabase system tables
```

**Option 2: Keep tables, just truncate data**

If you want to preserve the table structures and just clear data:
```sql
TRUNCATE attendance, meetings, commitments, chapter_memberships, chapters RESTART IDENTITY CASCADE;
```

**Recommendation:** Option 1 (drop tables). TOD may need slightly different table structures, and starting fresh avoids schema debt.

### 0E: Verify Clean Slate

After cleanup, verify:

1. `npm run dev` starts without errors (you may see "page not found" for routes—that's fine)
2. Your Supabase connection still works (test in a simple page if needed)
3. `git status` shows your deletions
4. Commit the clean slate:

```bash
git add -A
git commit -m "Clean slate for TOD rebuild"
git push
```

**You now have:**
- `main` branch: your old app, safe and untouched
- `tod-rebuild` branch: clean slate, ready for TOD infrastructure
- Supabase: connected, empty (or schema-ready)
- Vercel: auto-deploying preview builds of your branch

---

## Primary References (in priority order)

1. **TOD-SPECIFICATION.md** — Defines WHAT we're building. Task flows are the source of truth. Every feature starts here.
2. **CLAUDE-CODE-GUIDE.md** — Defines HOW to implement. Component patterns, server actions, infrastructure.
3. **SPECIFICATION.md** — Reference ONLY for field-level details (data types, validation rules). Do NOT use this to drive architecture.

## The TOD Principle

Every user-facing screen must answer four questions:
1. **What am I being asked to do?** (The Prompt)
2. **What do I need to know to do it?** (The Context)  
3. **How do I do it?** (The Action)
4. **Did it work, and what happens next?** (The Confirmation)

If a screen doesn't clearly answer all four, it's not done.

## Session 1 Goal: Build Task Infrastructure

Before building any features, we need the infrastructure that all tasks will use. This session establishes the foundation.

### Step 1: Create the Task UI Components

Create these components following the patterns in CLAUDE-CODE-GUIDE.md:

**`/components/task/TaskScreen.tsx`**
- Props: prompt (title, subtitle), context (ReactNode), primaryAction, secondaryActions
- States: idle, loading, success, error
- When success: renders TaskConfirmation instead of the form
- Clean, minimal styling—this is the shell every task uses

**`/components/task/TaskPrompt.tsx`**
- Renders the title and subtitle
- Large, clear, imperative tone
- This tells the user what they're being asked to do

**`/components/task/TaskContext.tsx`**
- Wrapper for the context section
- Consistent padding/styling for the "what you need to know" area

**`/components/task/TaskActions.tsx`**
- Primary action button (prominent)
- Secondary actions (available but not competing)
- Loading state on primary button
- Disabled state support

**`/components/task/TaskConfirmation.tsx`**
- Props: result (success, message, consequence, nextStep, downstream)
- Shows: checkmark/icon, message, consequence, downstream effects, next step link/text
- This is what users see after completing a task—it's critical for the "it worked and it mattered" feeling

**`/components/task/TaskError.tsx`**
- For when task execution fails
- Shows what went wrong
- Offers retry option

**`/components/task/TaskNotAvailable.tsx`**
- For when user navigates to a task they can't perform
- Shows why (e.g., "This meeting hasn't started yet")
- Suggests what to do instead

### Step 2: Create the Task Result Utility

**`/lib/task-utils.ts`**

```typescript
export interface ActionResult {
  success: boolean;
  message: string;           // What happened
  consequence: string;       // What it means
  nextStep?: {
    description: string;     // What to do next (or "Nothing more needed")
    href?: string;           // Link to next task (if applicable)
    label?: string;          // Button label for next task
  };
  downstream?: string[];     // What tasks were triggered for others
}

export function createTaskResult(result: Partial<ActionResult> & { success: boolean; message: string; consequence: string }): ActionResult {
  return {
    success: result.success,
    message: result.message,
    consequence: result.consequence,
    nextStep: result.nextStep,
    downstream: result.downstream,
  };
}
```

### Step 3: Create the Pending Tasks Table

Using Supabase, create the `pending_tasks` table:

```sql
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
```

### Step 4: Create the Task Queue Utilities

**`/lib/task-queue.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';

export interface NewPendingTask {
  taskType: string;
  assignedTo: string;           // user id
  relatedEntityType: string;    // e.g., 'meeting', 'commitment'
  relatedEntityId: string;
  metadata?: Record<string, any>;
  dueAt?: Date;
}

export async function createPendingTasks(tasks: NewPendingTask[]) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('pending_tasks')
    .insert(tasks.map(t => ({
      task_type: t.taskType,
      assigned_to: t.assignedTo,
      related_entity_type: t.relatedEntityType,
      related_entity_id: t.relatedEntityId,
      metadata: t.metadata || {},
      due_at: t.dueAt?.toISOString(),
    })))
    .select();
    
  if (error) throw error;
  return data;
}

export async function completeTask(taskId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('pending_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', taskId);
    
  if (error) throw error;
}

export async function getUserPendingTasks(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('pending_tasks')
    .select('*')
    .eq('assigned_to', userId)
    .is('completed_at', null)
    .is('dismissed_at', null)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return data;
}

export function describeTask(task: { task_type: string; metadata?: any }): string {
  // Human-readable descriptions of downstream tasks
  const descriptions: Record<string, (meta: any) => string> = {
    'respond_to_rsvp': (m) => `RSVP request sent to member`,
    'confirm_commitment': (m) => `Confirmation request sent to ${m?.recipientName || 'recipient'}`,
    'review_application': (m) => `Application queued for leader review`,
    // Add more as we build tasks
  };
  
  const describer = descriptions[task.task_type];
  return describer ? describer(task.metadata) : `Task created: ${task.task_type}`;
}
```

### Step 5: Create the Pending Tasks Dashboard Component

**`/components/task/PendingTasksList.tsx`**

A component that shows a user their pending tasks. This goes on their dashboard.

- Fetches pending tasks for current user
- Shows task type, related entity info, due date if present
- Links to the task screen for each
- Empty state: "No pending tasks. Nice!"

For now, the task type to URL mapping can be a simple switch statement—we'll expand it as we build tasks.

### Step 6: Create a Test Task Page

Create a simple test page at `/app/tasks/test/page.tsx` that demonstrates the TaskScreen component working:

- A fake task with hardcoded prompt, context, and action
- The action should wait 1 second (simulate API call) then return a success result
- Confirm the TaskConfirmation renders correctly with message, consequence, and downstream

This proves the infrastructure works before we build real tasks.

## What NOT To Do in Session 1

- Don't build any real features (meetings, RSVPs, etc.)
- Don't create the full data model yet
- Don't build navigation or layouts beyond what's needed to test
- Don't worry about authentication (use a hardcoded user ID for now)
- Don't optimize or add bells and whistles

## Success Criteria

Session 1 is complete when:

1. ✅ TaskScreen component renders prompt, context, and actions
2. ✅ Clicking the primary action shows loading state
3. ✅ After action completes, TaskConfirmation appears with all fields
4. ✅ pending_tasks table exists in Supabase
5. ✅ createPendingTasks and getUserPendingTasks work
6. ✅ PendingTasksList component renders (even if empty)
7. ✅ Test task page demonstrates the full flow

## Next Session Preview

Once this infrastructure is solid, Session 2 will build the first real task:

**[TASK: Respond to Meeting RSVP]** from TOD-SPECIFICATION.md Flow 1

This will be our proof that the TOD approach works end-to-end with real data.

---

**Remember: The task is the unit of work. Everything serves the task.**
