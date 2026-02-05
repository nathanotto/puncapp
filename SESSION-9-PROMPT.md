# PUNCapp Session 9: Admin Foundation & Chapter/Member Management

## Context

Sessions 1-7 built the complete meeting cycle. Session 8 built testing infrastructure. Now we build the PUNC Admin foundation — the tools headquarters uses to manage chapters and members.

**Session 9 scope:** Admin access, dashboard, chapter management, member management, leader certification, simple chapter creation.

**NOT in Session 9:** Curriculum CRUD (Session 10), meeting validation (Session 10), chapter splitting (Session 11).

## Primary References

1. **TOD-SPECIFICATION.md** — Admin-related flows
2. **SESSION-8-PROMPT.md** — Seed data structure

---

## Step 1: Database Schema Updates

```sql
-- Add location fields to users for geographic chapter formation
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS participation_score integer DEFAULT 0;

-- Add leader certification tracking
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_leader_certified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS leader_certified_at timestamptz,
  ADD COLUMN IF NOT EXISTS leader_certification_expires_at timestamptz;

-- Add flags to chapters for attention tracking
ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS needs_attention boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS attention_reason text,
  ADD COLUMN IF NOT EXISTS parent_chapter_id uuid REFERENCES chapters(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chapters_attention ON chapters(needs_attention) WHERE needs_attention = true;
CREATE INDEX IF NOT EXISTS idx_users_certification ON public.users(is_leader_certified) WHERE is_leader_certified = true;
```

---

## Step 2: Admin Route Protection

**`/middleware.ts`**

