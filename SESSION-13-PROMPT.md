# PUNCapp Session 13: Activity Log

## Context

Sessions 1–7 built the complete meeting cycle. Sessions 8–12 added testing, admin, and funding. The app is feature-rich but has no unified record of what's happening across the system. Session 13 adds an application-wide activity log that records every meaningful action, and a live activity feed on the admin dashboard.

**Session 13 scope:** Activity log table, logging utility, retroactive logging in all existing code, 12-month retention policy, live admin activity feed.

**NOT in Session 13:** Simulation data (Session 14), member-facing activity feeds (future), real-time Supabase subscriptions for the feed (future — polling is fine for now).

## Primary References

1. **TOD-SPECIFICATION.md** — All task flows (every action in every flow should be logged)
2. **CLAUDE-CODE-GUIDE.md** — Implementation patterns
3. **ADMIN_README.md** — Admin dashboard structure

---

## Step 1: Create the Activity Log Table

**CLAUDE CODE does this.**

Create a migration file: `supabase/migrations/[timestamp]_create_activity_log.sql`

```sql
-- Activity Log: records every meaningful action in the system
-- Retained for 12 months trailing; older rows should be archived or deleted

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- When it happened
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Who did it
  -- For user actions, this is the user's ID
  -- For system/automated actions, this is NULL (check actor_type)
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'admin', 'cron')),
  
  -- What happened (short, machine-readable verb)
  action text NOT NULL,
  
  -- What entity was affected
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  
  -- Which chapter this relates to (NULL for org-wide actions)
  chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,
  
  -- Human-readable summary (what you'd show in a feed)
  summary text NOT NULL,
  
  -- Rich detail blob for drill-down
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for common queries
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_chapter_id ON activity_log(chapter_id, created_at DESC);
CREATE INDEX idx_activity_log_actor_id ON activity_log(actor_id, created_at DESC);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_action ON activity_log(action, created_at DESC);

-- RLS: Admins can see everything. Members see their own chapter's log.
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity"
  ON activity_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Members can view own chapter activity"
  ON activity_log FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Insert policy: any authenticated user or service role can write
CREATE POLICY "Authenticated users can insert activity"
  ON activity_log FOR INSERT
  WITH CHECK (true);
```

### Action Names Reference

Use these exact action names for consistency. Claude Code should reference this list when adding logging calls.

**Meeting Cycle:**
- `meeting.scheduled` — Leader scheduled a meeting
- `meeting.rsvp_submitted` — Member submitted RSVP (yes/no/maybe)
- `meeting.rsvp_reminder_sent` — System sent RSVP reminder (3 days before)
- `meeting.rsvp_escalated` — System escalated to leader (2 days before)
- `meeting.leader_outreach_logged` — Leader logged outreach to non-responder
- `meeting.started` — Leader started the meeting
- `meeting.started_late` — Leader started meeting 10+ min late (flag)
- `meeting.checkin` — Member checked in (in_person or video)
- `meeting.checkin_late` — Member checked in 10+ min after start (flag)
- `meeting.scribe_designated` — Scribe assigned for meeting
- `meeting.scribe_changed` — Scribe transferred mid-meeting
- `meeting.opening_meditation_complete` — Opening meditation finished
- `meeting.opening_ethos_complete` — Ethos reading finished
- `meeting.lightning_round_member_complete` — One man's lightning round done
- `meeting.lightning_round_complete` — All lightning rounds finished
- `meeting.full_checkin_member_complete` — One man's full checkin done
- `meeting.full_checkins_complete` — All full checkins finished
- `meeting.curriculum_started` — Curriculum module began
- `meeting.curriculum_response_submitted` — Member submitted reflective response
- `meeting.curriculum_complete` — Curriculum section finished
- `meeting.feedback_submitted` — Member submitted meeting feedback (rating + most value)
- `meeting.audio_recorded` — Audio recording uploaded
- `meeting.closed` — Leader closed the meeting
- `meeting.validated` — Leader validated meeting for donor reporting
- `meeting.validation_approved` — Admin approved validated meeting
- `meeting.validation_rejected` — Admin rejected validated meeting
- `meeting.cancelled` — Meeting was cancelled

**Member Lifecycle:**
- `member.signed_up` — New user created account
- `member.email_verified` — User verified email
- `member.applied_to_chapter` — User applied to join a chapter
- `member.application_approved` — Leader approved member application
- `member.application_rejected` — Leader rejected member application
- `member.joined_chapter` — Member successfully joined a chapter
- `member.left_chapter` — Member left a chapter
- `member.removed_from_chapter` — Admin/Leader removed member
- `member.became_contributing` — Member became contributing member
- `member.deactivated` — Member marked inactive
- `member.reactivated` — Member reactivated

