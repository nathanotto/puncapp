# Seed Data Instructions

## Overview

This seed data creates a realistic PUNC app environment with:
- **36 users** (35 + Nathan Otto)
- **23 waitlist users** (Fresh1-Fresh23) in Denver area
- **7 chapters** with themed names
- **73 meetings** (18 each for established chapters)
- **30+ commitments** across all chapters
- **Official PUNC curriculum modules**
- **Leader certifications and roles**

## Your Setup

- **Email:** notto@nathanotto.com
- **Role in The Oak Chapter:** Chapter Leader (12 members, 18 meetings)
- **Role in The Six Chapter:** Backup Leader (6 members, 18 meetings)

## Chapters Created

1. **The Oak Chapter** - Established (12 members, 18 meetings over 10 months)
2. **The Six Chapter** - Established (6 members, 18 meetings over 9 months)
3. **The Iron Brotherhood** - Established (12 members, 18 meetings over 11 months)
4. **The Mountain Chapter** - Mid-stage (8 members, 10 meetings over 6 months)
5. **The Phoenix Rising** - New (5 members, 5 meetings over 3 months)
6. **The Forge** - Forming (4 members, 2 meetings)
7. **The Wildwood** - Forming (4 members, 2 meetings)

## How to Run

### Option 1: Fresh Start (Recommended)

```bash
# 1. Clear all existing data (keeps your login)
node scripts/sql.js -f supabase/seed-clear-all.sql

# 2. Load users, chapters, roles
node scripts/sql.js -f supabase/seed-full-data.sql

# 3. Load meetings and commitments
node scripts/sql.js -f supabase/seed-full-data-part2.sql
```

### Option 2: Just Add to Existing

If you want to keep existing data and just add more:

```bash
# Just run parts 1 and 2 (skip the clear step)
node scripts/sql.js -f supabase/seed-full-data.sql
node scripts/sql.js -f supabase/seed-full-data-part2.sql
```

## What You'll See After Seeding

### Dashboard
- Your 5 active commitments (some overdue)
- Upcoming meetings from both chapters
- Stats showing your attendance history

### The Oak Chapter
- 18 historical meetings to test display
- 11 other members with memorable names
- Multiple commitments (yours and others)
- 1 flagged discrepancy for you to resolve

### The Six Chapter
- 18 historical meetings
- 5 other members
- You're Backup Leader (can do everything except some admin tasks)

### Commitments Page
- Mix of stretch goals, to_member, volunteer_activity, help_favor
- Some overdue (marked in red)
- 1 discrepancy to resolve

### Waitlist Users
- 23 users (Fresh1-Fresh23) with Denver addresses
- Status: unassigned
- Ready to be assigned to chapters

## Testing Scenarios

With this data you can test:
- [x] Viewing 18 historical meetings
- [x] RSVP to upcoming meetings
- [x] Create new commitments
- [x] Mark commitments complete
- [x] Resolve commitment discrepancies (as leader)
- [x] View attendance history
- [x] Meeting feedback display
- [x] Multiple chapter membership
- [x] Leader vs Backup Leader permissions
- [x] Forming vs Established chapter differences

## Notes

- All Denver metro addresses are fake but formatted correctly
- User names are memorable (Marcus Stone, David Rivers, etc.)
- Meeting topics cycle through PUNC curriculum
- Attendance is realistic (~85% in-person, ~15% video)
- Feedback ratings range from 6-10 (realistic distribution)
- 20% of commitments are overdue
- 10% of commitments have discrepancies
