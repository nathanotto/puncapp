# RSVP Escalation Edge Function

This Supabase Edge Function handles automatic RSVP escalation for meetings.

## What it does

Runs daily to:
1. **3 days before meeting**: Send reminders (email + SMS) to non-responders, update task urgency to "reminded"
2. **2 days before meeting**: Create leader contact tasks for still-unresponsive members, update urgency to "escalated"

## Deployment

Deploy to Supabase:

```bash
supabase functions deploy rsvp-escalation
```

## Scheduling with pg_cron

To run this automatically every day at 9am UTC:

```sql
-- First, enable pg_cron extension (do once in Supabase Dashboard → Database → Extensions)

-- Then schedule the function:
SELECT cron.schedule(
  'rsvp-escalation-daily',
  '0 9 * * *',  -- 9am UTC daily
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/rsvp-escalation',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

Replace:
- `YOUR_PROJECT_REF` with your actual Supabase project reference
- `YOUR_SERVICE_ROLE_KEY` with your service role key from Supabase dashboard

## Manual Testing

For local testing during development, use the manual trigger instead:
- Dashboard: `/admin/notifications` → "Trigger Escalation" button
- API: `POST /api/trigger-escalation`

## Environment Variables

The edge function requires these environment variables (automatically available in Supabase):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin access

## Notifications

Currently all notifications are **simulated** and logged to `notification_log` with status 'simulated'.

To enable real email/SMS:
1. Set up Resend (email) and Twilio (SMS) accounts
2. Add API keys to Supabase secrets
3. Update the `sendNotification` function to make actual API calls
4. Change status from 'simulated' to 'sent' or 'failed'

See `/lib/notifications.ts` for commented code showing future implementation.
