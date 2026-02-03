# Session 3: RSVP Escalation - Testing Guide

## Overview
This document guides you through testing the complete RSVP escalation flow from Session 3.

## Pre-Test Setup

1. **Ensure seed data is fresh:**
   ```bash
   node scripts/seed-escalation-test.js
   ```

   This creates:
   - Meeting 3 days from now (for reminder test)
   - Meeting 2 days from now (for leader task test)
   - Sets you as a leader

2. **Navigate to the dashboard:**
   - Go to http://localhost:3000/
   - You should see 2 RSVP tasks

## Test A: Reminder Flow (3 Days Before Meeting)

### Steps:

1. **View initial task state:**
   - Go to http://localhost:3000/
   - Find the RSVP task for the meeting 3 days away
   - **Expected:** White background, "normal" urgency (no badge)

2. **Trigger escalation:**
   - Go to http://localhost:3000/admin/notifications
   - Click "Trigger Escalation" button
   - **Expected:** Success message showing "Found 1 meetings in 3 days"

3. **Verify notifications sent:**
   - Stay on /admin/notifications page
   - **Expected:** See 2 new simulated notifications:
     - Email: "RSVP needed: The Oak Chapter meeting..."
     - SMS: "PUNC: You haven't RSVPed..."
   - Both should have **⚠️ SIMULATED** badge prominently displayed

4. **Check task urgency updated:**
   - Go back to http://localhost:3000/
   - Find the same RSVP task
   - **Expected:**
     - Orange-50 background (light orange)
     - "Texted & Emailed" badge visible
     - Task urgency = "reminded"

5. **Verify database:**
   - Check `attendance` table: `reminder_sent_at` should be set
   - Check `pending_tasks`: `urgency` should be "reminded"

### ✅ Test A Success Criteria:
- [ ] Notifications logged to notification_log
- [ ] Email and SMS both simulated
- [ ] Task urgency updated to "reminded"
- [ ] Visual urgency (orange background and badge) shows on dashboard
- [ ] reminder_sent_at timestamp recorded in attendance

## Test B: Leader Task Flow (2 Days Before Meeting)

### Steps:

1. **Trigger escalation again:**
   - Go to http://localhost:3000/admin/notifications
   - Click "Trigger Escalation" button
   - **Expected:** Success message showing "Found 1 meetings in 2 days"

