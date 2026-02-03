PUNCapp Session 4: Meeting Start & Check-in
Context
Sessions 2 and 3 built the RSVP flow with escalation. Now we build what happens when the meeting actually begins: the Leader starts it, members check in, and the meeting is ready to run.
Goal: Get to "meeting is ready to run"Ñeveryone who's here is checked in, the Scribe is designated, and the meeting runner can begin.
Primary References
1. TOD-SPECIFICATION.md Ñ Flow 1: Meeting Cycle, [TASK: Start Meeting] and [TASK: Check In to Meeting]
2. CLAUDE-CODE-GUIDE.md Ñ Implementation patterns
3. SESSION-2-PROMPT.md and SESSION-3-PROMPT.md Ñ What we've built so far

Step 1: Add Meeting Start Fields to Database
-- Add fields to meetings table for tracking start time and late flag
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS actual_start_time timestamptz,
  ADD COLUMN IF NOT EXISTS started_late boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS scribe_id uuid REFERENCES public.users(id);

-- Add fields to attendance for late check-in tracking
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS checked_in_late boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS absence_note text;

Step 2: Create Leadership Log Table
Track issues for PUNC admin review (late starts, uncontacted no-shows, etc.).
CREATE TABLE leadership_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL, -- the leader/member involved
  
  log_type text NOT NULL CHECK (log_type IN (
    'meeting_started_late',
    'member_checked_in_late', 
    'uncontacted_no_show',
    'leader_absence',
    'other'
  )),
  
  description text NOT NULL,
  metadata jsonb DEFAULT '{}', -- additional context (e.g., how many minutes late)
  
  -- Resolution tracking (for PUNC admin)
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES public.users(id),
  resolved_at timestamptz,
  resolution_notes text,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leadership_log ENABLE ROW LEVEL SECURITY;

-- Leaders can see their own chapter's log
CREATE POLICY "Leaders can view own chapter log" ON leadership_log
  FOR SELECT USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships 
      WHERE user_id = auth.uid() 
      AND role IN ('leader', 'backup_leader')
    )
  );

-- System inserts (for now, allow authenticated for testing)
CREATE POLICY "Authenticated users can insert leadership log" ON leadership_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Index for finding unresolved issues
CREATE INDEX idx_leadership_log_unresolved 
  ON leadership_log(chapter_id, is_resolved) 
  WHERE is_resolved = false;

Step 3: Build the Check-in Task (Member)
This task is available starting 15 minutes before the scheduled meeting time.
/app/tasks/meeting-cycle/check-in/page.tsx
3A: Check-in Window Logic
function isCheckInWindowOpen(meeting: Meeting): { open: boolean; reason?: string } {
  const now = new Date();
  const meetingDateTime = combineDateAndTime(meeting.scheduled_date, meeting.scheduled_time);
  const windowStart = new Date(meetingDateTime.getTime() - 15 * 60 * 1000); // 15 min before
  
  if (now < windowStart) {
    return { 
      open: false, 
      reason: `Check-in opens at ${formatTime(windowStart)}` 
    };
  }
  
  if (meeting.status === 'completed' || meeting.status === 'cancelled') {
    return { 
      open: false, 
      reason: 'This meeting has ended' 
    };
  }
  
  return { open: true };
}
3B: Context Loading
async function loadCheckInContext(meetingId: string, userId: string) {
  const supabase = await createClient();
  
  // Get meeting with chapter info
  const { data: meeting } = await supabase
    .from('meetings')
    .select(`
      *,
      chapter:chapters(id, name)
    `)
    .eq('id', meetingId)
    .single();
  
  if (!meeting) {
    return { authorized: false, reason: 'Meeting not found' };
  }
  
  // Check user is member of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  
  if (!membership) {
    return { authorized: false, reason: 'You are not a member of this chapter' };
  }
  
  // Get user's current attendance record
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('meeting_id', meetingId)
    .eq('user_id', userId)
    .single();
  
  // Check if already checked in
  const alreadyCheckedIn = attendance?.checked_in_at != null;
  
  // Check if window is open
  const window = isCheckInWindowOpen(meeting);
  
  return {
    authorized: true,
    meeting,
    membership,
    attendance,
    alreadyCheckedIn,
    windowOpen: window.open,
    windowReason: window.reason,
  };
}
3C: Task Screen
Prompt:
* Title: "Check In to Meeting"
* Subtitle: "[Chapter Name] ¥ [Date] at [Time]"
Context:
* Meeting status: "Scheduled" or "In Progress"
* Location
* If already checked in: show current status ("You checked in at [time]")
Actions:
* If window not open: Show disabled button with reason ("Check-in opens at 8:45am")
* If window open and not checked in: 
o Button: "I'm in the meeting place now Ñ In Person"
o Button: "I'm in the meeting place now Ñ Video"
* If already checked in: Show "You're checked in" with option to change type
Confirmation:
* Message: "You're checked in"
* Consequence: "Welcome, brother. The Leader will start the meeting shortly." (if meeting not started yet)
* Or: "Welcome, brother. The meeting is in progress." (if already started)
3D: Check-in Server Action
/app/tasks/meeting-cycle/check-in/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { createTaskResult, ActionResult } from '@/lib/task-utils';
import { completeTask } from '@/lib/task-queue';

