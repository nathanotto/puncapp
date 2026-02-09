# PUNCapp Session 10: Curriculum Management & Meeting Validation

## Context

Session 9 built the Admin foundation (dashboard, chapters, members, leader certification). Now we add curriculum management for Admin and meeting validation workflow.

**Session 10 scope:** Curriculum CRUD, module library, sequence builder, meeting validation (leader sign-off + admin approval), curriculum phase enhancements for attendees.

**NOT in Session 10:** Self-study UI for non-attendees (task created but flow deferred), leader pre-meeting curriculum selection enhancements.

## Primary References

1. **TOD-SPECIFICATION.md** — Curriculum and validation flows
2. **SESSION-9-PROMPT.md** — Admin foundation we built

---

## Step 1: Database Schema Updates

```sql
-- Add fields to curriculum_modules
ALTER TABLE curriculum_modules
  ADD COLUMN IF NOT EXISTS assignment_text text,
  ADD COLUMN IF NOT EXISTS assignment_due_days integer DEFAULT 14,
  ADD COLUMN IF NOT EXISTS is_meeting_only boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add is_active to sequences
ALTER TABLE curriculum_sequences
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Junction table for modules in multiple sequences
CREATE TABLE IF NOT EXISTS curriculum_module_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES curriculum_modules(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES curriculum_sequences(id) ON DELETE CASCADE,
  order_in_sequence integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module_id, sequence_id)
);

-- Track member module completion
CREATE TABLE IF NOT EXISTS member_curriculum_completion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES curriculum_modules(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_id, meeting_id)
);

-- Meeting validation fields
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS leader_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS leader_validation_notes text,
  ADD COLUMN IF NOT EXISTS admin_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_validated_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS admin_validation_notes text,
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'pending' 
    CHECK (validation_status IN ('pending', 'awaiting_leader', 'awaiting_admin', 'approved', 'rejected'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_module_sequences_module ON curriculum_module_sequences(module_id);
CREATE INDEX IF NOT EXISTS idx_module_sequences_sequence ON curriculum_module_sequences(sequence_id);
CREATE INDEX IF NOT EXISTS idx_member_completion_user ON member_curriculum_completion(user_id);
CREATE INDEX IF NOT EXISTS idx_member_completion_module ON member_curriculum_completion(module_id);
CREATE INDEX IF NOT EXISTS idx_meetings_validation ON meetings(validation_status) 
  WHERE validation_status IN ('awaiting_leader', 'awaiting_admin');
```

---

## Step 2: Curriculum List Page (Admin)

**`/app/admin/curriculum/page.tsx`**

Replace the disabled placeholder from Session 9.

### Header
- Title: "Curriculum"
- Buttons: "+ New Sequence", "+ New Module"

### Sequences Section
Each sequence as a card:
- Header: sequence title, description, active/inactive badge, "Edit" link
- Body: ordered list of modules in that sequence
  - Each module row: order number, title, principle (truncated), badges (meeting-only, has-assignment), "Edit" link, "Remove" button (removes from sequence, not delete)
- Footer: "Add Module" button (opens searchable dropdown)

### Module Library Section
- Header: "Module Library" with count
- Collapsible section showing all modules not in any sequence (standalone)
- Each: title, principle, badges, "Edit" link
- Or message: "All modules are assigned to sequences"

### Queries
```typescript
// Get all sequences with their modules
const { data: sequences } = await supabase
  .from('curriculum_sequences')
  .select('*')
  .order('order_index');

// Get module-sequence links with module data
const { data: moduleLinks } = await supabase
  .from('curriculum_module_sequences')
  .select(`
    sequence_id,
    order_in_sequence,
    module:curriculum_modules(*)
  `)
  .order('order_in_sequence');

// Get all active modules for library check
const { data: allModules } = await supabase
  .from('curriculum_modules')
  .select('*')
  .eq('is_active', true);

// Find orphan modules (not in any sequence)
const linkedModuleIds = new Set(moduleLinks?.map(l => l.module?.id));
const orphanModules = allModules?.filter(m => !linkedModuleIds.has(m.id));
```

---

## Step 3: Sequence Editor Page

**`/app/admin/curriculum/sequences/[sequenceId]/page.tsx`**

Handle both `new` and existing sequence IDs.

### Form Fields
- Title *
- Description
- Order Index (for sorting sequences)
- Active checkbox

### Module Management Section (only for existing sequences)
- List of modules in order
- Each row: drag handle (future) or order number input, module title, "Remove" button
- When order number changed, modules re-sort automatically
- "Add Existing Module" button → searchable dropdown modal

### Searchable Module Dropdown
**`/components/admin/AddModuleDropdown.tsx`** (client component)

- Search input filters modules by title
- Shows modules not already in this sequence
- Click to add → POST to API → refresh

