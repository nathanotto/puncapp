# PUNCapp Session 11: Chapter Lifecycle Requests

## Context

Session 9 built Admin foundation (chapters, members, certification). Session 10 built curriculum management and meeting validation. Now we build the Chapter Lifecycle Request system — how chapters are formed, split, and dissolved.

**Session 11 scope:** Formation Request, Split Request, Dissolution Request, member opt-in flow, Admin review queue, request execution on approval.

**NOT in Session 11:** Email notifications (notification_log only), Special Consideration meeting flow, Yearly Review, "Find men near me" discovery, First Three meeting support UI.

## Primary References

1. **TOD-SPECIFICATION.md** — Flow 7: Chapter Split, Chapter state machine
2. **SESSION-9-PROMPT.md** — Admin foundation, parent_chapter_id field
3. **SESSION-10-PROMPT.md** — Admin patterns

---

## Step 1: Database Schema

```sql
-- Chapter lifecycle requests
CREATE TABLE chapter_lifecycle_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL CHECK (request_type IN ('formation', 'split', 'dissolution')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'withdrawn')),
  
  -- Who submitted
  submitted_by uuid NOT NULL REFERENCES public.users(id),
  submitted_at timestamptz,
  
  -- For split/dissolution: which chapter (null for formation)
  chapter_id uuid REFERENCES chapters(id),
  
  -- Request data (varies by type, see below)
  request_data jsonb NOT NULL DEFAULT '{}',
  
  -- Review
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  review_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversation thread on requests
CREATE TABLE lifecycle_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES chapter_lifecycle_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Member opt-ins for formation and split
CREATE TABLE member_opt_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES chapter_lifecycle_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  
  -- Type of opt-in
  opt_in_type text NOT NULL CHECK (opt_in_type IN ('formation', 'split_existing', 'split_new')),
  
  -- For split_existing: which chapter assignment to confirm
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

-- Indexes
CREATE INDEX idx_lifecycle_requests_status ON chapter_lifecycle_requests(status);
CREATE INDEX idx_lifecycle_requests_type ON chapter_lifecycle_requests(request_type);
CREATE INDEX idx_lifecycle_requests_submitted_by ON chapter_lifecycle_requests(submitted_by);
CREATE INDEX idx_opt_ins_request ON member_opt_ins(request_id);
CREATE INDEX idx_opt_ins_user ON member_opt_ins(user_id);
CREATE INDEX idx_opt_ins_status ON member_opt_ins(status) WHERE status = 'pending';
```

---

## Step 2: Request Data Structures

### Formation Request
```typescript
interface FormationRequestData {
  proposed_name: string;
  proposed_location: string;
  meeting_day: string;  // Monday, Tuesday, etc.
  meeting_time: string; // HH:MM
  meeting_frequency: 'weekly' | 'biweekly' | 'monthly';
  founding_member_ids: string[];  // user IDs
  leader_statement: string;  // Why I want to lead this chapter
}
```

### Split Request
```typescript
interface SplitRequestData {
  reason: string;
  
  // New chapter details
  new_chapter_name: string;
  new_chapter_location: string;
  new_chapter_meeting_day?: string;  // defaults to same as original
  new_chapter_meeting_time?: string;
  
  // Member assignments (existing chapter members)
  original_chapter_member_ids: string[];
  new_chapter_member_ids: string[];
  dual_membership_member_ids: string[];  // in both
  
  // NEW members joining (now that there's room)
  new_member_ids: string[];
  new_members_target: Record<string, 'original' | 'new'>;  // which chapter each joins
  
  // Leadership for new chapter
  new_chapter_leader_id: string;
  new_chapter_backup_leader_id?: string;
}
```

### Dissolution Request
```typescript
interface DissolutionRequestData {
  reason: string;
  what_happened: string;  // narrative of chapter's journey
  member_notes: Record<string, string>;  // user_id -> preference/notes
}
```

---

## Step 3: Leader Request Submission Pages

### Formation Request

**`/app/requests/formation/page.tsx`**