export async function checkInToMeeting(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  
  const meetingId = formData.get('meetingId') as string;
  const attendanceType = formData.get('attendanceType') as 'in_person' | 'video';
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Get meeting to check timing
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, chapter:chapters(name)')
    .eq('id', meetingId)
    .single();
  
  if (!meeting) {
    return createTaskResult({
      success: false,
      message: 'Meeting not found',
      consequence: 'Please try again.',
    });
  }
  
  const now = new Date();
  const checkedInLate = meeting.actual_start_time && 
    (now.getTime() - new Date(meeting.actual_start_time).getTime() > 10 * 60 * 1000);
  
  // Upsert attendance record
  const { error: attendanceError } = await supabase
    .from('attendance')
    .upsert({
      meeting_id: meetingId,
      user_id: user.id,
      attendance_type: attendanceType,
      checked_in_at: now.toISOString(),
      checked_in_late: checkedInLate,
    }, {
      onConflict: 'meeting_id,user_id',
    });
  
  if (attendanceError) throw attendanceError;
  
  // Log late check-in to leadership log if applicable
  if (checkedInLate) {
    const minutesLate = Math.round(
      (now.getTime() - new Date(meeting.actual_start_time).getTime()) / 60000
    );
    
    await supabase.from('leadership_log').insert({
      chapter_id: meeting.chapter_id,
      meeting_id: meetingId,
      user_id: user.id,
      log_type: 'member_checked_in_late',
      description: `Member checked in ${minutesLate} minutes after meeting started`,
      metadata: { minutes_late: minutesLate },
    });
  }
  
  // Complete any pending check-in task
  await supabase
    .from('pending_tasks')
    .update({ completed_at: now.toISOString() })
    .eq('task_type', 'check_in_to_meeting')
    .eq('assigned_to', user.id)
    .eq('related_entity_id', meetingId)
    .is('completed_at', null);
  
  // Determine confirmation message based on meeting status
  const meetingInProgress = meeting.status === 'in_progress';
  
  return createTaskResult({
    success: true,
    message: "You're checked in",
    consequence: meetingInProgress 
      ? 'Welcome, brother. The meeting is in progress.'
      : 'Welcome, brother. The Leader will start the meeting shortly.',
    nextStep: {
      description: meetingInProgress ? 'Join the meeting' : 'Wait for the meeting to start',
      href: `/meetings/${meetingId}`,
      label: 'View Meeting',
    },
  });
}

