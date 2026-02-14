'use server';

import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { revalidatePath } from 'next/cache';

interface ActionResult {
  success: boolean;
  message: string;
  consequence?: string;
  downstream?: string[];
  nextStep?: {
    description: string;
    href: string;
    label: string;
  };
}

function combineDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

export async function startMeeting(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const meetingId = formData.get('meetingId') as string;
  const scribeId = formData.get('scribeId') as string;

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      message: 'Not authenticated',
    };
  }

  // Get meeting
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select(`
      *,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('id', meetingId)
    .single();

  const meetingChapter = meeting ? normalizeJoin(meeting.chapters) : null;

  if (meetingError || !meeting) {
    return {
      success: false,
      message: 'Meeting not found',
      consequence: 'Please try again.',
    };
  }

  // Verify user is leader/backup
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', user.id)
    .single();

  if (!membership || !['leader', 'backup_leader'].includes(membership.role)) {
    return {
      success: false,
      message: 'Not authorized',
      consequence: 'Only the Leader or Backup Leader can start the meeting.',
    };
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
      current_section: 'opening_meditation',
    })
    .eq('id', meetingId);

  if (updateError) {
    console.error('Failed to update meeting:', updateError);
    return {
      success: false,
      message: 'Failed to start meeting',
      consequence: updateError.message,
    };
  }

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
  const downstream: string[] = [];

  if (notCheckedIn.length > 0) {
    // Insert tasks
    const tasksToInsert = notCheckedIn.map(m => ({
      task_type: 'check_in_to_meeting',
      assigned_to: m.user_id,
      related_entity_type: 'meeting',
      related_entity_id: meetingId,
      metadata: {
        chapter_name: meetingChapter?.name,
        meeting_date: meeting.scheduled_date,
      },
    }));

    await supabase.from('pending_tasks').insert(tasksToInsert);

    // Log simulated notifications
    for (const member of notCheckedIn) {
      await supabase.from('notification_log').insert({
        recipient_user_id: member.user_id,
        notification_type: 'sms',
        purpose: 'meeting_started',
        status: 'simulated',
        content: `${meetingChapter?.name} meeting has started! Check in now.`,
        related_entity_type: 'meeting',
        related_entity_id: meetingId,
      });
    }

    downstream.push(`${notCheckedIn.length} check-in notification(s) sent`);
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

  // Revalidate paths
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath('/');

  return {
    success: true,
    message: 'Meeting started',
    consequence,
    downstream: downstream.length > 0 ? downstream : undefined,
    nextStep: {
      description: 'Proceed to the meeting',
      href: `/meetings/${meetingId}`,
      label: 'View Meeting',
    },
  };
}