**Access:** Certified leaders only. Check `is_leader_certified = true`.

**Header:**
- Title: "Request New Chapter Formation"
- Subtitle: "Propose a new PUNC chapter with founding members"

**Form Sections:**

**Chapter Details Card**
```
Chapter Name: [input] *
Default Meeting Location: [input] *
Meeting Day: [dropdown: Mon-Sun] *
Meeting Time: [time input] *
Frequency: [dropdown: weekly, biweekly, monthly] *
```

**Your Statement Card**
```
Why do you want to lead this chapter? What's your vision?
[textarea] *
```

**Founding Members Card**
- Header: "Select 4-7 founding members" (plus you = 5-8 total)
- Searchable list of unassigned users
- Each row: checkbox, name, email, location (if known)
- Selected count shown: "5 members selected (6 including you)"
- Validation: minimum 4, maximum 7 (plus leader)

**Actions:**
- [Save Draft] — saves with status='draft'
- [Submit Request] — sets status='submitted', triggers opt-in notifications

### Split Request

**`/app/chapter/[chapterId]/requests/split/page.tsx`**

**Access:** Chapter leader only. Chapter must have ≥9 members.

**Header:**
- Title: "Request Chapter Split"
- Subtitle: "[Chapter Name] — [X] current members"

**Form Sections:**

**Reason Card**
```
Why is the chapter splitting?
[textarea] *
(e.g., "We've grown to 11 members and want more time per man...")
```

**New Chapter Details Card**
```
New Chapter Name: [input] *
New Chapter Location: [input] *
Meeting Day: [dropdown, default same as original]
Meeting Time: [time input, default same as original]
```

**Member Assignments Card**

Interactive assignment UI:
- Three columns: "Original Chapter", "Both Chapters", "New Chapter"
- All current members listed, draggable between columns (or use dropdowns)
- Each member row shows: name, role badge if leader/backup
- Validation: each side must have ≥5 members (dual counts for both)

**New Members Card** (optional)
- Header: "Add new members (now that there's room)"
- Searchable list of unassigned users
- For each selected: dropdown to assign to Original or New chapter
- These are NEW members joining, not existing chapter members

**New Chapter Leadership Card**
```
New Chapter Leader: [dropdown of certified members assigned to new chapter] *
Backup Leader: [dropdown, optional]
```
- Show warning if no certified members in new chapter roster

**Actions:**
- [Save Draft]
- [Submit Request] — triggers opt-in notifications for all affected members

### Dissolution Request

**`/app/chapter/[chapterId]/requests/dissolution/page.tsx`**

**Access:** Chapter leader or backup leader.

**Header:**
- Title: "Request Chapter Dissolution"
- Subtitle: "[Chapter Name]"
- Warning banner: "This will close the chapter. Member history will be preserved."

**Form Sections:**

**Reason Card**
```
Why is the chapter dissolving?
[textarea] *
```

**Chapter Story Card**
```
Tell the story of this chapter — what happened, what worked, what didn't:
[textarea] *
```

**Member Preferences Card**
- List of all current members
- Each row: name, text input for notes/preferences
- Placeholder: "e.g., Interested in joining Cedar Chapter, moving away, taking a break..."

**Actions:**
- [Save Draft]
- [Submit Request]

---

## Step 4: Opt-In Flow

### When Request Submitted

**Formation Request:**
```typescript
// For each founding_member_id:
await supabase.from('member_opt_ins').insert({
  request_id: requestId,
  user_id: memberId,
  opt_in_type: 'formation',
  status: 'pending',
  notified_at: new Date().toISOString(),
});

// Log notification
await supabase.from('notification_log').insert({
  user_id: memberId,
  notification_type: 'formation_opt_in',
  related_entity_type: 'lifecycle_request',
  related_entity_id: requestId,
  message: `You've been invited to join ${proposedName} chapter`,
});
```

**Split Request:**
```typescript
// For existing members (split_existing):
for (const memberId of [...originalMembers, ...newMembers, ...dualMembers]) {
  const assignment = dualMembers.includes(memberId) ? 'both' 
    : originalMembers.includes(memberId) ? 'original' : 'new';
  
  await supabase.from('member_opt_ins').insert({
    request_id: requestId,
    user_id: memberId,
    opt_in_type: 'split_existing',
    proposed_assignment: assignment,
    status: 'pending',
    notified_at: new Date().toISOString(),
  });
}