Step 4: Build the Start Meeting Task (Leader)
/app/tasks/meeting-cycle/start-meeting/page.tsx
4A: Context Loading
async function loadStartMeetingContext(meetingId: string, userId: string) {
  const supabase = await createClient();
  
  // Get meeting with chapter info
  const { data: meeting } = await supabase
    .from('meetings')
    .select(`
      *,
      chapter:chapters(id, name)
    `)
    .eq('id', meetingId)
    .single();
  
  if (!meeting) {
    return { authorized: false, reason: 'Meeting not found' };
  }
  
  // Check user is leader or backup leader
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  
  if (!membership || !['leader', 'backup_leader'].includes(membership.role)) {
    return { authorized: false, reason: 'Only the Leader or Backup Leader can start the meeting' };
  }
  
  // Check meeting isn't already started
  if (meeting.status !== 'scheduled') {
    return { authorized: false, reason: `Meeting is already ${meeting.status}` };
  }
  
  // Get all attendance records (who's already checked in)
  const { data: attendanceList } = await supabase
    .from('attendance')
    .select(`
      *,
      user:users(id, name, username)
    `)
    .eq('meeting_id', meetingId);
  
  // Get chapter members for context
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select(`
      user_id,
      role,
      user:users(id, name, username)
    `)
    .eq('chapter_id', meeting.chapter_id)
    .eq('is_active', true);
  
  // Identify who's checked in vs not
  const checkedInUserIds = new Set(
    attendanceList?.filter(a => a.checked_in_at).map(a => a.user_id) || []
  );
  
  const checkedInMembers = members?.filter(m => checkedInUserIds.has(m.user_id)) || [];
  const notCheckedInMembers = members?.filter(m => !checkedInUserIds.has(m.user_id)) || [];
  
  return {
    authorized: true,
    meeting,
    membership,
    attendanceList,
    members,
    checkedInMembers,
    notCheckedInMembers,
  };
}
4B: Task Screen
Prompt:
* Title: "Start Meeting"
* Subtitle: "[Chapter Name] ¥ [Date] at [Time]"
Context:
* Checked in: "[X] members checked in" with list of names
* Not yet: "[Y] members not checked in" with list (show RSVP status for context)
* Any flags from RSVP escalation (outreach notes, etc.)
Actions:
* Scribe selector: Dropdown of checked-in members (including self)
* "Start Meeting" button
Note: If the current time is more than 10 minutes past scheduled time, show a subtle warning: "Meeting is starting [X] minutes late. This will be noted."
Confirmation:
* Message: "Meeting started"
* Consequence: "All members can now see the meeting is in progress. [Scribe Name] is running the app."
* If started late: Additional note "Note: Meeting started [X] minutes late."
* Downstream: "[X] check-in tasks created for members not yet checked in"
4C: Start Meeting Server Action
/app/tasks/meeting-cycle/start-meeting/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { createTaskResult, ActionResult } from '@/lib/task-utils';
import { createPendingTasks } from '@/lib/task-queue';

export async function startMeeting(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  
  const meetingId = formData.get('meetingId') as string;
  const scribeId = formData.get('scribeId') as string;
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Get meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, chapter:chapters(id, name)')
    .eq('id', meetingId)
    .single();
  
  if (!meeting) {
    return createTaskResult({
      success: false,
      message: 'Meeting not found',
      consequence: 'Please try again.',
    });
  }
  
  // Verify user is leader/backup
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', user.id)
    .single();
  
  if (!membership || !['leader', 'backup_leader'].includes(membership.role)) {
    return createTaskResult({
      success: false,
      message: 'Not authorized',
      consequence: 'Only the Leader or Backup Leader can start the meeting.',
    });
  }
  
  const now = new Date();
  const scheduledDateTime = combineDateAndTime(meeting.scheduled_date, meeting.scheduled_time);
  const minutesLate = Math.round((now.getTime() - scheduledDateTime.getTime()) / 60000);
  const startedLate = minutesLate > 10;
  
  // Update meeting status
  const { error: updateError } = await supabase
    .from('meetings')
    .update({
      status: 'in_progress',
      actual_start_time: now.toISOString(),
      started_late: startedLate,
      scribe_id: scribeId,
    })
    .eq('id', meetingId);
  
  if (updateError) throw updateError;
  
  // Log late start if applicable
  if (startedLate) {
    await supabase.from('leadership_log').insert({
      chapter_id: meeting.chapter_id,
      meeting_id: meetingId,
      user_id: user.id,
      log_type: 'meeting_started_late',
      description: `Meeting started ${minutesLate} minutes late`,
      metadata: { minutes_late: minutesLate },
    });
  }
  
  // Get members who haven't checked in yet
  const { data: allMembers } = await supabase
    .from('chapter_memberships')
    .select('user_id')
    .eq('chapter_id', meeting.chapter_id)
    .eq('is_active', true);
  
  const { data: checkedIn } = await supabase
    .from('attendance')
    .select('user_id')
    .eq('meeting_id', meetingId)
    .not('checked_in_at', 'is', null);
  
  const checkedInIds = new Set(checkedIn?.map(a => a.user_id) || []);
  const notCheckedIn = allMembers?.filter(m => !checkedInIds.has(m.user_id)) || [];
  
  // Create check-in tasks for members not yet checked in
  if (notCheckedIn.length > 0) {
    const tasks = notCheckedIn.map(m => ({
      taskType: 'check_in_to_meeting',
      assignedTo: m.user_id,
      relatedEntityType: 'meeting',
      relatedEntityId: meetingId,
      metadata: {
        chapter_name: meeting.chapter.name,
        meeting_date: meeting.scheduled_date,
      },
    }));
    
    await createPendingTasks(tasks);
    
    // Log simulated notifications
    for (const member of notCheckedIn) {
      await supabase.from('notification_log').insert({
        recipient_user_id: member.user_id,
        notification_type: 'sms',
        purpose: 'meeting_started',
        status: 'simulated',
        content: `${meeting.chapter.name} meeting has started! Check in now.`,
        related_entity_type: 'meeting',
        related_entity_id: meetingId,
      });
    }
  }
  
  // Get scribe name for confirmation
  const { data: scribe } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', scribeId)
    .single();
  
  const scribeName = scribe?.username || scribe?.name || 'Scribe';
  
  let consequence = `All members can now see the meeting is in progress. ${scribeName} is running the app.`;
  if (startedLate) {
    consequence += ` Note: Meeting started ${minutesLate} minutes late.`;
  }
  
  return createTaskResult({
    success: true,
    message: 'Meeting started',
    consequence,
    downstream: notCheckedIn.length > 0 
      ? [`${notCheckedIn.length} check-in notification(s) sent`]
      : undefined,
    nextStep: {
      description: 'Proceed to the meeting',
      href: `/meetings/${meetingId}/run`,
      label: 'Run Meeting',
    },
  });
}

