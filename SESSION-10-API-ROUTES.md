# Session 10 API Routes Summary

This document summarizes all API routes created during Session 10 for Curriculum Management and Meeting Validation.

## Curriculum Management APIs (Admin)

### Sequences

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/admin/curriculum/sequences` | POST | Create new curriculum sequence | ✅ Implemented |
| `/api/admin/curriculum/sequences/[id]` | GET | Get sequence details | ✅ Implemented |
| `/api/admin/curriculum/sequences/[id]` | PATCH | Update sequence (title, description, order, active status) | ✅ Implemented |
| `/api/admin/curriculum/sequences/[id]` | DELETE | Delete sequence | ✅ Implemented |
| `/api/admin/curriculum/sequences/[id]/modules` | POST | Add existing module to sequence | ✅ Implemented |
| `/api/admin/curriculum/sequences/[id]/modules/[moduleId]` | PATCH | Update module order in sequence | ✅ Implemented |
| `/api/admin/curriculum/sequences/[id]/modules/[moduleId]` | DELETE | Remove module from sequence | ✅ Implemented |

**Files:**
- `app/api/admin/curriculum/sequences/route.ts`
- `app/api/admin/curriculum/sequences/[id]/route.ts`
- `app/api/admin/curriculum/sequences/[id]/modules/route.ts`
- `app/api/admin/curriculum/sequences/[id]/modules/[moduleId]/route.ts`

### Modules

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/admin/curriculum/modules` | POST | Create new curriculum module | ✅ Implemented |
| `/api/admin/curriculum/modules/[id]` | GET | Get module details | ✅ Implemented |
| `/api/admin/curriculum/modules/[id]` | PATCH | Update module (content, assignment, settings) | ✅ Implemented |
| `/api/admin/curriculum/modules/[id]` | DELETE | Deactivate module (soft delete) | ✅ Implemented |

**Files:**
- `app/api/admin/curriculum/modules/route.ts`
- `app/api/admin/curriculum/modules/[id]/route.ts`

## Meeting Validation APIs

### Leader Validation

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/meetings/[meetingId]/validate` | POST | Leader validates meeting, advances to awaiting_admin | ✅ Implemented |

**Request Body:**
```typescript
{
  notes?: string  // Optional notes from leader
}
```

**Actions:**
- Updates `leader_validated_at`, `leader_validation_notes`
- Sets `validation_status` to `'awaiting_admin'`
- Marks validation task as completed
- Logs to `leadership_log`

**File:**
- `app/api/meetings/[meetingId]/validate/route.ts`

### Admin Validation

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/admin/meetings/[id]/validate` | POST | Admin approves or rejects meeting | ✅ Implemented |

**Request Body:**
```typescript
{
  action: 'approve' | 'reject',
  notes?: string,  // Optional for approve, required for reject
  admin_user_id: string
}
```

**Actions:**
- Updates `admin_validated_at`, `admin_validated_by`, `admin_validation_notes`
- Sets `validation_status` to `'approved'` or `'rejected'`
- Approved meetings are counted for donor reporting
- Rejected meetings are marked unfundable

**File:**
- `app/api/admin/meetings/[id]/validate/route.ts`

## Curriculum Response Handling

**Note:** Curriculum responses and assignment acceptance are handled via **Server Actions** (not REST APIs) as per Next.js App Router best practices.

### Server Actions (in `app/meetings/[meetingId]/run/actions.ts`)

| Action | Purpose | Status |
|--------|---------|--------|
| `submitCurriculumResponse()` | Submit response to reflective question | ✅ Implemented |
| `acceptCurriculumAssignment()` | Accept assignment, create commitment | ✅ Implemented |
| `completeCurriculum()` | Complete curriculum phase, track completion, create tasks for non-attendees | ✅ Enhanced |

**Functions:**

```typescript
// Submit curriculum response
export async function submitCurriculumResponse(
  meetingId: string,
  moduleId: string,
  response: string
): Promise<void>

// Accept curriculum assignment
export async function acceptCurriculumAssignment(
  meetingId: string,
  moduleId: string,
  assignmentText: string,
  dueDate: string
): Promise<void>

// Complete curriculum phase
export async function completeCurriculum(
  meetingId: string
): Promise<void>
```

## Authentication & Authorization

All API routes include:
- **Authentication check**: Verifies user is logged in via Supabase auth
- **Authorization check**:
  - Admin routes: Verifies `is_admin` flag
  - Leader routes: Verifies user is chapter leader
  - Member routes: Verifies user is part of the chapter

## Response Format

All API routes follow consistent response patterns:

**Success:**
```typescript
{
  success: true,
  data?: any  // Optional response data
}
```

**Error:**
```typescript
{
  error: string,  // Error message
  status: number  // HTTP status code
}
```

## Database Tables Accessed

### Curriculum Management
- `curriculum_sequences`
- `curriculum_modules`
- `curriculum_module_sequences`
- `member_curriculum_completion`
- `curriculum_responses`

### Meeting Validation
- `meetings` (validation_status, leader/admin validation fields)
- `pending_tasks`
- `leadership_log`

### Assignments
- `commitments` (type: 'curriculum_assignment')

## Testing Checklist

- [x] Curriculum CRUD operations
- [x] Sequence module management
- [x] Leader meeting validation
- [x] Admin meeting approval/rejection
- [x] Curriculum response submission
- [x] Assignment acceptance
- [x] Non-attendee task creation

## Migration Applied

```sql
supabase/migrations/20260208000000_add_curriculum_management_and_validation.sql
```

Added:
- Assignment fields to `curriculum_modules`
- `curriculum_module_sequences` junction table
- `member_curriculum_completion` tracking table
- Validation fields to `meetings`
- Appropriate indexes

---

**Session 10 Complete: All API routes and server actions implemented and tested.**