// For NEW members (split_new):
for (const memberId of newMemberIds) {
  await supabase.from('member_opt_ins').insert({
    request_id: requestId,
    user_id: memberId,
    opt_in_type: 'split_new',
    proposed_assignment: newMembersTarget[memberId],
    status: 'pending',
    notified_at: new Date().toISOString(),
  });
}

// Log notifications for all
```

### Opt-In Page

**`/app/requests/opt-in/[optInId]/page.tsx`**

**For Formation:**
- Header: "You're Invited to Join [Chapter Name]"
- Chapter details: name, location, schedule, leader name
- Leader's statement
- Other founding members listed

Form:
```
[ ] I want to join this chapter and commit to attending meetings

Confirm your contact information:
Address: [input, pre-filled if known] *
Phone: [input, pre-filled if known] *

[Confirm & Join]  [Decline]
```

**For Split (Existing Member):**
- Header: "[Chapter Name] is Splitting"
- Explanation of what's happening
- "You've been assigned to: [Original/New/Both]"
- Option to request different assignment (creates message on request)

Form:
```
[ ] I confirm my assignment to [Chapter(s)]

[Confirm]  [Request Different Assignment]
```

If "Request Different Assignment":
- Text field for what they want
- Creates message on the request thread
- Status stays 'pending' until resolved

**For Split (New Member):**
- Same as Formation opt-in
- Shows which chapter they're joining (Original or New)

### Opt-In Response Handling

```typescript
// POST /api/opt-ins/[optInId]/respond
async function handleOptInResponse(optInId: string, body: {
  response: 'confirm' | 'decline' | 'request_change';
  address?: string;
  phone?: string;
  change_request?: string;
}) {
  const optIn = await getOptIn(optInId);
  
  if (body.response === 'confirm') {
    await supabase.from('member_opt_ins').update({
      status: 'confirmed',
      confirmed_assignment: optIn.proposed_assignment,
      confirmed_address: body.address,
      confirmed_phone: body.phone,
      responded_at: new Date().toISOString(),
    }).eq('id', optInId);
    
    // Update user's address/phone if provided
    if (body.address || body.phone) {
      await supabase.from('users').update({
        address: body.address,
        phone: body.phone,
      }).eq('id', optIn.user_id);
    }
  } else if (body.response === 'decline') {
    await supabase.from('member_opt_ins').update({
      status: 'declined',
      responded_at: new Date().toISOString(),
    }).eq('id', optInId);
  } else if (body.response === 'request_change') {
    // Add message to request thread
    await supabase.from('lifecycle_request_messages').insert({
      request_id: optIn.request_id,
      sender_id: optIn.user_id,
      message: `Assignment change request: ${body.change_request}`,
    });
    // Status stays pending
  }
}
```

---

## Step 5: Leader Request Management

**`/app/requests/page.tsx`**

List of requests submitted by this leader.

**Header:**
- Title: "My Requests"
- Buttons: "+ Formation Request", "+ Split Request" (if leading a chapter ≥9)

**Request Cards:**
Each request as a card:
- Type badge (Formation/Split/Dissolution)
- Status badge (Draft/Submitted/In Review/Approved/Rejected/Withdrawn)
- For Formation: proposed chapter name
- For Split/Dissolution: chapter name
- Submitted date (if submitted)
- Opt-in progress: "5/6 members confirmed"
- Link to detail page

### Request Detail Page

**`/app/requests/[requestId]/page.tsx`**

**Header:**
- Back link
- Title: "[Type] Request" + status badge
- Subtitle: chapter name or proposed name

**Main Content (2/3):**

**Request Details Card**
- All submitted data, read-only after submission
- Edit button if status = 'draft'

**Opt-In Status Card** (for formation and split)
- List of all opt-ins
- Each: name, status badge (Pending/Confirmed/Declined), responded date
- Pending shown in yellow, Confirmed in green, Declined in red

**Conversation Thread Card**
- Messages between leader, members, and admin
- Newest at bottom
- Text input to add message
- Send button

**Sidebar (1/3):**

**Status Card**
- Current status with timestamp
- If rejected: show review notes

**Actions Card**
- If draft: [Submit Request], [Delete Draft]
- If submitted: [Withdraw Request]
- If approved: "Request approved on [date]"

---

## Step 6: Admin Request Queue

**`/app/admin/requests/page.tsx`**

Update Admin sidebar: add "📋 Lifecycle Requests" under Review section.

**Header:**
- Title: "Chapter Lifecycle Requests"

**Filter Tabs:**
- All
- Pending Review (submitted + in_review)
- Formation
- Split
- Dissolution

**Request Table:**
| Type | Chapter/Proposed | Submitted By | Submitted | Opt-Ins | Status | Action |
|------|------------------|--------------|-----------|---------|--------|--------|
| Badge | Name | Leader name | Date | 5/6 ✓ | Badge | Review → |

Opt-Ins column shows: confirmed/total, with warning icon if any declined.

---

## Step 7: Admin Request Review Page

**`/app/admin/requests/[requestId]/page.tsx`**

**Header:**
- Back link to queue
- Title: "[Type] Request"
- Status badge

**Main Content (2/3):**

**Request Summary Card**
Show all request data formatted nicely:

For Formation:
- Proposed Name, Location, Schedule
- Leader: name (link to member detail)
- Leader's Statement
- Founding Members: list with links

For Split:
- Original Chapter: name, link
- Reason for split
- New Chapter: name, location, schedule
- Original Chapter Members: list
- New Chapter Members: list
- Dual Membership: list
- New Members: list with target chapter
- New Chapter Leadership

For Dissolution:
- Chapter: name, link
- Reason
- Chapter Story
- Member Preferences

**Opt-In Status Card**
- Same as leader view
- Admin can see all responses

**Conversation Thread Card**
- Full thread
- Admin can add messages

**Sidebar (1/3):**

**Validation Card**
Checklist of requirements (auto-checked where possible):

For Formation:
- [ ] Leader is certified
- [ ] 5-8 founding members (including leader)
- [ ] All members confirmed (X/Y)
- [ ] No declined members (or handled)

For Split:
- [ ] Original chapter has ≥9 members
- [ ] Both resulting chapters have ≥5 members
- [ ] New chapter leader is certified
- [ ] All existing members confirmed assignments
- [ ] All new members confirmed

For Dissolution:
- [ ] Submitted by leader or backup
- [ ] Reason provided

**Actions Card**
```
Admin Notes:
[textarea]