// Helper function
function combineDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

Step 5: Build the Meeting View Page
A page showing the current state of the meetingÑwho's checked in, meeting status, etc.
/app/meetings/[meetingId]/page.tsx
For All Members:
* Meeting status (Scheduled / In Progress / Completed)
* Date, time, location
* Who's checked in (with timestamps)
* Who's not checked in yet
* If meeting in progress: who's the Scribe
For Leader/Backup Leader (additional):
* "Start Meeting" button (if status is 'scheduled' and it's time)
* Ability to change Scribe (if meeting in progress)
Real-time Updates:
Use Supabase real-time subscriptions to update the attendance list as people check in.
// Subscribe to attendance changes
useEffect(() => {
  const channel = supabase
    .channel(`meeting-${meetingId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance',
        filter: `meeting_id=eq.${meetingId}`,
      },
      (payload) => {
        // Refresh attendance list
        refreshAttendance();
      }
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
}, [meetingId]);

Step 6: Build the Change Scribe Action
Allow Leader to transfer Scribe role during the meeting.
/app/meetings/[meetingId]/actions.ts
'use server';

export async function changeScribe(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  
  const meetingId = formData.get('meetingId') as string;
  const newScribeId = formData.get('newScribeId') as string;
  
  // Verify current user is leader/backup or current scribe
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, chapter_id')
    .eq('id', meetingId)
    .single();
  
  // Check authorization: must be leader, backup, or current scribe
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', user.id)
    .single();
  
  const isLeader = membership?.role === 'leader' || membership?.role === 'backup_leader';
  const isCurrentScribe = meeting.scribe_id === user.id;
  
  if (!isLeader && !isCurrentScribe) {
    return createTaskResult({
      success: false,
      message: 'Not authorized',
      consequence: 'Only the Leader, Backup Leader, or current Scribe can change the Scribe.',
    });
  }
  
  // Verify new scribe is checked in
  const { data: newScribeAttendance } = await supabase
    .from('attendance')
    .select('checked_in_at')
    .eq('meeting_id', meetingId)
    .eq('user_id', newScribeId)
    .single();
  
  if (!newScribeAttendance?.checked_in_at) {
    return createTaskResult({
      success: false,
      message: 'Cannot assign Scribe',
      consequence: 'The new Scribe must be checked in to the meeting.',
    });
  }
  
  // Update scribe
  await supabase
    .from('meetings')
    .update({ scribe_id: newScribeId })
    .eq('id', meetingId);
  
  // Get new scribe name
  const { data: newScribe } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', newScribeId)
    .single();
  
  const scribeName = newScribe?.username || newScribe?.name;
  
  return createTaskResult({
    success: true,
    message: 'Scribe changed',
    consequence: `${scribeName} is now running the app.`,
  });
}

Step 7: Update Dashboard to Show Meeting Status
When a meeting is in progress, members should see it prominently on their dashboard.
Update /app/dashboard/page.tsx:
Add a section that checks for in-progress meetings in the user's chapters:
// Get in-progress meetings for user's chapters
const { data: inProgressMeetings } = await supabase
  .from('meetings')
  .select(`
    *,
    chapter:chapters(id, name)
  `)
  .eq('status', 'in_progress')
  .in('chapter_id', userChapterIds);

// Display prominently at top of dashboard
if (inProgressMeetings?.length > 0) {
  // Show "Meeting In Progress" banner with check-in button
}

Step 8: Create Test Seed Data
/scripts/seed-session4-test.sql
-- Create a meeting scheduled for right now (to test Start Meeting)
INSERT INTO meetings (id, chapter_id, scheduled_date, scheduled_time, location, status, rsvp_deadline)
VALUES (
  'e5f6a7b8-c9d0-1234-ef01-567890123456',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- The Oak Chapter
  CURRENT_DATE,
  CURRENT_TIME::time,
  '123 Main St, Austin, TX',
  'scheduled',
  CURRENT_DATE - INTERVAL '2 days'
);

-- Create attendance records for existing members (with RSVPs but no check-in)
INSERT INTO attendance (meeting_id, user_id, rsvp_status)
VALUES (
  'e5f6a7b8-c9d0-1234-ef01-567890123456',
  'YOUR_USER_ID',
  'yes'
);

-- To test early check-in, create a meeting 10 minutes from now
INSERT INTO meetings (id, chapter_id, scheduled_date, scheduled_time, location, status, rsvp_deadline)
VALUES (
  'f6a7b8c9-d0e1-2345-f012-678901234567',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  CURRENT_DATE,
  (CURRENT_TIME + INTERVAL '10 minutes')::time,
  '123 Main St, Austin, TX',
  'scheduled',
  CURRENT_DATE - INTERVAL '2 days'
);

INSERT INTO attendance (meeting_id, user_id, rsvp_status)
VALUES (
  'f6a7b8c9-d0e1-2345-f012-678901234567',
  'YOUR_USER_ID',
  'yes'
);

Step 9: Test the Complete Flow
Test A: Early Check-in Window
1. Create a meeting 10-15 minutes from now
2. Try to check in before the 15-minute window ? should show disabled with message
3. Wait until window opens ? button should enable
4. Check in ? should succeed, show confirmation
Test B: Start Meeting
1. As leader, go to a meeting that's at its scheduled time
2. See who's checked in, who hasn't
3. Select yourself as Scribe
4. Click Start Meeting
5. Verify: meeting status changes to 'in_progress', actual_start_time set
Test C: Late Start
1. Create a meeting for 15 minutes ago
2. Start it now
3. Verify: started_late flag is true, leadership_log entry created
Test D: Check In After Meeting Started
1. Start a meeting
2. As a different member (or reset your check-in), check in
3. If within 10 minutes: normal check-in
4. If after 10 minutes: checked_in_late flag, leadership_log entry
Test E: Change Scribe
1. Start a meeting with yourself as Scribe
2. Have another member check in
3. Change Scribe to that member
4. Verify the meeting's scribe_id is updated
Test F: Real-time Updates
1. Open the meeting page in two browser windows
2. Check in from one window
3. Verify the other window updates to show the new check-in

Session 4 Success Criteria
* [ ] Check-in window opens 15 minutes before scheduled time
* [ ] Check-in button shows "I'm in the meeting place now"
* [ ] Check-in records timestamp and attendance type (in_person/video)
* [ ] Leader can see who's checked in before starting meeting
* [ ] Leader can select Scribe from checked-in members
* [ ] Start Meeting changes status to 'in_progress' and records actual_start_time
* [ ] Starting 10+ minutes late sets started_late flag and creates leadership_log entry
* [ ] Check-in 10+ minutes after start sets checked_in_late flag and creates leadership_log entry
* [ ] Check-in tasks created for members not yet checked in when meeting starts
* [ ] Scribe can be changed mid-meeting by Leader or current Scribe
* [ ] Meeting page shows real-time attendance updates
* [ ] Dashboard shows "Meeting In Progress" banner when applicable

What We're NOT Building in Session 4
* Meeting runner flow (Lightning Round, Check-in Round, etc.) Ñ Session 5+
* Timing/talking stick tracking Ñ Session 5+
* Stretch commitments Ñ Session 5+
* Curriculum period Ñ Session 5+
* Audio recording Ñ Session 5+
* Meeting close Ñ Session 5+
* Post-meeting tasks for no-shows Ñ Session 5+

Notes for Future Sessions
Session 5: Meeting Runner Ñ Opening & Lightning Round
* Opening ritual step (meditation, Ethos reading)
* Lightning Round with talking stick timer
* Time tracking per member
* Scribe controls (alarm on/off, give more time, next man)
Session 6: Meeting Runner Ñ Check-in Round & Curriculum
* Long check-ins with time allocation
* Stretch commitment entry
* Curriculum period
* Audio recording
Session 7: Meeting Close & Post-Meeting
* Meeting close flow
* Post-meeting tasks (follow up with no-shows)
* Meeting validation for PUNC

Remember: Session 4 gets us to "ready to run." The meeting itself comes next.

