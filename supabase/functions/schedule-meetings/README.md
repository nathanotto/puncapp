# Schedule Meetings Edge Function

Automatically creates meetings for chapters based on their recurring schedule pattern.

## Purpose

Maintains a rolling schedule of 1-2 upcoming meetings (within next 30 days) for each active chapter based on their configured:
- `meeting_frequency` (weekly, biweekly, threeweekly, monthly)
- `meeting_day_of_week` (0=Sunday through 6=Saturday)
- `meeting_time`
- `meeting_location`

## Logic

For each active chapter:
1. Check existing scheduled meetings in the future
2. Calculate what meetings SHOULD exist based on recurring pattern
3. Create up to 2 meetings that are:
   - Missing from the schedule
   - Within the next 30 days
   - Following the chapter's recurring pattern

Also creates a "select_curriculum" task for the chapter Leader for each new meeting.

## Setup

### Deploy the function:
```bash
npx supabase functions deploy schedule-meetings
```

### Set up cron trigger (run daily at 2 AM):
```bash
npx supabase functions schedule schedule-meetings \
  --cron "0 2 * * *" \
  --region us-east-1
```

Or via Supabase Dashboard:
1. Go to Edge Functions → schedule-meetings
2. Click "Add Cron Job"
3. Enter: `0 2 * * *` (daily at 2 AM)

## Manual Trigger

To manually trigger the function (for testing):
```bash
npx supabase functions invoke schedule-meetings
```

Or via API:
```bash
curl -L -X POST 'https://<project-ref>.supabase.co/functions/v1/schedule-meetings' \
  -H 'Authorization: Bearer <anon-key>'
```

## Response Format

```json
{
  "success": true,
  "processed": 5,
  "created": 3,
  "skipped": 2,
  "errors": [],
  "timestamp": "2026-02-13T12:00:00Z"
}
```

## Requirements

- Chapters must have `status = 'active'`
- Chapters must have all recurring schedule fields set:
  - `meeting_frequency`
  - `meeting_day_of_week`
  - `meeting_time`
  - `meeting_location`
- Each chapter must have an active Leader (role='leader', is_active=true)

## Permissions

Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS policies.
