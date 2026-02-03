'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface ActionResult {
  success: boolean;
  message: string;
  consequence?: string;
  nextStep?: {
    description: string;
    href: string;
    label: string;
  };
}

export async function checkInToMeeting(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const meetingId = formData.get('meetingId') as string;
  const attendanceType = formData.get('attendanceType') as 'in_person' | 'video';

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      message: 'Not authenticated',
    };
  }

  // Get meeting to check timing
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

  if (meetingError || !meeting) {
    return {
      success: false,
      message: 'Meeting not found',
      consequence: 'Please try again.',
    };
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
      checked_in_late: checkedInLate || false,
    }, {
      onConflict: 'meeting_id,user_id',
    });

  if (attendanceError) {
    console.error('Attendance error:', attendanceError);
    return {
      success: false,
      message: 'Failed to check in',
      consequence: attendanceError.message,
    };
  }

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

  // Revalidate the page
  revalidatePath(`/tasks/meeting-cycle/check-in`);
  revalidatePath(`/tasks/meeting-cycle/start-meeting`);
  revalidatePath(`/meetings/${meetingId}`);

  // Determine confirmation message based on meeting status
  const meetingInProgress = meeting.status === 'in_progress';

  return {
    success: true,
    message: "You're checked in",
    consequence: meetingInProgress
      ? 'Welcome, brother. The meeting is in progress.'
      : 'Welcome, brother. The Leader will start the meeting shortly.',
    nextStep: {
      description: meetingInProgress ? 'View the meeting' : 'Wait for the meeting to start',
      href: `/meetings/${meetingId}`,
      label: 'View Meeting',
    },
  };
}
