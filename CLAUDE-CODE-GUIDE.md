# PUNC App: Claude Code Implementation Guide
## Task-Oriented Design Patterns

**Use this document alongside TOD-SPECIFICATION.md**

This guide provides actionable patterns and rules for implementing Task-Oriented Design in the PUNC app. When building any feature, consult this first.

---

## The Golden Rule

**Every user-facing screen must answer these four questions:**

1. **What am I being asked to do?** (The Prompt)
2. **What do I need to know to do it?** (The Context)
3. **How do I do it?** (The Action)
4. **Did it work, and what happens next?** (The Confirmation)

If a screen doesn't clearly answer all four, it's not done.

---

## Task Screen Template

Use this structure for every task screen:

```tsx
// /app/tasks/[flow]/[task]/page.tsx

import { TaskScreen } from '@/components/task/TaskScreen';

export default async function TaskPage({ params, searchParams }) {
  // 1. Load context data
  const context = await loadTaskContext(params);
  
  // 2. Check preconditions (is this task valid for this user right now?)
  if (!canPerformTask(context)) {
    return <TaskNotAvailable reason={context.blockingReason} />;
  }
  
  return (
    <TaskScreen
      prompt={{
        title: "Schedule your next chapter meeting",
        subtitle: "Based on your recurring schedule"
      }}
      context={<MeetingScheduleContext {...context} />}
      primaryAction={{
        label: "Schedule Meeting",
        action: scheduleMeeting,
        // Action should be a server action or API call
      }}
      secondaryActions={[
        { label: "Change schedule", href: "/settings/schedule" }
      ]}
    />
  );
}
```

---

## Component Patterns

### TaskScreen Component

```tsx
// /components/task/TaskScreen.tsx

interface TaskScreenProps {
  prompt: {
    title: string;
    subtitle?: string;
  };
  context: React.ReactNode;
  primaryAction: {
    label: string;
    action: () => Promise<ActionResult>;
    disabled?: boolean;
    destructive?: boolean;
  };
  secondaryActions?: Array<{
    label: string;
    href?: string;
    action?: () => Promise<void>;
  }>;
}

export function TaskScreen({ 
  prompt, 
  context, 
  primaryAction, 
  secondaryActions 
}: TaskScreenProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ActionResult | null>(null);

  async function handlePrimaryAction() {
    setState('loading');
    try {
      const result = await primaryAction.action();
      setResult(result);
      setState('success');
    } catch (error) {
      setState('error');
    }
  }

  if (state === 'success' && result) {
    return <TaskConfirmation result={result} />;
  }

  return (
    <div className="task-screen">
      <TaskPrompt {...prompt} />
      <TaskContext>{context}</TaskContext>
      <TaskActions
        primary={primaryAction}
        secondary={secondaryActions}
        loading={state === 'loading'}
        onPrimaryClick={handlePrimaryAction}
      />
      {state === 'error' && <TaskError onRetry={handlePrimaryAction} />}
    </div>
  );
}
```

### TaskConfirmation Component

```tsx
// /components/task/TaskConfirmation.tsx

interface ActionResult {
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

export function TaskConfirmation({ result }: { result: ActionResult }) {
  return (
    <div className="task-confirmation">
      <div className="confirmation-icon">
        {result.success ? <CheckCircle /> : <AlertCircle />}
      </div>
      
      <h2 className="confirmation-message">{result.message}</h2>
      
      <p className="confirmation-consequence">{result.consequence}</p>
      
      {result.downstream && result.downstream.length > 0 && (
        <div className="confirmation-downstream">
          <p className="text-sm text-muted">This triggered:</p>
          <ul>
            {result.downstream.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      
      {result.nextStep && (
        <div className="confirmation-next">
          {result.nextStep.href ? (
            <Link href={result.nextStep.href} className="btn-primary">
              {result.nextStep.label || 'Continue'}
            </Link>
          ) : (
            <p className="text-muted">{result.nextStep.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Server Action Pattern

Every task action should follow this pattern:

```typescript
// /app/tasks/[flow]/[task]/actions.ts
'use server';

