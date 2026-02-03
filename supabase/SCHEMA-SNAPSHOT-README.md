# Database Schema Snapshot

**Created:** 2026-02-01  
**File:** `schema-snapshot-2026-02-01.sql`  
**Size:** 31 KB (921 lines)  
**Source:** All 12 migration files compiled chronologically

## Purpose

This snapshot preserves the complete database schema before major revisions. It can be used to recreate the exact database structure on a fresh Supabase project.

## What's Included

This snapshot contains the complete schema from these migrations:

1. **20260131_0100_add_schema_modification_function.sql** - Helper function for schema changes
2. **20260131_0900_initial_schema.sql** - Core tables (users, chapters, memberships, meetings, attendance, commitments, curriculum)
3. **20260131_0901_add_chapter_roles.sql** - Chapter leadership roles table
4. **20260131_0902_add_profile_creation_rpc.sql** - RPC function for user profile creation
5. **20260131_0903_add_users_rls.sql** - Row Level Security for users table
6. **20260131_0904_add_test_data.sql** - Test data (Oak Chapter, curriculum modules)
7. **20260131_0905_add_join_request_handling.sql** - Join request approval system
8. **20260131_0906_add_meeting_feedback.sql** - Meeting ratings and feedback
9. **20260131_0907_add_commitment_tracking.sql** - Enhanced commitment status tracking
10. **20260131_1200_add_chapter_funding.sql** - Funding tracking and chapter updates/message board
11. **20260131_1400_update_test_data.sql** - Additional test data (The Six chapter)
12. **20260131_1500_add_admin_functions.sql** - Admin RPC functions

## Key Tables

### Core Tables
- **users** - User profiles and authentication
- **chapters** - Chapter information and settings
- **chapter_memberships** - User-chapter relationships
- **chapter_roles** - Leadership roles (Chapter Leader, Backup Leader, etc.)
- **join_requests** - Chapter membership requests

### Meetings
- **meetings** - Meeting scheduling and details
- **attendance** - Meeting attendance tracking with RSVP
- **meeting_feedback** - Post-meeting ratings and comments

### Commitments
- **commitments** - Member commitments with types (stretch_goal, to_member, volunteer_activity, help_favor)
- Discrepancy tracking between self-reported and recipient-reported status

### Curriculum
- **curriculum_modules** - PUNC curriculum content
- **meeting_curriculum** - Links meetings to curriculum modules

### Funding & Updates
- **chapter_funding** - Monthly funding contributions per member
- **chapter_updates** - Message board / chapter feed

## Key Features

- **Row Level Security (RLS)** enabled on all tables
- **Admin functions** for bypassing RLS
- **Comprehensive indexes** for performance
- **Foreign key constraints** with cascade deletes
- **JSONB fields** for flexible data (meeting locations, etc.)
- **Trigger functions** for timestamp management
- **Default values** and check constraints

## How to Use

### To restore this schema to a fresh database:

1. Create a new Supabase project
2. Get the database connection string from project settings
3. Run the snapshot:
   ```bash
   psql <connection_string> < supabase/schema-snapshot-2026-02-01.sql
   ```

### Or using Supabase CLI:

1. Link to your new project:
   ```bash
   npx supabase link --project-ref <project-ref>
   ```

2. Apply the snapshot:
   ```bash
   npx supabase db push < supabase/schema-snapshot-2026-02-01.sql
   ```

## Notes

- This snapshot includes all migrations up to 2026-01-31
- Some test data is included (Oak Chapter, The Six, curriculum modules)
- RLS policies are configured for multi-tenant access control
- Admin bypass functions require SERVICE_ROLE_KEY to use
- All timestamps use TIMESTAMPTZ for timezone awareness

## What's NOT Included

- User authentication records (these are in Supabase Auth, separate from database)
- Uploaded files/storage (if any)
- Environment-specific settings
- API keys and secrets
- Seed data (generated users, chapters, commitments, meetings)

## Migration History

All migrations are preserved in `supabase/migrations/` directory. This snapshot is simply a concatenation of all migration files for convenience.