Protect all `/admin/*` routes:
- If not logged in → redirect to `/auth/login`
- If logged in but `is_punc_admin = false` → redirect to `/dashboard`

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    
    const { data: user } = await supabase
      .from('users')
      .select('is_punc_admin')
      .eq('id', session.user.id)
      .single();
    
    if (!user?.is_punc_admin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
  
  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

---

## Step 3: Admin Layout with Sidebar

**`/app/admin/layout.tsx`**

- Verify user is admin (server-side check)
- Fixed sidebar on left (w-64)
- Main content area with padding

**`/components/admin/AdminSidebar.tsx`**

Sidebar sections:
```
PUNC Admin
[user name]

Overview
  📊 Dashboard        /admin

Management
  🏛️ Chapters         /admin/chapters
  👥 Members          /admin/members
  📚 Curriculum       /admin/curriculum (disabled, "Coming soon")

Review
  ✅ Meeting Validation  /admin/validation (disabled, "Coming soon")
  🚩 Chapter Flags       /admin/flags

Actions
  ⚙️ Admin Work       /admin/work

---
← Back to App        /dashboard
```

Highlight active route. Disabled items show tooltip "Coming in Session 10".

---

## Step 4: Admin Dashboard

**`/app/admin/page.tsx`**

### Stats Row (4 cards)
| Active Chapters | Total Members | Unassigned | Meetings This Month |
|-----------------|---------------|------------|---------------------|
| Link to /admin/chapters | Link to /admin/members | Link to /admin/members?filter=unassigned (orange if > 0) | No link |

### Queries for stats:
```typescript
// Active chapters
const { count: totalChapters } = await supabase
  .from('chapters')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'open');

// Total members
const { count: totalMembers } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true });

// Unassigned (not in any active membership)
// Get all user IDs that ARE assigned, then count users NOT in that set
const { data: assignedUserIds } = await supabase
  .from('chapter_memberships')
  .select('user_id')
  .eq('is_active', true);
const assignedSet = new Set(assignedUserIds?.map(m => m.user_id));
const { data: allUsers } = await supabase.from('users').select('id');
const unassignedCount = allUsers?.filter(u => !assignedSet.has(u.id)).length || 0;

// Meetings this month
const startOfMonth = new Date();
startOfMonth.setDate(1);
const { count: meetingsThisMonth } = await supabase
  .from('meetings')
  .select('*', { count: 'exact', head: true })
  .gte('scheduled_date', startOfMonth.toISOString().split('T')[0])
  .eq('status', 'completed');
```

### Action Cards Row (2 cards)

**Chapter Flags Card**
- Count of flagged chapters (red badge if > 0)
- List first 5 flagged chapter names with reasons
- Link: "View All Flags →" to /admin/flags

**Expiring Certifications Card** (yellow warning style, only show if any)
- List leaders whose certification expires within 30 days
- Each links to /admin/members/[id]

### Recent Unresolved Issues Table
- Query leadership_log where is_resolved = false, order by created_at desc, limit 5
- Columns: Type (badge), Chapter (link), Description, Date
- Type badges: meeting_started_late (yellow), member_checked_in_late (orange), member_not_contacted (red)

---

## Step 5: Chapters List Page

**`/app/admin/chapters/page.tsx`**

### Header
- Title: "Chapters"
- Button: "+ Create Chapter" → /admin/work/create-chapter

### Flagged Chapters Section (only if any exist)
- Red header: "🚩 Chapters Needing Attention (N)"
- Table with red ring/border

### All Chapters Table
| Chapter Name | Status | Members | Last Meeting | Next Meeting | Location | Action |
|--------------|--------|---------|--------------|--------------|----------|--------|
| Name + attention_reason if flagged | Badge | Count (orange if ≥10) | Date or — | Date or — | Truncated | View → |

---

## Step 6: Chapter Detail Page

**`/app/admin/chapters/[chapterId]/page.tsx`**

### Header
- Back link, title (chapter name), subtitle (location)
- Badges: Status, Flag badge if needs_attention

### Flag Actions Component (client)
- If not flagged: link to show flag form
- If flagged: banner with reason + "Clear Flag" button
- APIs: POST/DELETE `/api/admin/chapters/[id]/flag`

### Main Content (2/3)
- **Members Table**: Name/email, Role badge, Participation pts, Certified status, View link
- **Meeting History Table**: Date, Status badge, Notes (e.g., "⚠️ Started late")

### Sidebar (1/3)
- Chapter Info card (schedule, frequency, created date)
- Leadership Log card (recent entries)
- Curriculum Completed card (modules completed by chapter)

---

## Step 7: Members List Page

**`/app/admin/members/page.tsx`**

### Filter Tabs (pill buttons)
- All (N)
- Unassigned (N) — orange if > 0
- Leaders (N)
- Certified (N)

### Search Box (right-aligned)

### Table
| Name | Email | Chapter(s) | Participation | Certified | Action |
|------|-------|------------|---------------|-----------|--------|
| Name + @username | email | Chapter links with role badges, or "Unassigned" | N pts | ✓ or — | View → |

---

## Step 8: Member Detail Page

**`/app/admin/members/[memberId]/page.tsx`**

### Main Content (2/3)

**Basic Information Form**
- Fields: Name, Username, Email, Phone, Address
- Checkboxes: Tester Mode, PUNC Admin
- Save button → PATCH `/api/admin/members/[id]`

**Leader Certification Card**
- If certified: status, dates, Revoke button
- If not: Certify button
- POST/DELETE `/api/admin/members/[id]/certify`

**Chapter Memberships Card**
- Table: Chapter (link), Role (dropdown), Remove link
- Add to Chapter: chapter dropdown + role dropdown + Add button
- APIs for add/change/remove memberships

### Sidebar (1/3)
- Stats: participation, meetings attended, commitments
- Recent Attendance list
- Recent Commitments list

---

## Step 9: Chapter Flags Page

**`/app/admin/flags/page.tsx`**

### Flagged Chapters Section
- Table: Chapter, Reason, Date, View link
- Or "✓ No chapters flagged"

### Unresolved Issues by Chapter Section
- Group leadership_log by chapter
- Each chapter as card with issues listed inside

---

## Step 10: Admin Work Page

**`/app/admin/work/page.tsx`**

Grid of action cards:

| Card | Status | Link |
|------|--------|------|
| 🏛️ Create New Chapter | Enabled | /admin/work/create-chapter |
| 🎖️ Certify Leaders | Enabled | /admin/members?filter=leaders |
| 📚 Create Curriculum | Disabled | "Coming in Session 10" |
| ✂️ Split Chapter | Disabled | "Coming in Session 11" |

---

## Step 11: Create Chapter Flow

**`/app/admin/work/create-chapter/page.tsx`**

### Form Sections

**Chapter Details**
- Chapter Name *
- Default Meeting Location *
- Meeting Day * (dropdown)
- Meeting Time * (default 19:00)
- Frequency * (weekly/biweekly/monthly)

**Leadership**
- Chapter Leader * (dropdown of certified leaders)
- Backup Leader (optional)
- Warning if no certified leaders

**Initial Members**
- Checkboxes for unassigned users
- Show name, email, address

### Submit
POST `/api/admin/chapters` creates:
1. Chapter record
2. Leader membership (role=leader)
3. Backup leader membership if provided (role=backup_leader)
4. Member memberships (role=member)

---

## Step 12: API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/admin/members/[memberId]` | PATCH | Update user fields |
| `/api/admin/members/[memberId]/certify` | POST, DELETE | Certify/revoke leader |
| `/api/admin/members/[memberId]/chapters` | POST | Add to chapter |
| `/api/admin/memberships/[membershipId]` | PATCH, DELETE | Change role, remove |
| `/api/admin/chapters` | POST | Create chapter |
| `/api/admin/chapters/[chapterId]/flag` | POST, DELETE | Flag/unflag chapter |

All routes verify `is_punc_admin = true`.

---

## Step 13: Update Session 8 Seed Data

Add to seed states:
- Certify chapter leaders (Nathan, Orion, Prometheus)
- Set certification expiry to 1 year from seed date
- Flag one chapter with attention_reason in some states
- Add leadership_log entries with is_resolved=false

---

## Session 9 Success Criteria

- [ ] `/admin` only accessible when `is_punc_admin = true`
- [ ] Non-admins redirected to `/dashboard`
- [ ] Admin sidebar with sections, disabled items show "Coming soon"
- [ ] Dashboard shows 4 stat cards
- [ ] Dashboard shows flagged chapters
- [ ] Dashboard shows expiring certifications
- [ ] Dashboard shows unresolved issues
- [ ] Chapters list with member counts
- [ ] Flagged chapters at top with red styling
- [ ] Chapter detail shows members, meetings, log
- [ ] Chapter can be flagged/unflagged
- [ ] Members list with filters (All, Unassigned, Leaders, Certified)
- [ ] Members searchable
- [ ] Member detail editable
- [ ] Member can be certified/decertified
- [ ] Member can be added to chapter
- [ ] Member role changeable
- [ ] Member removable from chapter
- [ ] Flags page shows flagged chapters and issues
- [ ] Admin Work page with action cards
- [ ] Create Chapter form works
- [ ] Chapter creation includes all memberships

---

## File Structure

```
/app/admin/
  layout.tsx
  page.tsx                          # Dashboard
  /chapters/
    page.tsx                        # List
    [chapterId]/page.tsx            # Detail
  /members/
    page.tsx                        # List
    [memberId]/page.tsx             # Detail
  /flags/page.tsx
  /work/
    page.tsx                        # Landing
    /create-chapter/page.tsx

/components/admin/
  AdminSidebar.tsx
  ChapterFlagActions.tsx
  MemberEditForm.tsx
  CreateChapterForm.tsx

/app/api/admin/
  /members/[memberId]/route.ts
  /members/[memberId]/certify/route.ts
  /members/[memberId]/chapters/route.ts
  /memberships/[membershipId]/route.ts
  /chapters/route.ts
  /chapters/[chapterId]/flag/route.ts
```

---

**Foundation first. Complexity later.**