[Approve Request]  [Reject Request]

[Mark In Review] (if currently 'submitted')
```

---

## Step 8: Request Execution on Approval

### Formation Approval

```typescript
async function executeFormationApproval(request: LifecycleRequest) {
  const data = request.request_data as FormationRequestData;
  
  // Create chapter
  const { data: chapter } = await supabase.from('chapters').insert({
    name: data.proposed_name,
    status: 'forming',
    default_location: data.proposed_location,
    recurring_meeting_day: data.meeting_day,
    recurring_meeting_time: data.meeting_time,
    meeting_frequency: data.meeting_frequency,
  }).select().single();
  
  // Add leader
  await supabase.from('chapter_memberships').insert({
    chapter_id: chapter.id,
    user_id: request.submitted_by,
    role: 'leader',
    is_active: true,
  });
  
  // Add confirmed founding members
  const confirmedOptIns = await supabase
    .from('member_opt_ins')
    .select('user_id')
    .eq('request_id', request.id)
    .eq('status', 'confirmed');
  
  for (const optIn of confirmedOptIns.data || []) {
    await supabase.from('chapter_memberships').insert({
      chapter_id: chapter.id,
      user_id: optIn.user_id,
      role: 'member',
      is_active: true,
    });
  }
  
  // Log to notification_log for all members
  // Create task for leader: "Schedule first meeting"
}
```

### Split Approval

```typescript
async function executeSplitApproval(request: LifecycleRequest) {
  const data = request.request_data as SplitRequestData;
  const originalChapter = await getChapter(request.chapter_id);
  
  // Create new chapter
  const { data: newChapter } = await supabase.from('chapters').insert({
    name: data.new_chapter_name,
    status: 'open',  // open immediately, members are experienced
    default_location: data.new_chapter_location,
    recurring_meeting_day: data.new_chapter_meeting_day || originalChapter.recurring_meeting_day,
    recurring_meeting_time: data.new_chapter_meeting_time || originalChapter.recurring_meeting_time,
    meeting_frequency: originalChapter.meeting_frequency,
    parent_chapter_id: originalChapter.id,
  }).select().single();
  
  // Get confirmed opt-ins
  const optIns = await supabase
    .from('member_opt_ins')
    .select('*')
    .eq('request_id', request.id)
    .eq('status', 'confirmed');
  
  for (const optIn of optIns.data || []) {
    const assignment = optIn.confirmed_assignment || optIn.proposed_assignment;
    
    if (assignment === 'original' || assignment === 'both') {
      // Keep/ensure membership in original (already exists for existing members)
      // For new members, create membership
      if (optIn.opt_in_type === 'split_new') {
        await supabase.from('chapter_memberships').insert({
          chapter_id: originalChapter.id,
          user_id: optIn.user_id,
          role: 'member',
          is_active: true,
        });
      }
    }
    
    if (assignment === 'new' || assignment === 'both') {
      // Create membership in new chapter
      const role = optIn.user_id === data.new_chapter_leader_id ? 'leader'
        : optIn.user_id === data.new_chapter_backup_leader_id ? 'backup_leader'
        : 'member';
      
      await supabase.from('chapter_memberships').insert({
        chapter_id: newChapter.id,
        user_id: optIn.user_id,
        role: role,
        is_active: true,
      });
    }
    
    if (assignment === 'new' && optIn.opt_in_type === 'split_existing') {
      // Remove from original chapter
      await supabase.from('chapter_memberships').update({
        is_active: false,
        left_at: new Date().toISOString(),
      }).eq('chapter_id', originalChapter.id).eq('user_id', optIn.user_id);
    }
  }
  
  // Ensure new chapter leader is set
  // Notify all members of their final assignments
  // Create tasks: schedule next meeting for both chapters
}
```

### Dissolution Approval

```typescript
async function executeDissolutionApproval(request: LifecycleRequest) {
  // Close chapter
  await supabase.from('chapters').update({
    status: 'closed',
  }).eq('id', request.chapter_id);
  
  // Deactivate all memberships
  await supabase.from('chapter_memberships').update({
    is_active: false,
    left_at: new Date().toISOString(),
  }).eq('chapter_id', request.chapter_id);
  
  // Members are now "unassigned" (no active memberships)
  // Their history (attendance, completion, commitments) remains tied to their user_id
  
  // Notify all former members
  // Log dissolution in leadership_log or similar
}
```

---

## Step 9: API Routes

### Request APIs

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/requests` | GET, POST | List my requests, create new |
| `/api/requests/[id]` | GET, PATCH, DELETE | Get, update, withdraw/delete |
| `/api/requests/[id]/submit` | POST | Submit draft request |
| `/api/requests/[id]/messages` | GET, POST | Get/add conversation messages |