2. **Verify leader contact task created:**
   - Go to http://localhost:3000/
   - **Expected:** See new task "Contact [Member Name] About RSVP"
   - Should have normal urgency (it's a new task for you)

3. **Verify member's task escalated:**
   - The member's RSVP task should now show:
     - Orange-100 background (darker orange)
     - "Leader Reaching Out" badge
     - Task urgency = "escalated"

4. **Check notifications:**
   - Go to http://localhost:3000/admin/notifications
   - **Expected:** New simulated email to leader:
     - Subject: "Action needed: Contact [Member Name] about RSVP"
     - Purpose: task_created

5. **Verify database:**
   - Check `pending_tasks`: New task with type "contact_unresponsive_member"
   - Check member's task: `urgency` should be "escalated"

### ✅ Test B Success Criteria:
- [ ] Leader contact task created
- [ ] Task assigned to all leaders/backup leaders
- [ ] Member's RSVP task escalated to "escalated" urgency
- [ ] Visual urgency (darker orange, "Leader Reaching Out" badge)
- [ ] Email notification sent to leader

## Test C: RSVP List View (Escalation Status)

### Steps:

1. **Navigate to RSVP list:**
   - From dashboard, click on one of your RSVP tasks
   - Click "View RSVP Summary" or navigate to `/meetings/[meetingId]/rsvps`

2. **View as regular member:**
   - **Expected for "reminded" member:**
     - Orange background on member card
     - Text: "Texted & emailed on [date], leader reaching out"
     - No phone number visible (not a leader viewing)

3. **View as leader:**
   - Since you're a leader, you should see:
     - Phone numbers for non-responders (clickable tel: links)
     - "Log Outreach" form under non-responder cards

4. **Verify all members displayed:**
   - Should see all chapter members
   - Color-coded by RSVP status:
     - Green: Yes
     - Red: No
     - Orange: No Response

### ✅ Test C Success Criteria:
- [ ] All members shown with RSVP status
- [ ] Escalation status visible to all members
- [ ] Phone numbers visible to leaders only
- [ ] Log outreach form visible to leaders only

## Test D: Contact Task Screen

### Steps:

1. **Open contact task:**
   - From dashboard, click "Contact [Member Name] About RSVP" task

2. **Verify context displayed:**
   - **Expected to see:**
     - Member name
     - Member phone number (clickable)
     - Meeting details (chapter, date, time, location)
     - Situation box explaining: "hasn't responded", "texted and emailed on [date]"

3. **Verify form:**
   - Text area for notes
   - "Log Outreach" button
   - Info box explaining what happens when you submit

### ✅ Test D Success Criteria:
- [ ] Member contact info displayed
- [ ] Meeting context clear
- [ ] Form ready for input
- [ ] Clear explanation of consequences

## Test E: Log Outreach (Complete Flow)

### Steps:

1. **Log outreach from contact task:**
   - Open contact task: `/tasks/meeting-cycle/contact-unresponsive-member?attendance=[id]&task=[id]`
   - Enter notes: "Called him, he's dealing with a family issue and won't make it to this one"
   - Click "Log Outreach"
   - **Expected:** Redirect to dashboard

2. **Verify tasks completed:**
   - Go to dashboard
   - **Expected:** Both tasks gone (contact task and member's RSVP task)

3. **Check RSVP list:**
   - Go to `/meetings/[meetingId]/rsvps`
   - Find the member you logged outreach for
   - **Expected:**
     - Blue box showing: "Leader spoke with [Member]: [your notes]"
     - Shows who logged it and when
     - RSVP status changed to "No"

4. **Verify database:**
   - Check `attendance`:
     - `leader_outreach_logged_at` set
     - `leader_outreach_notes` contains your text
     - `leader_outreach_by` = your user ID
     - `rsvp_status` = "no"
   - Check `pending_tasks`: Both tasks have `completed_at` set
   - Check `meeting_agenda_items`: New item created with type "housekeeping"

### ✅ Test E Success Criteria:
- [ ] Both tasks completed
- [ ] Outreach notes saved to attendance
- [ ] RSVP status updated to "no"
- [ ] Agenda item created for meeting
- [ ] Outreach visible on RSVP list with leader attribution

## Test F: Log Outreach from RSVP List (Alternative Flow)

### Steps:

1. **Reset test data:**
   ```bash
   node scripts/seed-escalation-test.js
   ```

2. **Navigate directly to RSVP list:**
   - Go to `/meetings/[meetingId]/rsvps`
   - As a leader, you should see log outreach forms under non-responders

3. **Log outreach inline:**
   - Enter notes in the form directly on the RSVP list page
   - Click "Log Outreach"
   - **Expected:** Page refreshes, outreach logged

4. **Verify same results as Test E:**
   - Tasks completed
   - Outreach visible on RSVP list
   - Agenda item created

### ✅ Test F Success Criteria:
- [ ] Can log outreach from RSVP list
- [ ] Same database updates as Test E
- [ ] Page refreshes to show updated state

## Complete Success Checklist

### Database Schema:
- [x] notification_log table exists
- [x] meeting_agenda_items table exists
- [x] attendance has reminder and outreach fields
- [x] pending_tasks has urgency field

### Notification System:
- [x] Notifications logged with "simulated" status
- [x] Email and SMS tracked separately
- [x] Admin page shows notifications with prominent SIMULATED badges

### Escalation Logic:
- [x] Identifies meetings 3 days away
- [x] Sends reminders to non-responders
- [x] Updates task urgency to "reminded"
- [x] Identifies meetings 2 days away
- [x] Creates leader contact tasks
- [x] Updates task urgency to "escalated"

### Visual Indicators:
- [x] Normal tasks: white background
- [x] Reminded tasks: orange-50 background + "Texted & Emailed" badge
- [x] Escalated tasks: orange-100 background + "Leader Reaching Out" badge

### RSVP List Features:
- [x] Shows escalation status to all members
- [x] Leaders see phone numbers
- [x] Leaders see log outreach forms
- [x] Displays outreach notes after logging

### Task Screens:
- [x] Contact task shows member info and context
- [x] Form to log outreach notes
- [x] Clear explanation of consequences

### Outreach Logging:
- [x] Completes leader's contact task
- [x] Completes member's RSVP task
- [x] Updates attendance with notes
- [x] Creates meeting agenda item
- [x] Works from both contact task and RSVP list

## Known Limitations (Future Work)

- Notifications are simulated only (no real email/SMS)
- No pg_cron scheduling (manual trigger only)
- No "leader miss" flagging to PUNC admin
- No automatic meeting generation from recurring schedule

## Ready for Session 4

Once all tests pass, Session 3 is complete and you're ready for Session 4: Check-in to Meeting.