**Commitments:**
- `commitment.created` — New commitment made (stretch goal, to-member, volunteer, help-favor)
- `commitment.self_reported_complete` — Maker says it's done
- `commitment.self_reported_abandoned` — Maker abandoned it
- `commitment.recipient_confirmed` — Recipient confirmed completion
- `commitment.recipient_disputed` — Recipient disputed completion
- `commitment.resolved` — Leader resolved disputed commitment
- `commitment.carried_forward` — Commitment kept from previous meeting (default)

**Funding:**
- `funding.donation_received` — Donation posted to chapter
- `funding.cross_chapter_donation` — Donation to another chapter
- `funding.monthly_debit_posted` — Monthly $55 debit recorded
- `funding.status_changed` — Chapter funding status changed (e.g., deficit → partially_funded)

**Admin Actions:**
- `admin.leader_certified` — Admin certified a leader
- `admin.leader_certification_revoked` — Admin revoked certification
- `admin.chapter_created` — Admin created a new chapter
- `admin.chapter_status_changed` — Admin changed chapter status
- `admin.chapter_flagged` — Admin flagged chapter for attention
- `admin.chapter_flag_resolved` — Admin resolved chapter flag
- `admin.member_role_changed` — Admin changed member's role in chapter
- `admin.curriculum_sequence_created` — Admin created curriculum sequence
- `admin.curriculum_module_created` — Admin created curriculum module
- `admin.curriculum_module_updated` — Admin updated curriculum module

**Leadership Log (system-generated flags):**
- `flag.late_meeting_start` — Meeting started 10+ min late
- `flag.late_checkin` — Member checked in 10+ min late
- `flag.uncontacted_absent` — Member absent without leader outreach
- `flag.low_attendance` — Meeting had < 50% attendance
- `flag.chapter_deficit` — Chapter in funding deficit for 3+ months

---

## Step 2: Create the Logging Utility

**CLAUDE CODE does this.**

Create `/lib/activity-log.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';

interface LogActivityParams {
  actorId?: string | null;       // user ID, or null for system actions
  actorType?: 'user' | 'system' | 'admin' | 'cron';
  action: string;                // from the action names list above
  entityType: string;            // 'meeting', 'chapter', 'user', 'commitment', 'funding'
  entityId: string;              // the UUID of the affected entity
  chapterId?: string | null;     // which chapter, if applicable
  summary: string;               // human-readable: "Mike checked in to Oak Chapter meeting"
  details?: Record<string, any>; // rich JSON blob
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('activity_log')
      .insert({
        actor_id: params.actorId || null,
        actor_type: params.actorType || 'user',
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        chapter_id: params.chapterId || null,
        summary: params.summary,
        details: params.details || {},
      });
    
    if (error) {
      // Log to console but don't throw — activity logging should never break the app
      console.error('Activity log write failed:', error);
    }
  } catch (err) {
    console.error('Activity log error:', err);
  }
}
```

### Critical rule: Activity logging must NEVER break the app.

Every `logActivity()` call is wrapped in try/catch. If the log write fails, the user's action still succeeds. Console errors get logged for debugging, but the user never sees a failure caused by logging.

### Critical rule: Activity logging must NEVER slow down the app.

Don't `await` the log call if it's not needed for the response. In server actions, you can fire and forget:

```typescript
// Fire and forget — don't await
logActivity({
  actorId: userId,
  action: 'meeting.checkin',
  entityType: 'meeting',
  entityId: meetingId,
  chapterId: chapterId,
  summary: `${userName} checked in to ${chapterName} meeting`,
  details: {
    attendance_type: 'in_person',
    checked_in_at: new Date().toISOString(),
    checked_in_late: false,
  }
});
```

For server actions where you want to make sure the log is written before returning (like meeting close or validation), use `await`.

---

## Step 3: Add Logging to ALL Existing Code

**CLAUDE CODE does this. This is the big step.**

Go through every server action, API route, and system function in the codebase and add `logActivity()` calls. Here's where to look and what to log:

### 3A: Meeting Scheduling & RSVPs (Sessions 2–3)

Find the server actions or API routes for:

1. **Scheduling a meeting** — Log `meeting.scheduled` with details: `{ scheduled_date, scheduled_time, location, chapter_name }`
2. **Submitting RSVP** — Log `meeting.rsvp_submitted` with details: `{ rsvp_status, meeting_date, reason (if no) }`
3. **RSVP escalation trigger** — Log `meeting.rsvp_reminder_sent` for each reminder, `meeting.rsvp_escalated` for each escalation. Details: `{ member_name, meeting_date, escalation_type }`
4. **Leader outreach logged** — Log `meeting.leader_outreach_logged` with details: `{ member_name, outreach_notes, rsvp_changed_to }`

### 3B: Meeting Start & Check-in (Session 4)

1. **Start meeting** — Log `meeting.started` with details: `{ scheduled_time, actual_start_time, attendee_count, scribe_name }`. If late, ALSO log `meeting.started_late` with details: `{ minutes_late, scheduled_time, actual_time }`
2. **Member check-in** — Log `meeting.checkin` with details: `{ attendance_type, checked_in_at }`. If late, ALSO log `meeting.checkin_late` with details: `{ minutes_late }`
3. **Scribe designated** — Log `meeting.scribe_designated` with details: `{ scribe_name }`
4. **Scribe changed** — Log `meeting.scribe_changed` with details: `{ previous_scribe, new_scribe }`

### 3C: Opening & Lightning Round (Session 5)

1. **Meditation complete** — Log `meeting.opening_meditation_complete` with details: `{ duration_seconds }`
2. **Ethos complete** — Log `meeting.opening_ethos_complete` with details: `{ duration_seconds }`
3. **Each man's lightning round** — Log `meeting.lightning_round_member_complete` with details: `{ member_name, duration_seconds, priority, stretch_goal_status, overtime_seconds }`. The entity_id here is the meeting_id, and actor_id is the Scribe (they're recording it).
4. **Lightning round complete** — Log `meeting.lightning_round_complete` with details: `{ total_duration_seconds, member_count, priority_1_count, priority_2_count }`

### 3D: Full Check-ins (Session 6)

1. **Each man's full checkin** — Log `meeting.full_checkin_member_complete` with details: `{ member_name, duration_seconds, overtime_seconds, support_requested }`
2. **All checkins complete** — Log `meeting.full_checkins_complete` with details: `{ total_duration_seconds, member_count }`

### 3E: Curriculum, Closing, Commitments (Session 7)