### Opt-In APIs

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/opt-ins/[id]` | GET | Get opt-in details for response page |
| `/api/opt-ins/[id]/respond` | POST | Submit opt-in response |

### Admin APIs

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/admin/requests` | GET | List all requests (with filters) |
| `/api/admin/requests/[id]` | GET, PATCH | Get details, update status |
| `/api/admin/requests/[id]/approve` | POST | Approve and execute |
| `/api/admin/requests/[id]/reject` | POST | Reject with notes |
| `/api/admin/requests/[id]/messages` | POST | Add admin message |

---

## Step 10: Update Admin Sidebar

Add to Review section:
```
Review
  ✅ Meeting Validation  /admin/validation
  📋 Lifecycle Requests  /admin/requests
  🚩 Chapter Flags       /admin/flags
```

---

## Step 11: Notification Log Entries

For now, all notifications go to `notification_log` table. Email integration is future.

| Event | notification_type | Message |
|-------|-------------------|---------|
| Formation opt-in | `formation_opt_in` | "You've been invited to join [Chapter] chapter" |
| Split assignment | `split_assignment` | "[Chapter] is splitting. Please confirm your assignment." |
| Split new member | `split_new_member` | "You've been invited to join [Chapter] chapter" |
| Request approved | `request_approved` | "Your [type] request has been approved" |
| Request rejected | `request_rejected` | "Your [type] request was not approved" |
| New message | `request_message` | "New message on your [type] request" |