### Actions
- Save Sequence (create or update)
- Deactivate Sequence (set is_active=false)
- Delete Sequence (only if no modules attached? or cascade remove links?)

### APIs
- POST `/api/admin/curriculum/sequences` — create
- PATCH `/api/admin/curriculum/sequences/[id]` — update
- DELETE `/api/admin/curriculum/sequences/[id]` — deactivate or delete
- POST `/api/admin/curriculum/sequences/[id]/modules` — add module to sequence
- DELETE `/api/admin/curriculum/sequences/[id]/modules/[moduleId]` — remove module from sequence
- PATCH `/api/admin/curriculum/sequences/[id]/modules/[moduleId]` — update order

---

## Step 4: Module Editor Page

**`/app/admin/curriculum/modules/[moduleId]/page.tsx`**

Handle both `new` and existing module IDs.

### Form Sections

**Module Content**
- Title * (text)
- Principle * (text, short)
- Description * (textarea)
- Reflective Question * (textarea)
- Exercise * (textarea)

**Assignment (Optional)**
- Assignment Text (textarea) — if filled, module has an assignment
- Default Due Days (number, default 14)

**Settings**
- Meeting Only checkbox (default true) — if false, can be done via self-study
- Active checkbox (default true)

**Sequences**
- List of sequences this module belongs to
- Each: sequence name, order in sequence, "Remove" link
- "Add to Sequence" button → dropdown of sequences not already in

### Preview Section
Shows how module will appear to members during meeting:
- Title, principle
- Description
- Reflective question
- Exercise
- Assignment (if any) with due days

### Actions
- Save Module
- Deactivate Module (set is_active=false)

### APIs
- POST `/api/admin/curriculum/modules` — create
- PATCH `/api/admin/curriculum/modules/[id]` — update
- DELETE `/api/admin/curriculum/modules/[id]` — deactivate

---

## Step 5: Sequence Visualization Component

**`/components/admin/SequenceVisualization.tsx`**

A reusable component showing a sequence as a linear list:
- Sequence title at top
- Each module as a row/card:
  - Order number
  - Module title
  - Module description (truncated or full)
  - Optional: completion status per chapter (for future use)

Used in:
- Sequence editor page (shows current structure)
- Could be used in chapter curriculum history (future)

---

## Step 6: Meeting Validation - Leader Sign-Off

### When Meeting Completes
Update the meeting completion logic (from Session 6/7):

```typescript
// When meeting status changes to 'completed'
await supabase.from('meetings').update({
  status: 'completed',
  completed_at: new Date().toISOString(),
  validation_status: 'awaiting_leader', // NEW
}).eq('id', meetingId);

// Create leader validation task
await supabase.from('pending_tasks').insert({
  task_type: 'validate_meeting',
  assigned_to: leaderId,
  related_entity_type: 'meeting',
  related_entity_id: meetingId,
  due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  metadata: { chapter_id: chapterId },
});
```

### Leader Validation Page

**`/app/chapter/[chapterId]/meetings/[meetingId]/validate/page.tsx`**

Only accessible to chapter leader. Check validation_status = 'awaiting_leader'.

**Content:**
- Header: "Validate Meeting" with date
- Full meeting summary (same as post-meeting summary):
  - Attendance list
  - Duration
  - Section time logs
  - Curriculum completed
  - Feedback ratings
  - Any flags (late start, overtime)
- Acknowledgment section:
  - Checkbox: "I formally acknowledge that this meeting took place as described here"
  - Optional notes field
  - [Submit Validation] button (disabled until checkbox checked)

**On Submit:**
```typescript
await supabase.from('meetings').update({
  leader_validated_at: new Date().toISOString(),
  leader_validation_notes: notes || null,
  validation_status: 'awaiting_admin',
}).eq('id', meetingId);

// Mark task complete
await supabase.from('pending_tasks').update({
  status: 'completed',
  completed_at: new Date().toISOString(),
}).eq('related_entity_id', meetingId).eq('task_type', 'validate_meeting');

// Log to leadership log
await supabase.from('leadership_log').insert({
  chapter_id: chapterId,
  meeting_id: meetingId,
  user_id: leaderId,
  log_type: 'leader_validated_meeting',
  description: 'Leader validated meeting',
});
```

---

## Step 7: Meeting Validation - Admin Queue

**`/app/admin/validation/page.tsx`**

Replace the disabled placeholder from Session 9.

### Header
- Title: "Meeting Validation"

### Awaiting Admin Section
- Table of meetings where validation_status = 'awaiting_admin'
- Columns: Chapter, Meeting Date, Leader Validated (date), Leader Notes (truncated), Action
- Action: "Review" button → links to review page
- Order by leader_validated_at ascending (oldest first)