1. **Curriculum started** — Log `meeting.curriculum_started` with details: `{ module_title, sequence_name, facilitator_name }`
2. **Reflective response submitted** — Log `meeting.curriculum_response_submitted` with details: `{ module_title, response_length_chars }` (DO NOT log the actual response text — that's private)
3. **Curriculum complete** — Log `meeting.curriculum_complete` with details: `{ module_title, duration_seconds, responses_collected }`
4. **Support commitment created** — Log `commitment.created` with details: `{ commitment_type, description, recipient_name (if applicable), has_deadline }`. Entity is the commitment, not the meeting.
5. **Meeting feedback submitted** — Log `meeting.feedback_submitted` with details: `{ value_rating, most_value_member_name }` (the rating number is fine to log; it's aggregated data, not private)
6. **Audio recorded** — Log `meeting.audio_recorded` with details: `{ duration_seconds }`
7. **Meeting closed** — Log `meeting.closed` with details: `{ total_duration_minutes, attendance_in_person, attendance_video, commitments_made, curriculum_module, average_rating, audio_recorded }`
8. **Meeting validated** — Log `meeting.validated` with details: `{ representations_confirmed, audio_present }`

### 3F: Admin Actions (Sessions 9+)

Find every admin server action or API route:

1. **Leader certification** — Log `admin.leader_certified` or `admin.leader_certification_revoked`
2. **Chapter creation** — Log `admin.chapter_created` with details: `{ chapter_name, location, leader_name }`
3. **Chapter status change** — Log `admin.chapter_status_changed` with details: `{ previous_status, new_status, reason }`
4. **Chapter flagging** — Log `admin.chapter_flagged` with details: `{ flag_type, reason }`
5. **Member role change** — Log `admin.member_role_changed` with details: `{ member_name, previous_role, new_role, chapter_name }`
6. **Curriculum CRUD** — Log `admin.curriculum_sequence_created`, `admin.curriculum_module_created`, `admin.curriculum_module_updated` with relevant details
7. **Meeting validation review** — Log `meeting.validation_approved` or `meeting.validation_rejected` with details: `{ meeting_date, chapter_name, reviewer_notes }`

### 3G: Funding Actions

1. **Donation** — Log `funding.donation_received` with details: `{ amount, frequency, attribution_type, donor_member_type }`. Do NOT log donor identity unless attribution is public.
2. **Cross-chapter donation** — Log `funding.cross_chapter_donation` with details: `{ amount, source_chapter, target_chapter }`
3. **Monthly debit** — Log `funding.monthly_debit_posted` with details: `{ amount, new_balance, funding_status }`

### 3H: Member Lifecycle

If any of these actions exist in the codebase:

1. **Signup** — Log `member.signed_up` with details: `{ email }`
2. **Joined chapter** — Log `member.joined_chapter` with details: `{ chapter_name, member_type }`
3. **Left/removed** — Log `member.left_chapter` or `member.removed_from_chapter`
4. **Became contributing** — Log `member.became_contributing`

### How to find all the places to add logging

Search the codebase for these patterns — they indicate server-side actions that should be logged:

```bash
# Server actions
grep -rn "use server" app/ --include="*.ts" --include="*.tsx"

# API routes  
find app/api -name "route.ts"

# Supabase inserts/updates/deletes (these are data mutations)
grep -rn "\.insert(" app/ lib/ --include="*.ts" --include="*.tsx"
grep -rn "\.update(" app/ lib/ --include="*.ts" --include="*.tsx"
grep -rn "\.delete(" app/ lib/ --include="*.ts" --include="*.tsx"

# Functions that sound like they do things
grep -rn "async function" app/ lib/ --include="*.ts" --include="*.tsx" | grep -i "create\|update\|delete\|submit\|start\|close\|validate\|approve\|reject\|certify\|schedule\|checkin\|check-in"
```

For each match, determine:
- Is this a meaningful action? (If yes, log it)
- What's the right action name from the list?
- What details are useful but not private?
- Who's the actor?
- What's the entity?

---

## Step 4: Create the Retention Cleanup Function

**CLAUDE CODE does this.**

Create `/lib/activity-log-cleanup.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';

/**
 * Delete activity log entries older than 12 months.
 * Run this monthly via cron or manual admin trigger.
 */
export async function cleanupOldActivityLogs(): Promise<{ deleted: number }> {
  const supabase = await createClient();
  
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 12);
  
  const { data, error } = await supabase
    .from('activity_log')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');
  
  if (error) {
    console.error('Activity log cleanup failed:', error);
    return { deleted: 0 };
  }
  
  return { deleted: data?.length || 0 };
}
```

Also create an admin API route at `/app/api/admin/activity-log/cleanup/route.ts` that calls this function. Admin-only, returns how many rows were deleted.

---

## Step 5: Build the Admin Activity Feed

**CLAUDE CODE does this.**

Add a live activity feed component to the admin dashboard page (`/app/admin/page.tsx` or wherever the dashboard lives).

### 5A: Activity Feed API Route

Create `/app/api/admin/activity-feed/route.ts`:

- Returns the most recent 50 activity log entries
- Supports query params: `?chapter_id=xxx`, `?action=meeting.closed`, `?limit=100`
- Admin-only (check `is_admin`)
- Joins with `users` table to get actor names
- Returns JSON array

### 5B: Activity Feed Component

Create `/components/admin/ActivityFeed.tsx`:

**Design:**
- Scrollable list, newest at top
- Each entry shows:
  - Timestamp (relative: "2 minutes ago", "yesterday at 3:14 PM")
  - Actor name (or "System" for automated actions)
  - Summary text
  - Chapter name badge (if applicable)
  - Action type color coding:
    - Green: positive actions (checkin, commitment complete, donation, validation approved)
    - Blue: neutral/informational (meeting scheduled, RSVP submitted, curriculum started)
    - Orange: warnings/flags (late start, late checkin, escalation, deficit)
    - Red: negative (meeting cancelled, member removed, validation rejected)
- Clicking an entry expands to show the full `details` JSON in a readable format
- "Load more" button at the bottom to paginate

**Filters (above the feed):**
- Chapter dropdown (all chapters + "All")
- Action type dropdown (all types, or grouped: "Meeting", "Member", "Commitment", "Funding", "Admin", "Flags")
- Date range (today, this week, this month, custom)

**Auto-refresh:**
- Poll every 30 seconds for new entries (simple `setInterval` with fetch)
- Show a "3 new entries" banner at the top when new items arrive, user clicks to load them
- Don't use Supabase realtime subscriptions — polling is fine for admin use

### 5C: Dashboard Integration

Add the ActivityFeed component to the admin dashboard. It should sit below the KPI cards. Give it roughly 60% of the page width on desktop, with the remaining 40% available for other admin widgets (flagged chapters, upcoming meetings, etc.).

On mobile, the feed goes full-width below the KPIs.

---

## Step 6: Test the Activity Log

**YOU do this in the browser. CLAUDE CODE creates the test helpers.**

### 6A: Create a Test Script

CLAUDE CODE creates `/scripts/test-activity-log.ts` that:

1. Inserts 10 sample activity log entries spanning different action types
2. Verifies they appear in the database
3. Verifies the API route returns them
4. Tests the cleanup function (inserts an entry dated 13 months ago, runs cleanup, verifies it's gone)

### 6B: Manual Browser Testing

1. Go to `/admin`
2. **Expected:** Activity feed shows below KPIs
3. Perform some actions as a user (RSVP, check in, etc.)
4. Return to admin dashboard
5. **Expected:** New entries appear in the feed within 30 seconds
6. Test filters: select a specific chapter, verify feed filters correctly
7. Click an entry to expand details
8. **Expected:** JSON details shown in readable format

### 6C: Verify Retroactive Logging

Run through one complete meeting cycle (schedule → RSVP → start → opening → lightning round → checkins → curriculum → close → validate). Check the activity log after each step:

```sql
SELECT created_at, action, summary 
FROM activity_log 
ORDER BY created_at DESC 
LIMIT 20;
```

Every step should have produced at least one log entry.

---

## Testing Checklist

### Database:
- [ ] `activity_log` table exists with all columns
- [ ] Indexes created for common queries
- [ ] RLS policies work (admin sees all, members see own chapter)

### Logging Utility:
- [ ] `logActivity()` works for all actor types
- [ ] Failed log writes don't crash the app
- [ ] Fire-and-forget calls don't slow down responses

### Retroactive Logging — Meeting Cycle:
- [ ] `meeting.scheduled` logged when Leader schedules
- [ ] `meeting.rsvp_submitted` logged for each RSVP
- [ ] `meeting.started` logged (with `meeting.started_late` if applicable)
- [ ] `meeting.checkin` logged for each member
- [ ] `meeting.opening_meditation_complete` logged
- [ ] `meeting.opening_ethos_complete` logged
- [ ] `meeting.lightning_round_member_complete` logged for each man
- [ ] `meeting.lightning_round_complete` logged
- [ ] `meeting.full_checkin_member_complete` logged for each man
- [ ] `meeting.full_checkins_complete` logged
- [ ] `meeting.curriculum_started` logged
- [ ] `meeting.curriculum_response_submitted` logged (without response text)
- [ ] `meeting.curriculum_complete` logged
- [ ] `commitment.created` logged
- [ ] `meeting.feedback_submitted` logged
- [ ] `meeting.audio_recorded` logged
- [ ] `meeting.closed` logged with full summary details
- [ ] `meeting.validated` logged

### Retroactive Logging — Admin:
- [ ] `admin.leader_certified` logged
- [ ] `admin.chapter_created` logged
- [ ] `admin.chapter_status_changed` logged
- [ ] `admin.curriculum_*` actions logged

### Retroactive Logging — Funding:
- [ ] `funding.donation_received` logged
- [ ] `funding.monthly_debit_posted` logged

### Retroactive Logging — Escalation:
- [ ] `meeting.rsvp_reminder_sent` logged
- [ ] `meeting.rsvp_escalated` logged
- [ ] `meeting.leader_outreach_logged` logged

### Admin Activity Feed:
- [ ] Feed renders on admin dashboard
- [ ] Shows newest entries first
- [ ] Color coding works for different action types
- [ ] Chapter filter works
- [ ] Action type filter works
- [ ] Click to expand shows details
- [ ] Auto-refresh picks up new entries within 30 seconds
- [ ] "Load more" pagination works

### Retention:
- [ ] Cleanup function deletes entries older than 12 months
- [ ] Admin API route triggers cleanup
- [ ] Recent entries are not affected

---

## Notes for Session 14

Session 14 will build the simulation engine — a Node.js script that generates 6 months of realistic data across 5 chapters and 40 members. The simulation will use `logActivity()` to populate the activity log as it generates data, so the admin feed will be rich with history when Traver sees the app.

---

## File Summary

After Session 13, you'll have:

```
supabase/migrations/
  [timestamp]_create_activity_log.sql

lib/
  activity-log.ts              # logActivity() utility
  activity-log-cleanup.ts      # 12-month retention cleanup

app/api/admin/
  activity-feed/route.ts       # Feed data endpoint
  activity-log/cleanup/route.ts # Retention cleanup endpoint

components/admin/
  ActivityFeed.tsx              # Live feed component with filters

scripts/
  test-activity-log.ts         # Test script

# MODIFIED (logging added):
# Every server action and API route across Sessions 2-12
# that creates, updates, or deletes data
```

---

*End of Session 13 Prompt*