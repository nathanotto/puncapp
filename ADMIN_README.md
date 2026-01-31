# PUNC Admin System

## Overview

The PUNC Admin system provides administrative oversight and analytics for all chapters, members, meetings, and funding across the platform.

## Phase 1 - Completed ✓

### Authentication
- Uses Supabase Auth with `is_admin` flag in users table
- Separate admin login at `/admin/login`
- Discreet "Admin login" link on member signin page
- Admin middleware protects all `/admin/*` routes

### Dashboard (http://localhost:3000/admin)
Key Performance Indicators:
- **Total Chapters**: Count by status (open/forming/closed)
- **Active Members**: Total across all chapters
- **Meetings This Month**: Completed meetings count
- **Average Attendance Rate**: Percentage across all completed meetings

### Navigation
- Dashboard - KPI overview
- Chapters - (placeholder for Phase 2)
- Users - (placeholder for Phase 2)
- Funding - (placeholder for Phase 3)
- Meetings - (placeholder for Phase 4)

## Setup Instructions

### 1. Run Migrations
```bash
# Add is_admin column to users table
# File: supabase/migrations/20260131_add_admin_role.sql
```

### 2. Create Admin User
```sql
-- Option A: Make existing user an admin
UPDATE users SET is_admin = true WHERE email = 'your@email.com';

-- Option B: Use seed file after signup
# File: supabase/seed-admin.sql
```

### 3. Access Admin Dashboard
1. Navigate to http://localhost:3000/admin/login
2. Sign in with admin credentials
3. You'll be redirected to the admin dashboard

## Design Philosophy

- **Utilitarian**: Clean, data-focused interface
- **Blue/Gray palette**: Different from member app's earth tones
- **Standard components**: HTML inputs, no custom design system
- **Fast**: Minimal styling, focus on functionality

## File Structure

```
app/admin/
├── login/page.tsx          # Admin login page
├── page.tsx                # Dashboard with KPIs
├── chapters/page.tsx       # Chapters management (placeholder)
├── users/page.tsx          # User management (placeholder)
├── funding/page.tsx        # Funding analytics (placeholder)
└── meetings/page.tsx       # Meeting validation (placeholder)

components/layout/
└── AdminLayout.tsx         # Shared admin layout with nav

lib/auth/
└── admin.ts                # requireAdmin() middleware

supabase/
├── migrations/20260131_add_admin_role.sql
└── seed-admin.sql
```

## Next Phases

### Phase 2: Chapter Health & Analytics
- All chapters list with filtering
- Individual chapter details
- Geographic map visualization
- Attendance trends
- Leader certification overview

### Phase 3: Funding Analytics Dashboard
- Funding health overview
- Chapter funding breakdown
- Charts: trends, deficit distribution
- Flagged chapters (6+ months deficit)
- Ledger transaction views

### Phase 4: Meeting Validation Queue
- List validated meetings
- Audio playback
- Mark "validated_for_donor"
- Export for Direct Outcomes

### Phase 5: Advanced Admin Tools
- Leader certification management
- Chapter formation queue
- Flagged issues dashboard
- Curriculum library management

## Security Notes

- Admin routes protected by `requireAdmin()` middleware
- Checks both authentication AND `is_admin` flag
- RLS policies allow admins to view/update all users
- Separate from member permissions

## Testing

1. Sign up a test account at http://localhost:3000/auth/signup
2. Run: `UPDATE users SET is_admin = true WHERE email = 'test@example.com';`
3. Login at http://localhost:3000/admin/login
4. Verify dashboard shows correct KPIs

## Future Considerations

- Add admin audit log
- Multi-level admin permissions (read-only vs full)
- Admin notifications/alerts
- Bulk operations
- CSV export functionality