import { createTaskResult } from '@/lib/task-utils';
import { createPendingTasks } from '@/lib/task-queue';

export async function performTask(formData: FormData): Promise<ActionResult> {
  // 1. Authenticate
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  
  // 2. Validate input
  const data = validateTaskInput(formData);
  
  // 3. Check preconditions
  const entity = await getEntity(data.entityId);
  if (!canTransition(entity, 'target_state')) {
    return createTaskResult({
      success: false,
      message: "Can't do that right now",
      consequence: `This ${entity.type} is ${entity.status}, not ${requiredStatus}`,
    });
  }
  
  // 4. Execute the action
  await db.transaction(async (tx) => {
    // Update entity state
    await tx.update(entities).set({ status: 'new_status' }).where(...);
    
    // Record the transition
    await tx.insert(entityTransitions).values({
      entityId: entity.id,
      fromStatus: entity.status,
      toStatus: 'new_status',
      triggeredBy: user.id,
      triggeredAt: new Date(),
    });
  });
  
  // 5. Trigger downstream tasks
  const downstream = await createPendingTasks([
    {
      taskType: 'respond_to_rsvp',
      assignedTo: member.userId,
      relatedEntity: { type: 'meeting', id: meeting.id },
      dueAt: meeting.rsvpDeadline,
    },
    // ... more downstream tasks
  ]);
  
  // 6. Send notifications
  await sendNotifications(downstream);
  
  // 7. Return result with confirmation details
  return createTaskResult({
    success: true,
    message: 'Meeting scheduled',
    consequence: `RSVPs will go out to ${memberCount} members`,
    nextStep: {
      description: 'Nothing more needed until responses come in',
    },
    downstream: downstream.map(t => describeTask(t)),
  });
}
```

---

## Task Queue System

### Schema

```sql
create table pending_tasks (
  id uuid primary key default gen_random_uuid(),
  task_type text not null,           -- e.g., 'respond_to_rsvp'
  assigned_to uuid references users not null,
  related_entity_type text not null, -- e.g., 'meeting'
  related_entity_id uuid not null,
  metadata jsonb default '{}',       -- task-specific data
  created_at timestamptz default now(),
  due_at timestamptz,
  completed_at timestamptz,
  dismissed_at timestamptz
);

create index idx_pending_tasks_user on pending_tasks(assigned_to) 
  where completed_at is null and dismissed_at is null;
```

### Creating Pending Tasks

```typescript
// /lib/task-queue.ts

export async function createPendingTasks(tasks: NewPendingTask[]) {
  const created = await db.insert(pendingTasks).values(tasks).returning();
  
  // Queue notifications for each task
  for (const task of created) {
    await queueTaskNotification(task);
  }
  
  return created;
}

export async function completeTask(taskId: string) {
  await db.update(pendingTasks)
    .set({ completedAt: new Date() })
    .where(eq(pendingTasks.id, taskId));
}
```

### Showing Pending Tasks to Users

```tsx
// /components/task/PendingTasksList.tsx