### Recently Processed Section
- Table of meetings where validation_status IN ('approved', 'rejected')
- Columns: Chapter, Meeting Date, Status (badge), Reviewed By, Reviewed At
- Limit 20, order by admin_validated_at descending

---

## Step 8: Meeting Validation - Admin Review Page

**`/app/admin/validation/[meetingId]/page.tsx`**

### Header
- Back link to queue
- Title: "Review Meeting"
- Subtitle: Chapter name, meeting date

### Meeting Detail (2/3 width)
Show comprehensive meeting summary:

**Summary Card**
- Attendance: X / Y (checked in / RSVP'd yes)
- Duration: X minutes
- Average Rating: X / 10 (N responses)
- Started Late: Yes/No
- Curriculum: Module title (if any)

**Attendance List**
- All attendees with check-in time, attendance type, late flag

**Time Breakdown**
- Section-by-section time logs
- Total overtime used

**Curriculum Responses** (if curriculum was done)
- List of attendee responses to reflective question

**Feedback Summary**
- Distribution of ratings
- "Most value" selections

**Leader Validation**
- Leader name
- Validated at (date/time)
- Leader notes (if any)

**Recording** (if exists)
- Duration
- Link/path

### Validation Actions (1/3 width, sidebar)

**Validation Decision Card**
- Admin Notes textarea (optional for approve, encouraged for reject)
- [Approve Meeting] button (green)
- [Reject Meeting] button (red outline)
- Help text: "Approved meetings are counted for donor reporting. Rejected meetings are marked unfundable."

**On Approve:**
```typescript
await supabase.from('meetings').update({
  admin_validated_at: new Date().toISOString(),
  admin_validated_by: adminUserId,
  admin_validation_notes: notes || null,
  validation_status: 'approved',
}).eq('id', meetingId);
```

**On Reject:**
```typescript
await supabase.from('meetings').update({
  admin_validated_at: new Date().toISOString(),
  admin_validated_by: adminUserId,
  admin_validation_notes: notes, // should have notes for rejection
  validation_status: 'rejected',
}).eq('id', meetingId);
```

Redirect to queue after action.

---

## Step 9: Curriculum Phase Enhancements (Meeting Runner)

Update the curriculum phase in the meeting runner (built in Sessions 5-7).

### Curriculum Phase UI for Attendees

**`/components/meeting/CurriculumPhase.tsx`** (enhance existing)

When meeting reaches curriculum phase, attendees on their devices see:

**Module Display**
- Title (large)
- Principle (emphasized)
- Description
- Reflective Question (highlighted)
- Exercise instructions
- Assignment (if any) with default due date

**Response Entry**
- Textarea for response to reflective question
- Placeholder: "Enter your reflection... (required)"
- "Not choosing to respond" button (fills response with that text)
- [Submit Response] button

**After Submitting Response**
- See all attendee responses (name + response text)
- Responses appear as others submit (real-time or refresh)

**Assignment Acceptance** (if module has assignment)
- After response submitted, show:
  - Assignment text
  - Due date picker (default: meeting date + assignment_due_days)
  - [Accept Assignment] button
  - [Pass] button
- If Accept: create Commitment immediately

### Data Flow

**Submit Response:**
```typescript
await supabase.from('curriculum_responses').insert({
  meeting_id: meetingId,
  module_id: moduleId,
  user_id: attendeeId,
  response: responseText,
  submitted_at: new Date().toISOString(),
});
```

**Accept Assignment:**
```typescript
await supabase.from('commitments').insert({
  committer_id: attendeeId,
  commitment_type: 'curriculum_assignment',
  description: module.assignment_text,
  status: 'active',
  due_date: selectedDueDate,
  created_at_meeting_id: meetingId,
  metadata: { module_id: moduleId },
});
```

**Track Completion (when curriculum phase ends):**
For each attendee who submitted a response (not just "present"):
```typescript
await supabase.from('member_curriculum_completion').insert({
  user_id: attendeeId,
  module_id: moduleId,
  meeting_id: meetingId,
  completed_at: new Date().toISOString(),
});
```

### Create Tasks for Non-Attendees

When curriculum phase ends, for each chapter member who did NOT attend:
```typescript
// Get chapter members who are not in attendance
const nonAttendees = chapterMembers.filter(m => !attendeeIds.includes(m.user_id));

for (const member of nonAttendees) {
  await supabase.from('pending_tasks').insert({
    task_type: 'complete_curriculum_module',
    assigned_to: member.user_id,
    related_entity_type: 'curriculum_module',
    related_entity_id: moduleId,
    metadata: { 
      meeting_id: meetingId,
      chapter_id: chapterId,
      module_title: module.title,
    },
  });
}
```

The UI for completing this task (self-study) is deferred to a future session.

---

## Step 10: View Responses (Leader)

Leaders should be able to see curriculum responses anytime.

**`/app/chapter/[chapterId]/curriculum/responses/page.tsx`**

Or add a section to the meeting detail page.

### Content
- Filter by meeting or view all
- Table: Meeting Date, Module, Member, Response, Submitted At
- Or grouped by meeting/module

### Access
- Only leaders of the chapter can view
- Could also add to Admin chapter detail page

---

## Step 11: API Routes

### Curriculum APIs

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/admin/curriculum/sequences` | POST | Create sequence |
| `/api/admin/curriculum/sequences/[id]` | GET, PATCH, DELETE | Read, update, deactivate sequence |
| `/api/admin/curriculum/sequences/[id]/modules` | POST | Add module to sequence |
| `/api/admin/curriculum/sequences/[id]/modules/[moduleId]` | PATCH, DELETE | Update order, remove from sequence |
| `/api/admin/curriculum/modules` | POST | Create module |
| `/api/admin/curriculum/modules/[id]` | GET, PATCH, DELETE | Read, update, deactivate module |

### Validation APIs

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/meetings/[id]/validate` | POST | Leader validates meeting |
| `/api/admin/meetings/[id]/validate` | POST | Admin approves/rejects meeting |

### Curriculum Response APIs

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/meetings/[id]/curriculum/responses` | GET, POST | Get all responses, submit response |
| `/api/meetings/[id]/curriculum/accept-assignment` | POST | Accept assignment, create commitment |

---

## Step 12: Update Admin Sidebar

Enable the previously disabled items:
- 📚 Curriculum → /admin/curriculum (now enabled)
- ✅ Meeting Validation → /admin/validation (now enabled)

---

## Session 10 Success Criteria

**Curriculum Management:**
- [ ] Curriculum list shows sequences with modules
- [ ] Sequence can be created with title, description
- [ ] Sequence can be edited and deactivated
- [ ] Module can be created with all fields
- [ ] Module can be edited and deactivated
- [ ] Module can have assignment text and due days
- [ ] Module can be added to sequence via searchable dropdown
- [ ] Module can be removed from sequence (stays in library)
- [ ] Module can be in multiple sequences
- [ ] Module order in sequence can be changed
- [ ] Modules re-sort when order changed
- [ ] Standalone modules shown in Module Library section
- [ ] Sequence visualization shows linear list of modules

**Meeting Validation:**
- [ ] Meeting completion sets validation_status = 'awaiting_leader'
- [ ] Leader validation task created with 24-hour due date
- [ ] Leader can view meeting summary and validate
- [ ] Leader must check acknowledgment before submitting
- [ ] Leader validation updates status to 'awaiting_admin'
- [ ] Admin validation queue shows awaiting meetings
- [ ] Admin can review full meeting detail
- [ ] Admin can approve meeting
- [ ] Admin can reject meeting (marks unfundable)
- [ ] Recently processed meetings shown in queue

**Curriculum in Meeting:**
- [ ] Attendees see full module content on devices
- [ ] Attendees can submit response (required)
- [ ] "Not choosing to respond" option available
- [ ] All attendees see all responses after submitting
- [ ] Assignment acceptance creates Commitment with due date
- [ ] Due date adjustable at acceptance
- [ ] Member completion tracked when response submitted
- [ ] Non-attendees get task to complete module (UI deferred)

**Leader Access:**
- [ ] Leaders can view curriculum responses for their chapter

---

## File Structure

```
/app/admin/curriculum/
  page.tsx                              # Curriculum list
  /sequences/
    [sequenceId]/page.tsx               # Sequence editor (new + edit)
  /modules/
    [moduleId]/page.tsx                 # Module editor (new + edit)

/app/admin/validation/
  page.tsx                              # Validation queue
  [meetingId]/page.tsx                  # Admin review page

/app/chapter/[chapterId]/
  /meetings/[meetingId]/
    validate/page.tsx                   # Leader validation
  /curriculum/
    responses/page.tsx                  # View responses (leader)

/components/admin/
  AddModuleDropdown.tsx
  SequenceVisualization.tsx

/components/meeting/
  CurriculumPhase.tsx                   # Enhanced

/app/api/admin/curriculum/
  /sequences/route.ts
  /sequences/[id]/route.ts
  /sequences/[id]/modules/route.ts
  /sequences/[id]/modules/[moduleId]/route.ts
  /modules/route.ts
  /modules/[id]/route.ts

/app/api/admin/meetings/
  [id]/validate/route.ts

/app/api/meetings/
  [id]/validate/route.ts
  [id]/curriculum/responses/route.ts
  [id]/curriculum/accept-assignment/route.ts
```

---

## Notes for Session 11

Session 11 will add:
- Chapter splitting workflow
- Split request submission by Leader
- Split request review in Admin
- Data inheritance (archive original, create children)
- Member opt-in process

---

**Build the curriculum. Validate the work.**