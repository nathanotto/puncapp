# Supabase Database Setup

This directory contains SQL migration files for the PUNC Chapter Management App database schema.

## Running Migrations

### Option 1: Supabase Dashboard (Recommended for getting started)

1. **Open the Supabase SQL Editor**:
   - Go to your Supabase project: https://supabase.com/dashboard/project/krfbavajdsgehhfngpcs
   - Click on **SQL Editor** in the left sidebar

2. **Run the migration**:
   - Copy the contents of `migrations/20260131_initial_schema.sql`
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

3. **Verify tables were created**:
   - Go to **Table Editor** in the left sidebar
   - You should see all the new tables: users, chapters, chapter_memberships, etc.

### Option 2: Supabase CLI (For automated migrations)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref krfbavajdsgehhfngpcs

# Run migrations
supabase db push
```

## What Gets Created

### Tables (Phase 1: MVP)
- ✅ **users** - User profiles (extends Supabase auth)
- ✅ **chapters** - Chapter information
- ✅ **chapter_memberships** - User-chapter relationships
- ✅ **chapter_roles** - Leader, Outreach, Program roles
- ✅ **chapter_member_types** - Regular vs Contributing members
- ✅ **meetings** - Scheduled and completed meetings
- ✅ **attendance** - RSVPs and check-ins
- ✅ **meeting_feedback** - Member ratings (1-10)

### Custom Types (Enums)
- user_status, display_preference, member_type
- chapter_status, meeting_frequency, meeting_status
- rsvp_status, attendance_type, funding_status

### Business Rules (Enforced by triggers)
- ✅ User can be in max 2 active chapters
- ✅ User can be leader in max 2 chapters
- ✅ Chapter Leader role requires leader certification
- ✅ User status auto-updates when joining/leaving chapters
- ✅ `updated_at` timestamps auto-update

### Security (Row Level Security)
- ✅ Users can view own profile
- ✅ Users can view profiles of chapter members
- ✅ Members can view their chapters
- ✅ Leaders can update their chapters
- ✅ Members can manage their own attendance
- ✅ Members can submit their own feedback

### Performance
- ✅ Indexes on foreign keys and frequently queried columns
- ✅ Optimized for chapter member lookups
- ✅ Fast meeting and attendance queries

## After Running the Migration

### Create Your First User

When a user signs up via Supabase Auth, you'll need to create their profile:

```sql
-- After user signs up with Supabase Auth, insert their profile
INSERT INTO users (id, name, phone, email, address, username, display_preference, leader_certified)
VALUES
  (auth.uid(), 'John Doe', '555-0123', 'john@example.com', '123 Main St, Austin, TX 78701', 'johnd', 'real_name', false);
```

This will be automated in the signup flow we build.

### Test the Schema

You can add test data to verify everything works:

```sql
-- Create a test chapter (after creating a certified leader user)
INSERT INTO chapters (name, status, meeting_schedule, next_meeting_location)
VALUES (
  'Test Chapter',
  'forming',
  '{"frequency": "biweekly", "day_of_week": 6, "time": "10:00", "location": {"street": "123 Main St", "city": "Austin", "state": "TX", "zip": "78701"}}'::jsonb,
  '{"street": "123 Main St", "city": "Austin", "state": "TX", "zip": "78701"}'::jsonb
);
```

## Migration Files

- `20260131_initial_schema.sql` - Phase 1 MVP tables and core functionality

Future migrations for Phases 2-5 will be added as separate numbered files.

## Troubleshooting

### "relation already exists"
If you see this error, tables may have been partially created. You can either:
1. Drop the database and start fresh (dev only!)
2. Comment out the CREATE TABLE statements that already exist

### "permission denied"
Make sure you're running the SQL as a Supabase admin (use the SQL Editor in the dashboard).

### RLS blocking queries
RLS policies require authentication. During development, you may want to temporarily disable RLS on specific tables for testing:

```sql
-- Disable RLS temporarily (dev only!)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable when done testing
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

---

**Next Steps**: After running this migration, we can build the authentication UI and start creating users!