export async function PendingTasksList({ userId }: { userId: string }) {
  const tasks = await db.query.pendingTasks.findMany({
    where: and(
      eq(pendingTasks.assignedTo, userId),
      isNull(pendingTasks.completedAt),
      isNull(pendingTasks.dismissedAt)
    ),
    orderBy: [asc(pendingTasks.dueAt), asc(pendingTasks.createdAt)]
  });
  
  if (tasks.length === 0) {
    return <EmptyState message="No pending tasks. Nice!" />;
  }
  
  return (
    <div className="pending-tasks">
      <h3>Tasks waiting for you</h3>
      {tasks.map(task => (
        <PendingTaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
```

---

## State Machine Enforcement

### Defining State Machines

```typescript
// /lib/state-machines/meeting.ts

export const meetingStateMachine = {
  states: ['scheduled', 'in_progress', 'completed', 'validated', 'cancelled'],
  
  transitions: {
    scheduled: {
      start: 'in_progress',
      cancel: 'cancelled',
    },
    in_progress: {
      end: 'completed',
    },
    completed: {
      validate: 'validated',
    },
    // No transitions from validated or cancelled
  },
  
  guards: {
    validate: (meeting: Meeting) => {
      if (!meeting.actualEnd) return { allowed: false, reason: 'Meeting has no end time' };
      if (meeting.attendanceCount === 0) return { allowed: false, reason: 'No attendance recorded' };
      return { allowed: true };
    },
  },
};

export function canTransition(
  meeting: Meeting, 
  action: keyof typeof meetingStateMachine.transitions[string]
): { allowed: boolean; reason?: string } {
  const currentState = meeting.status;
  const allowedTransitions = meetingStateMachine.transitions[currentState];
  
  if (!allowedTransitions || !(action in allowedTransitions)) {
    return { 
      allowed: false, 
      reason: `Cannot ${action} a meeting that is ${currentState}` 
    };
  }
  
  // Check guards
  const guard = meetingStateMachine.guards[action];
  if (guard) {
    return guard(meeting);
  }
  
  return { allowed: true };
}
```

### Using State Machines in Actions

```typescript
export async function validateMeeting(meetingId: string) {
  const meeting = await getMeeting(meetingId);
  
  const transition = canTransition(meeting, 'validate');
  if (!transition.allowed) {
    return createTaskResult({
      success: false,
      message: "Can't validate this meeting",
      consequence: transition.reason,
    });
  }
  
  // Proceed with validation...
}
```

---

## Notification Templates

### Template Structure

```typescript
// /lib/notifications/templates.ts

export const notificationTemplates = {
  respond_to_rsvp: {
    subject: (ctx) => `RSVP needed: ${ctx.chapterName} meeting on ${ctx.meetingDate}`,
    body: (ctx) => `
      You're invited to ${ctx.chapterName}'s next meeting.
      
      📅 ${ctx.meetingDate} at ${ctx.meetingTime}
      📍 ${ctx.location}
      
      Please respond by ${ctx.rsvpDeadline}.
    `,
    cta: {
      label: 'Respond Now',
      href: (ctx) => `/tasks/meeting-cycle/respond-to-rsvp?meeting=${ctx.meetingId}`,
    },
  },
  
  confirm_commitment: {
    subject: (ctx) => `${ctx.makerName} says they completed their commitment to you`,
    body: (ctx) => `
      ${ctx.makerName} marked this commitment as complete:
      
      "${ctx.commitmentDescription}"
      
      Do you agree it's complete?
    `,
    cta: {
      label: 'Confirm or Dispute',
      href: (ctx) => `/tasks/commitments/confirm?commitment=${ctx.commitmentId}`,
    },
  },
  
  // ... more templates
};
```

---

## Context Loading Patterns

### Loading Task Context

```typescript
// /lib/task-context.ts

// Each task type has a context loader
export const taskContextLoaders = {
  schedule_meeting: async (userId: string, params: any) => {
    const membership = await getUserChapterMembership(userId, params.chapterId);
    if (!membership || membership.role !== 'leader') {
      return { authorized: false, reason: 'Only leaders can schedule meetings' };
    }
    
    const chapter = await getChapter(params.chapterId);
    const lastMeeting = await getLastMeeting(params.chapterId);
    const conflicts = await getMemberConflicts(params.chapterId);
    
    return {
      authorized: true,
      chapter,
      lastMeeting,
      conflicts,
      suggestedDate: calculateNextMeetingDate(chapter.schedule, lastMeeting),
    };
  },
  
  respond_to_rsvp: async (userId: string, params: any) => {
    const meeting = await getMeeting(params.meetingId);
    const membership = await getUserChapterMembership(userId, meeting.chapterId);
    
    if (!membership) {
      return { authorized: false, reason: 'Not a member of this chapter' };
    }
    
    const existingRsvp = await getUserRsvp(userId, meeting.id);
    const pendingCommitments = await getUserPendingCommitments(userId, meeting.chapterId);
    
    return {
      authorized: true,
      meeting,
      existingRsvp,
      pendingCommitments,
      deadline: meeting.rsvpDeadline,
    };
  },
  
  // ... more loaders
};
```

---

## Error Handling

### Task Errors vs System Errors

```typescript
// Task error: user can understand and potentially fix
return createTaskResult({
  success: false,
  message: "Can't check in yet",
  consequence: "The meeting hasn't started. Ask your leader to start it.",
  nextStep: {
    description: "Wait for the meeting to start",
  },
});

// System error: something went wrong internally
try {
  // ... action
} catch (error) {
  console.error('Task failed:', error);
  return createTaskResult({
    success: false,
    message: "Something went wrong",
    consequence: "We couldn't complete this action. Please try again.",
    nextStep: {
      description: "If this keeps happening, contact support",
    },
  });
}
```

---

## Testing Tasks

### Test Structure

```typescript
// __tests__/tasks/schedule-meeting.test.ts

describe('Schedule Meeting Task', () => {
  describe('Context Loading', () => {
    it('loads chapter, last meeting, and suggested date', async () => {
      // ...
    });
    
    it('rejects non-leaders', async () => {
      // ...
    });
  });
  
  describe('Action Execution', () => {
    it('creates meeting with correct status', async () => {
      // ...
    });
    
    it('creates pending RSVP tasks for all members', async () => {
      // ...
    });
    
    it('sends notifications to all members', async () => {
      // ...
    });
  });
  
  describe('Confirmation', () => {
    it('returns member count in consequence', async () => {
      // ...
    });
    
    it('lists downstream tasks', async () => {
      // ...
    });
  });
});
```

---

## Checklist: Before Shipping a Task

- [ ] **Prompt is clear**: User immediately knows what they're being asked
- [ ] **Context is sufficient**: All info needed to decide is present
- [ ] **Context is minimal**: No extra info cluttering the screen
- [ ] **Primary action is obvious**: One clear thing to do
- [ ] **Secondary actions don't compete**: Available but not distracting
- [ ] **Loading state exists**: User sees something while context loads
- [ ] **Error state is helpful**: User knows what went wrong and what to do
- [ ] **Confirmation is complete**: Message + consequence + next step
- [ ] **Downstream tasks created**: Other users' tasks are queued
- [ ] **Notifications sent**: Users know they have tasks waiting
- [ ] **State transitions enforced**: Invalid transitions are blocked
- [ ] **Audit trail exists**: Transitions are logged with who/when

---

## Quick Reference: Task Types in PUNC

| Task Type | Actor | Trigger | Flow |
|-----------|-------|---------|------|
| `schedule_meeting` | Leader | Time/manual | Meeting Cycle |
| `respond_to_rsvp` | Member | Meeting scheduled | Meeting Cycle |
| `check_in_to_meeting` | Member | Meeting started | Meeting Cycle |
| `update_attendance` | Scribe | Member arrives | Meeting Cycle |
| `record_lightning_round` | Scribe | Meeting started | Meeting Cycle |
| `create_commitment` | Member | Curriculum complete | Meeting Cycle |
| `close_meeting` | Leader | Ready to end | Meeting Cycle |
| `validate_meeting` | Leader | Meeting complete | Meeting Cycle |
| `rate_meeting` | Member | Meeting ended | Meeting Cycle |
| `apply_to_chapter` | New User | Found chapter | Onboarding |
| `review_application` | Leader | Application received | Onboarding |
| `update_commitment` | Member | Any time | Commitment |
| `confirm_commitment` | Recipient | Maker marks complete | Commitment |
| `resolve_discrepancy` | Leader | Recipient disputes | Commitment |
| `donate_to_chapter` | Contributing | Any time | Funding |
| `request_special_consideration` | Member | Issue needs discussion | Special Consideration |
| `call_special_consideration` | Leader/Backup | Decides to call or approves request | Special Consideration |
| `run_special_consideration` | Leader/Backup + Scribe | Meeting time | Special Consideration |
| `close_special_consideration` | Leader/Backup | Discussion complete | Special Consideration |
| `initiate_chapter_split` | Leader | Special Consideration approved | Chapter Split |
| `choose_new_leader` | Members | Split complete | Chapter Split |

---

*Keep this guide open while building. When in doubt, refer to TOD-SPECIFICATION.md for the full flow details.*