---

## Session 11 Success Criteria

**Formation Request:**
- [ ] Certified leader can access formation request form
- [ ] Form validates: 5-8 total members, all required fields
- [ ] Draft can be saved and edited
- [ ] Submit triggers opt-in notifications for all founding members
- [ ] Opt-in page shows chapter details and leader statement
- [ ] Member can confirm with address/phone
- [ ] Member can decline
- [ ] Opt-in status visible to leader and admin
- [ ] Admin can approve → chapter created (forming), members added
- [ ] Admin can reject with notes

**Split Request:**
- [ ] Leader of chapter ≥9 members can access split form
- [ ] Form shows all current members for assignment
- [ ] Members assignable to Original, New, or Both
- [ ] New members (unassigned) can be added to either chapter
- [ ] New chapter leader must be certified
- [ ] Submit triggers confirmations for all affected members
- [ ] Existing members confirm their assignment
- [ ] New members do full opt-in
- [ ] Admin can approve → new chapter created, memberships updated
- [ ] Dual memberships created where confirmed

**Dissolution Request:**
- [ ] Leader or backup can access dissolution form
- [ ] Form captures reason, story, member preferences
- [ ] Submit sends to admin queue
- [ ] Admin can approve → chapter closed, members unassigned
- [ ] Member history preserved (tied to user, not chapter)

**Shared Functionality:**
- [ ] Conversation thread works (leader ↔ admin ↔ members)
- [ ] Request status transitions correctly
- [ ] Leader can view all their requests
- [ ] Leader can withdraw submitted request
- [ ] Admin queue shows all pending requests
- [ ] Admin can filter by type and status
- [ ] Notifications logged for all events

---

## File Structure

```
/app/requests/
  page.tsx                              # My requests list
  [requestId]/page.tsx                  # Request detail (leader view)
  /formation/page.tsx                   # Formation request form
  /opt-in/[optInId]/page.tsx           # Opt-in response page

/app/chapter/[chapterId]/requests/
  /split/page.tsx                       # Split request form
  /dissolution/page.tsx                 # Dissolution request form

/app/admin/requests/
  page.tsx                              # Request queue
  [requestId]/page.tsx                  # Request review (admin view)

/components/requests/
  RequestCard.tsx
  OptInStatusList.tsx
  MemberAssignmentUI.tsx               # For split request
  ConversationThread.tsx

/app/api/requests/
  route.ts
  [id]/route.ts
  [id]/submit/route.ts
  [id]/messages/route.ts

/app/api/opt-ins/
  [id]/route.ts
  [id]/respond/route.ts

/app/api/admin/requests/
  route.ts
  [id]/route.ts
  [id]/approve/route.ts
  [id]/reject/route.ts
  [id]/messages/route.ts
```

---

## Notes for Future Sessions

- **Email notifications**: Replace notification_log with actual email sending
- **Special Consideration meetings**: Formal flow for split decisions, yearly reviews
- **"Find men near me"**: Discovery for formation
- **First Three meeting support**: Training workflow for new chapters

---

**Chapters are born, grow, divide, and sometimes end. Handle each transition with care.**