# Audit & Fix: Meeting Scheduling and Summary Links

## Context

PUNCapp has meeting scheduling and meeting summary features built across Sessions 2–7. But the navigation links to these features may be missing or broken. This prompt asks you to audit what exists and make sure Leaders and Backup Leaders can actually reach these features from the natural places in the app.

## Step 1: Audit What Exists

Search the codebase and report back on what you find for each of these:

### Meeting Scheduling
- Is there a page/route for scheduling a meeting? Check for:
  - `/tasks/meeting-cycle/schedule-meeting`
  - `/meetings/schedule`
  - `/meetings/new`
  - Any route with "schedule" in the path
  - Any server action named `scheduleMeeting` or similar
- Is there a form that lets a Leader set date, time, location for a new meeting?
- Can a Leader only schedule if they're Leader or Backup Leader of the chapter?

### Meeting Summary
- Is there a page/route for viewing a completed meeting's summary? Check for:
  - `/meetings/[meetingId]/summary`
  - `/meetings/[meetingId]` (might show summary when status is completed/validated)
  - Any component named `MeetingSummary` or similar
- Does it show: duration, attendance count, commitments made, curriculum covered, average rating, audio status?

### Upcoming Meetings on Dashboard
- Does the member dashboard show upcoming scheduled meetings?
- Does it show pending RSVP tasks for upcoming meetings?
- Is the next meeting date/time/location visible?

### Past Meetings List
- Is there a way to see a list of past meetings for a chapter?
- Can you click into any past meeting to see its summary?

**Report what you find before making any changes.** List each feature as: EXISTS (path), PARTIAL (what's missing), or MISSING.

## Step 2: Add Missing Links

Based on what you found, add navigation links in the following locations. Only add what's missing — don't duplicate links that already work.

### Where "Schedule Meeting" Should Be Accessible

These are the natural places a Leader would look for this:

1. **Chapter dashboard / chapter detail page** — If the Leader is viewing their chapter and there's no upcoming meeting scheduled, show a prominent "Schedule Next Meeting" button. Only visible to Leader and Backup Leader of that chapter.

2. **After closing a meeting** — The meeting close confirmation should include a "Schedule Next Meeting" link as the next step. This is the most natural moment — you just finished a meeting, now schedule the next one.

3. **Pending tasks on dashboard** — If no upcoming meeting is scheduled for the chapter, create a pending task: "Schedule your next [Chapter Name] meeting." Assigned to Leader and Backup Leader.

**Permissions:** Only users who are `leader` or `backup_leader` in `chapter_memberships` for that chapter can see the schedule button and access the scheduling page. All other members should not see it.

### Where "Meeting Summary" Should Be Accessible

1. **Meeting detail page** — If a meeting's status is `completed` or `validated`, the meeting page should show (or link to) the summary. Any chapter member can view this.

2. **Past meetings list** — There should be a way to browse past meetings for a chapter and click into any of them. Each completed meeting links to its summary. Accessible to all chapter members.

3. **After meeting validation** — The validation confirmation should link to the meeting summary.

4. **Admin meeting review** — Admin should be able to click into any meeting and see its summary.

**Permissions:** Any member of the chapter can view meeting summaries for their chapter's meetings. Admins can view any meeting summary.

### Where "Upcoming Meetings" Should Be Visible

1. **Member dashboard** — The top card should show the next upcoming meeting for each chapter the member belongs to. Show: date, time, location, RSVP status, and a link to RSVP if they haven't yet.

2. **Chapter detail page** — Show the next scheduled meeting prominently at the top.

## Step 3: Verify the Links Work

After adding links, verify:

- [ ] As a Leader: I can see "Schedule Meeting" on my chapter page when no meeting is upcoming
- [ ] As a Leader: After closing a meeting, I see a link to schedule the next one
- [ ] As a regular member: I do NOT see "Schedule Meeting" anywhere
- [ ] As any member: I can see upcoming meetings on my dashboard
- [ ] As any member: I can click into a completed meeting and see its summary
- [ ] As any member: I can browse past meetings for my chapter
- [ ] As admin: I can see meeting summaries for any chapter

## Important Notes

- Do NOT rebuild these features from scratch if they exist. Just add the missing navigation links.
- If a feature is truly missing (e.g., no scheduling page exists at all), flag it and we'll address it in a separate session.
- Follow existing code patterns — use the same component styles, auth checks, and layout as the rest of the app.
- Check permissions using `chapter_memberships.role` — Leader is `leader`, Backup Leader is `backup_leader`.