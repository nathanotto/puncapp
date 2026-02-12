# PUNCapp Session 14: Simulation Engine

## Context

Session 13 added the activity log. Now we build a simulation engine — a Node.js script that generates 6 months of realistic chapter life across 5 chapters and 40+ members. The purpose is to populate the app with rich, coherent data so Nathan can demo PUNCapp to Traver Boehm, the founder of PUNC.

**Session 14 scope:** A single Node.js script that wipes the database (preserving Nathan's user and existing curriculum), then walks forward through time day-by-day, generating all the data a real PUNC organization would produce over 6 months.

**NOT in Session 14:** No changes to the app code. No new features. Just the script.

---

## Critical Preservation Rules

Before wiping anything, the script MUST:

1. **Preserve Nathan's user account.** Username: `notto`. Do NOT delete or recreate this user. Read his `id` from the `users` table at the start and use it throughout.
2. **Preserve existing curriculum modules and sequences.** Read them from the database before wiping. After wiping other tables, re-insert them (or simply don't delete the `curriculum_modules`, `curriculum_sequences`, and `curriculum_module_sequences` tables). The simulation can ADD new modules/sequences but must not destroy existing ones.
3. **Preserve Traver's auth account if it exists.** Check if `traver@traverboehm.com` exists in `auth.users`. If so, read the ID and use it. If not, the script should note that Traver needs to sign up manually (the script can't create auth.users entries — Supabase Auth handles that). Same for Nathan's auth account.

**Wipe order (respecting foreign keys):**

```
activity_log
meeting_feedback
meeting_recordings
meeting_time_log
curriculum_responses
chapter_curriculum_history
commitments
attendance
pending_tasks
notification_log
meeting_agenda_items
leadership_log
meetings
chapter_memberships
chapters (except: don't delete chapters if they have curriculum history you're preserving)
users (except: notto and traver if exists)
```

Do NOT wipe:
- `curriculum_modules`
- `curriculum_sequences`
- `curriculum_module_sequences` (junction table)
- `auth.users` (managed by Supabase Auth)

---

## Script Architecture

### File Location

Create: `/scripts/simulate.ts`

Run with: `npx tsx scripts/simulate.ts`

### Dependencies

The script needs:
- `@supabase/supabase-js` (already in project)
- `dotenv` (to read `.env.local`)

Read `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. Use the service role client to bypass RLS.

### Structure

```
1. Connect to Supabase (service role)
2. Read preserved data (Nathan's ID, Traver's ID if exists, curriculum)
3. Wipe tables (in correct order)
4. Generate member pool
5. Create chapters (staggered start dates)
6. Main loop: walk day-by-day from start_date to today
   - For each day:
     a. Check if new chapter should form
     b. Check if new members should join waiting list
     c. Check if waiting list members should join chapters
     d. For each chapter: check if meeting is scheduled today
        - If meeting day: run full meeting simulation
     e. Between meetings: some commitments complete, funding posts
     f. Month 5: trigger Oak split
7. Generate upcoming meeting (a few days from now) with pending RSVPs
8. Log summary stats
```

### The Internal Clock

```typescript
const SIM_START = new Date('2025-08-11'); // 6 months before today (Feb 11, 2026)
const SIM_END = new Date(); // today
let currentDay = new Date(SIM_START);

while (currentDay <= SIM_END) {
  await simulateDay(currentDay);
  currentDay.setDate(currentDay.getDate() + 1);
}
```

---

## Data Definitions

### Chapters

| Chapter | Name | Start | Location | Meeting Frequency | Meeting Day | Meeting Time | Personality |
|---------|------|-------|----------|-------------------|-------------|--------------|-------------|
| 1 | Oak Chapter | Month 1 (Aug 2025) | Lakewood, CO | Every 2 weeks | Tuesday | 7:00 PM | Flagship. High attendance, fully funded, strong commitments. Splits month 5. |
| 2 | Pine Chapter | Month 1 (Aug 2025) | Aurora, CO | Weekly | Thursday | 6:30 PM | Solid. Traver leads. Good attendance, mostly funded. |
| 3 | Elm Chapter | Month 2 (Sep 2025) | Boulder, CO | Every 3 weeks | Wednesday | 7:00 PM | Slow starter, improves over time. Growth arc. |
| 4 | Aspen Chapter | Month 3 (Oct 2025) | Castle Rock, CO | Every 2 weeks | Monday | 6:00 PM | Struggles. Lower attendance, funding gaps, one member goes inactive. |
| 5 | Oak North | Month 5 (Dec 2025) | Lakewood, CO | Every 2 weeks | Tuesday | 7:00 PM | Inherits Oak's momentum. Nathan leads. |
| 6 | Oak South | Month 5 (Dec 2025) | Littleton, CO | Every 2 weeks | Saturday | 9:00 AM | Fresh start from split. Promoted leader. |

When Oak splits:
- Oak Chapter status → `split` (or `closed` with a note)
- Oak North and Oak South created, marked as children of Oak
- Nathan (notto) stays with Oak North as Leader
- One engaged Oak member is promoted to Leader of Oak South
- Members are distributed roughly evenly (5 and 5, or 4 and 6)
- Both new chapters begin their own meeting schedules

### Named Members

These are real people who must be in the simulation:

| Name | Username | Email | Role | Chapter | Notes |
|------|----------|-------|------|---------|-------|
| Nathan Otto | notto | (preserve existing) | Leader, Admin | Oak → Oak North | DO NOT recreate. Use existing ID. |
| Traver Boehm | traver | traver@traverboehm.com | Leader, Admin | Pine | Creates if not in users table. Check auth.users first. |
| David Boyd | dboyd | david.boyd@example.com | Member | (sprinkle) | Place in any chapter naturally |
| Joseph Sheehey | jsheehey | joseph.sheehey@example.com | Member | (sprinkle) | Place in any chapter naturally |
| Andrew Fraser | afraser | andrew.fraser@example.com | Member | (sprinkle) | Place in any chapter naturally |

### Generated Members

Create ~35 additional members with:
- Realistic male first and last names
- Usernames derived from names (first initial + last name, e.g., `jsmith`)
- Email addresses using `@example.com` domain
- Addresses in Denver metro area: Denver, Lakewood, Aurora, Boulder, Fort Collins, Castle Rock, Parker, Littleton, Englewood, and surrounding areas
- Phone numbers: `303-555-XXXX` or `720-555-XXXX` format

### Waiting List

5–8 men who signed up but haven't been placed in a chapter. They should have:
- Created accounts at various points during the 6 months
- Addresses in the Denver area
- Status: `unassigned`
- Some should have been waiting longer than others

### Member Distribution Across Chapters (approximate)

| Phase | Oak | Pine | Elm | Aspen | Oak North | Oak South | Unassigned |
|-------|-----|------|-----|-------|-----------|-----------|------------|
| Month 1 | 6 | 6 | — | — | — | — | 8 waiting |
| Month 2 | 8 | 7 | 5 | — | — | — | 6 waiting |
| Month 3 | 9 | 8 | 6 | 5 | — | — | 5 waiting |
| Month 4 | 10 | 8 | 7 | 6 | — | — | 5 waiting |
| Month 5 | (splits) | 9 | 8 | 6 | 5 | 5 | 6 waiting |
| Month 6 | — | 9 | 8 | 5* | 6 | 6 | 5-8 waiting |

*Aspen loses one member to inactivity in month 5 or 6.

New members trickle in from the waiting list throughout. A few new signups arrive each month to replenish the list.

---

## Meeting Simulation

For each meeting day, the script runs through the full meeting cycle:

### Pre-Meeting (7 days before)

1. Create the `meeting` record (status: `scheduled`)
2. If curriculum exists, assign next module in sequence for the chapter
3. Create `pending_tasks` for RSVP for each member
4. Log `meeting.scheduled`

### RSVPs (days before meeting)

Simulate RSVPs trickling in over the days before the meeting:
- Most RSVPs come in 3–5 days before
- Some come in 1–2 days before
- A few never respond (triggering escalation)

RSVP distribution per chapter personality:
- Strong chapters: 85–95% yes, 5–10% no with reason, 0–5% no response
- Moderate chapters: 70–80% yes, 10–15% no, 5–10% no response  
- Struggling chapters: 55–70% yes, 15–20% no, 10–15% no response

For non-responders in the 3-day and 2-day windows:
- Log `meeting.rsvp_reminder_sent`
- Log `meeting.rsvp_escalated` 
- Some get `meeting.leader_outreach_logged`

Log `meeting.rsvp_submitted` for each RSVP.

### Meeting Day

#### Start Meeting

1. Update meeting status → `in_progress`
2. Set `actual_start_time`
   - Most meetings start on time or 1–5 min late
   - Occasionally 10+ min late (log `meeting.started_late`, create `leadership_log` entry)
3. Designate Scribe (pick a checked-in member who isn't the Leader)
4. Log `meeting.started`, `meeting.scribe_designated`

#### Check-ins

For each member who RSVP'd yes (and some who didn't RSVP but show up):
1. Create `attendance` record
   - `attendance_type`: 85% in_person, 15% video
   - `checked_in_at`: meeting start time +/- a few minutes
   - Occasionally someone is 10+ min late (log `meeting.checkin_late`)
2. Log `meeting.checkin` for each

Members who RSVP'd no or didn't respond and don't show up → attendance_type: `absent`

#### Opening

1. Create `meeting_time_log` entry for `opening_meditation` (duration: 3–7 minutes)
2. Create `meeting_time_log` entry for `opening_ethos` (duration: 2–5 minutes)
3. Log `meeting.opening_meditation_complete`, `meeting.opening_ethos_complete`

#### Lightning Round

For each attendee (not absent):
1. Create `meeting_time_log` entry:
   - Section: `lightning_round`
   - Duration: 30–120 seconds (most around 45–75 seconds)
   - Priority: 1 (30% of members) or 2 (70%)
   - If member had a stretch goal from last meeting: mark status (70% done, 20% not done, 10% abandoned)
2. Log `meeting.lightning_round_member_complete` for each

Log `meeting.lightning_round_complete` when all done.

#### Full Check-ins

For each attendee, priority 1 first then priority 2:
1. Create `meeting_time_log` entry:
   - Section: `full_checkins`
   - Duration: 5–15 minutes for priority 1, 3–8 minutes for priority 2
   - Some overtime (10% of members go 2–5 minutes over)
2. Log `meeting.full_checkin_member_complete` for each

Log `meeting.full_checkins_complete` when all done.

#### Curriculum

1. Create `chapter_curriculum_history` entry linking meeting to module
2. Create `meeting_time_log` entry for curriculum section (20–35 minutes)
3. For 60–80% of attendees, create a `curriculum_response` with a realistic 1–3 sentence reflection
4. Log `meeting.curriculum_started`, `meeting.curriculum_response_submitted` (for each), `meeting.curriculum_complete`

#### Stretch Goals / Commitments

For 70–90% of attendees, create a `commitment`:
- Type distribution: 60% stretch_goal, 20% to_member, 10% volunteer, 10% help_favor
- Realistic descriptions from a pool (see below)
- If `to_member`: pick another attendee as recipient
- Status: `pending` (will be resolved at next meeting's lightning round)

Log `commitment.created` for each.

#### Feedback

For 80–95% of attendees, create `meeting_feedback`:
- `value_rating`: 5–10 range, weighted toward 7–9
- `most_value_member_id`: pick another attendee (can't pick self, can be null/skipped 20% of the time)

Log `meeting.feedback_submitted` for each.

#### Audio Recording

For 85% of meetings, create a `meeting_recordings` entry:
- `duration_seconds`: 30–60
- `storage_path`: `recordings/sim_[meeting_id].webm` (fake path, no actual file)

Log `meeting.audio_recorded`.

#### Close Meeting

1. Update meeting:
   - `status` → `completed`
   - `completed_at` → start time + 90–150 minutes
   - `current_section` → `ended`
2. Log `meeting.closed` with full summary details

#### Validation (1–3 days after meeting)

1. Update meeting `status` → `validated`, set `validated_at`, `validated_by` (Leader)
2. Log `meeting.validated`

---

## Between-Meeting Simulation

### Commitment Resolution

Between meetings, simulate commitment progress:
- 50% of pending commitments get `self_reported_status` → `completed` (random day between meetings)
- 10% get `self_reported_status` → `abandoned`
- 40% stay pending (will be addressed at next meeting's lightning round)
- For `to_member` commitments that are self-reported complete: 90% get `recipient_confirmed`, 10% stay unconfirmed

Log `commitment.self_reported_complete`, `commitment.self_reported_abandoned`, `commitment.recipient_confirmed` as appropriate.

### Funding

At the start of each month:
1. Post `funding.monthly_debit_posted` for each active chapter ($55)
2. For contributing members, post donations:
   - Amounts: $5, $10, $15, $20 (weighted toward $10)
   - Not every contributing member donates every month (70% chance)
3. Occasionally (10% chance per month), one cross-chapter donation
4. Update chapter funding status based on balance

Log all funding events.

### New Member Joins

Periodically (every 1–3 weeks), a new member joins from the waiting list:
1. Create `chapter_membership` record
2. Update user status → `assigned`
3. Log `member.joined_chapter`

### New Signups

Every 2–4 weeks, a new person signs up:
1. Create `users` record (status: `unassigned`)
2. Log `member.signed_up`

---

## The Oak Split (Month 5 — December 2025)

Around the first week of December 2025:

### Split Request (late November)

Before the split happens, Nathan submits a formal split request to PUNC admin. The simulation should create a `split_requests` record (or whatever table/structure exists — if none exists, create the record directly in a reasonable format, even if it's just a row in a generic requests table or a JSON blob in the activity log).

The sequence:
1. **Nov 24:** Nathan submits split request. Note: "Oak has hit 10 members and we'd like to split into two chapters, North and South."
2. **Nov 26:** PUNC admin (also Nathan, in this simulation) approves the request. Sets split date for Dec 1.
3. **Nov 26–30:** Activity log entries noting the approval and upcoming split.
4. **Dec 1:** Split executes.

Log `admin.split_request_submitted` and `admin.split_request_approved` to the activity log with details including the request note, approval date, and planned split date. If these action names don't exist in the Session 13 list, add them — they're admin actions.

### Pre-Split

1. Oak has 10 members
2. The split request has been submitted and approved (see above)

### Execute Split

1. Update Oak Chapter: `status` → `closed` (or whatever status represents a split chapter). Add metadata noting it split.
2. Create Oak North chapter:
   - Location: Lakewood, CO
   - Leader: Nathan (notto)
   - Meeting schedule: same as Oak (biweekly Tuesday 7 PM)
   - Status: `open`
3. Create Oak South chapter:
   - Location: Littleton, CO
   - Leader: promoted member (pick one who's been in Oak from the start, high attendance, good commitment record)
   - Meeting schedule: biweekly Saturday 9 AM
   - Status: `open`
4. Distribute Oak members:
   - Nathan + 4 others → Oak North
   - Promoted leader + 4 others → Oak South
   - Try to split geographically (Lakewood-area members to North, south-area to South)
5. Transfer active commitments to new chapters
6. Log `admin.chapter_created` for both new chapters, plus activity noting the split

### Post-Split

Both chapters begin their own meeting cycles from month 5 onward. Each should have 2–3 meetings in the remaining simulation time.

---

## The Inactive Member (Month 5–6)

Pick one Aspen Chapter member:

1. They attend meetings through month 4
2. Month 5: they RSVP "no" with reasons ("work conflict", "traveling")
3. Month 5 second meeting: no RSVP, no response, escalation triggers
4. Leader logs outreach: "Called him, he's going through some things. Giving him space."
5. Month 6: still no attendance. Member status → `inactive`
6. Log `member.deactivated`

---

## The Cancelled Meeting

One meeting (pick any chapter, any month) gets cancelled:
1. Meeting created and RSVPs collected
2. Then meeting status → `cancelled`
3. Log `meeting.cancelled` with details: `{ reason: "cancelled" }`
4. Members' RSVP tasks get completed/dismissed

---

## Content Pools

### Stretch Goal / Commitment Descriptions

The script should have a pool of 40–50 realistic stretch goal descriptions. Examples:

```typescript
const STRETCH_GOALS = [
  "Call my dad and have a real conversation",
  "Go to the gym at least 3 times this week",
  "Have the hard conversation with my boss about the promotion",
  "Write in my journal every morning for two weeks",
  "Take my wife on a date — no phones",
  "Volunteer at the food bank this Saturday",
  "Read 50 pages of the book I've been putting off",
  "Wake up at 5:30 AM every day this week",
  "Apologize to my brother for what I said at Thanksgiving",
  "Spend one hour on my business plan",
  "Cook dinner for the family three nights this week",
  "Go for a solo hike and just think",
  "Set up that doctor's appointment I've been avoiding",
  "Say no to one thing that doesn't serve me",
  "Reach out to an old friend I've lost touch with",
  "Meditate for 10 minutes every day",
  "Finish the garage cleanup I started two months ago",
  "Have a real talk with my teenager about what's going on",
  "Cut out social media for a full week",
  "Write a letter to my younger self",
  "Sign up for that class I've been thinking about",
  "Practice guitar for 30 minutes every day",
  "Tell my wife what I'm actually feeling, not just 'fine'",
  "Spend a full day with my kids — no work, no distractions",
  "Start the budget spreadsheet and actually look at the numbers",
  "Run a 5K — doesn't matter how slow",
  "Show up 10 minutes early to everything this week",
  "Ask for help with something I've been struggling with alone",
  "Forgive myself for the mistake I keep replaying",
  "Write down three things I'm grateful for every night",
  "Fix the thing in the house that's been broken for months",
  "Have lunch with someone outside my usual circle",
  "Go 48 hours without complaining",
  "Tackle the pile of paperwork on my desk",
  "Text the guys in the chapter mid-week just to check in",
  "Do something that scares me a little",
  "Take a cold shower every morning for a week",
  "Sit with my anger instead of stuffing it down",
  "Plan something fun — just for me, nobody else",
  "Be fully present for one conversation every day",
];
```

### To-Member Commitment Descriptions

```typescript
const TO_MEMBER_COMMITMENTS = [
  "Help {recipient} move this weekend",
  "Check in on {recipient} mid-week — he's going through it",
  "Grab coffee with {recipient} and hear about his new job",
  "Help {recipient} with his resume",
  "Spot {recipient} at the gym on Saturday",
  "Drive {recipient} to his appointment on Thursday",
  "Bring {recipient} dinner — his wife just had a baby",
  "Review {recipient}'s business plan and give honest feedback",
  "Go for a hike with {recipient} this weekend",
  "Help {recipient} prep for his job interview",
];
```

### Curriculum Reflective Responses

```typescript
const REFLECTIVE_RESPONSES = [
  "This hit close to home. I've been avoiding exactly this kind of honesty with myself.",
  "I realized I do this all the time — pretend everything's fine when it's not.",
  "The exercise made me think about my relationship with my father.",
  "I struggle with this one. Being vulnerable doesn't come naturally to me.",
  "This principle is easy to understand but hard to live. I'm working on it.",
  "Hearing the other guys share made me feel less alone in this.",
  "I need to sit with this more. It brought up some stuff I haven't dealt with.",
  "This connected to what I'm going through at work right now.",
  "The question about authenticity really got me. Am I being real, or performing?",
  "I appreciated the exercise. It gave me a concrete way to practice this.",
  "This reminded me why I joined PUNC in the first place.",
  "I want to bring this principle into how I parent. I can do better.",
  "Honestly, I resisted this at first. But by the end I understood why it matters.",
  "The group discussion helped me see a blind spot I didn't know I had.",
  "Simple but powerful. I wrote this one down to remember.",
  "This principle challenges the way I was raised. That's uncomfortable but good.",
  "I think I've been hiding behind busyness to avoid dealing with this.",
  "Sharing this out loud was harder than I expected. But I'm glad I did.",
  "I see how this connects to the commitment I made last meeting.",
  "This is the work. Not easy, but it's why we're here.",
];
```

### RSVP Decline Reasons

```typescript
const DECLINE_REASONS = [
  "Work travel this week",
  "Family commitment",
  "Daughter's soccer game",
  "Not feeling well",
  "Prior commitment I can't move",
  "Wife's birthday",
  "Working late this week",
  "Out of town visiting family",
  "Doctor's appointment",
  "Kid's school event",
];
```

---

## Activity Logging

**Every action the simulation takes should also write to `activity_log`.**

Use the `logActivity()` utility from Session 13 if possible, or write directly to the `activity_log` table using the same format. The action names must match the Session 13 reference list exactly.

This is critical — when Traver opens the admin dashboard, the activity feed should be full of 6 months of rich history.

---

## Script Output

As the script runs, it should print progress to the console:

```
🏗️  PUNCapp Simulation Engine
📅 Simulating Aug 11, 2025 → Feb 11, 2026 (184 days)

🧹 Wiping database (preserving notto, curriculum)...
   ✓ Preserved user: notto (id: abc-123)
   ✓ Preserved user: traver (id: def-456) 
   ✓ Preserved 12 curriculum modules, 3 sequences
   ✓ Tables wiped

👥 Creating 40 members...
   ✓ 5 named members (notto, traver, dboyd, jsheehey, afraser)
   ✓ 35 generated members
   ✓ 8 placed on waiting list

📅 Simulating day by day...

--- August 2025 ---
   Aug 11: Oak Chapter formed (6 members, Leader: notto)
   Aug 11: Pine Chapter formed (6 members, Leader: traver)
   Aug 12: 🗓️ Oak meeting scheduled for Aug 19
   Aug 14: 🗓️ Pine meeting scheduled for Aug 21
   Aug 19: 📋 Oak meeting — 6 attended, 0 absent
   Aug 21: 📋 Pine meeting — 5 attended, 1 absent
   ...

--- September 2025 ---
   Sep 08: Elm Chapter formed (5 members)
   Sep 09: jsmith joined Oak from waiting list
   ...

--- December 2025 ---
   Dec 01: 🔀 Oak Chapter split → Oak North (5) + Oak South (5)
   Dec 02: Oak North meeting scheduled...
   ...

--- February 2026 ---
   Feb 08: 📋 Pine meeting — 8 attended, 1 absent
   Feb 11: 🗓️ Oak North meeting scheduled for Feb 18 (upcoming!)
   
✅ Simulation complete!

📊 Summary:
   Chapters: 6 (4 active, 1 closed/split, 1 archived)
   Members: 47 total (40 active, 1 inactive, 6 waiting list)
   Meetings: 68 completed, 1 cancelled, 2 upcoming
   Commitments: 312 created, 187 completed, 31 abandoned, 94 pending
   Funding transactions: 142
   Activity log entries: 2,847
```

---

## Error Handling

- If the script hits a database error, log the error with context (which day, which action) and continue to the next day. Don't crash on one bad insert.
- At the end, print any errors that occurred so Nathan can review them.
- Use a `--dry-run` flag that prints what would happen without writing to the database.

---

## Running the Script

### Install dependencies (if needed)

```bash
npm install dotenv tsx --save-dev
```

### Run

```bash
npx tsx scripts/simulate.ts
```

### Dry run (preview without writing)

```bash
npx tsx scripts/simulate.ts --dry-run
```

### Re-run (wipes and regenerates)

Just run it again. It wipes first, so it's idempotent.

---

## File Summary

```
scripts/
  simulate.ts          # The main simulation engine (~800-1200 lines)
```

No app code changes. No new migrations (activity_log table already exists from Session 13).

---

## Testing Checklist

### Data Integrity:
- [ ] Nathan's user (notto) preserved with correct ID
- [ ] Traver's user created/preserved correctly
- [ ] Existing curriculum modules and sequences intact
- [ ] All foreign keys valid (no orphaned records)
- [ ] No duplicate memberships
- [ ] Meeting dates follow chapter schedules correctly
- [ ] No meetings on dates before a chapter was formed
- [ ] No attendance for members before they joined a chapter

### Chapter Lifecycle:
- [ ] Oak and Pine exist from month 1
- [ ] Elm forms in month 2
- [ ] Aspen forms in month 3
- [ ] Oak splits in month 5 → Oak North + Oak South
- [ ] Oak marked as closed/split after split
- [ ] Oak North has Nathan as Leader
- [ ] Oak South has promoted member as Leader
- [ ] Member counts grow over time as waiting list drains

### Meeting Data:
- [ ] Meeting frequency matches chapter schedule (weekly/biweekly/triweekly)
- [ ] Each meeting has RSVPs, attendance, lightning round, checkins, curriculum, commitments, feedback
- [ ] At least one meeting started late (with leadership log entry)
- [ ] At least one cancelled meeting
- [ ] Most recent meeting was a few days ago
- [ ] At least one upcoming meeting with pending RSVP tasks

### Member Lifecycle:
- [ ] Waiting list members exist with status `unassigned`
- [ ] Members join chapters over time
- [ ] One Aspen member goes inactive
- [ ] New signups appear throughout the timeline

### Funding:
- [ ] Monthly debits posted for each active chapter
- [ ] Contributing members have donation records
- [ ] At least one cross-chapter donation
- [ ] Chapter funding statuses vary (some funded, some deficit)

### Activity Log:
- [ ] Every simulated action has a corresponding activity_log entry
- [ ] Action names match Session 13 reference list
- [ ] Activity feed on admin dashboard shows 6 months of history
- [ ] Feed is filterable by chapter

### App Verification (manual):
- [ ] Log in as Nathan → see Oak North dashboard with history
- [ ] Admin dashboard shows all chapters with realistic KPIs
- [ ] Activity feed shows rich timeline
- [ ] Click into each chapter → meetings, members, funding look real
- [ ] Upcoming meeting has pending RSVP tasks
- [ ] Commitment tracking shows completed/abandoned/pending mix

---

*End of Session 14 Prompt*