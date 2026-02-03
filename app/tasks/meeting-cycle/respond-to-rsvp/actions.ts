'use server';

import { createClient } from '@/lib/supabase/server';
import { createTaskResult, ActionResult } from '@/lib/task-utils';
import { completeTask } from '@/lib/task-queue';
import { revalidatePath } from 'next/cache';

export async function submitRsvp(
  meetingId: string,
  rsvpStatus: 'yes' | 'no',
  reason?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createTaskResult({
      success: false,
      message: 'Authentication required',
      consequence: 'You must be logged in to RSVP.',
    });
  }

  // 2. Validate input
  if (!meetingId || !rsvpStatus) {
    return createTaskResult({
      success: false,
      message: 'Invalid input',
      consequence: 'Meeting ID and RSVP status are required.',
    });
  }

  if (rsvpStatus === 'no' && !reason) {
    return createTaskResult({
      success: false,
      message: 'Reason required',
      consequence: 'Please provide a reason for not attending.',
    });
  }

  // 3. Upsert attendance record
  const { error: upsertError } = await supabase
    .from('attendance')
    .upsert({
      meeting_id: meetingId,
      user_id: user.id,
      rsvp_status: rsvpStatus,
      rsvp_reason: rsvpStatus === 'no' ? reason : null,
      rsvp_at: new Date().toISOString(),
    }, {
      onConflict: 'meeting_id,user_id'
    });

  if (upsertError) {
    return createTaskResult({
      success: false,
      message: 'Failed to save RSVP',
      consequence: upsertError.message,
    });
  }

  // 4. Find and complete the pending_task for this user/meeting
  const { data: tasks } = await supabase
    .from('pending_tasks')
    .select('id')
    .eq('assigned_to', user.id)
    .eq('task_type', 'respond_to_rsvp')
    .eq('related_entity_id', meetingId)
    .is('completed_at', null);

  if (tasks && tasks.length > 0) {
    await completeTask(tasks[0].id);
  }

  // 5. Revalidate dashboard
  revalidatePath('/dashboard');

  // 6. Return confirmation
  const messages = {
    yes: {
      message: 'RSVP recorded: Yes',
      consequence: 'Your chapter will see that you\'re attending.',
    },
    no: {
      message: 'RSVP recorded: No',
      consequence: `Your chapter will see that you can't make it because: ${reason}`,
    },
  };

  return createTaskResult({
    success: true,
    message: messages[rsvpStatus].message,
    consequence: messages[rsvpStatus].consequence,
    nextStep: {
      description: 'View all member responses or return to your dashboard.',
      href: `/meetings/${meetingId}/rsvps`,
      label: 'View All RSVPs',
    },
    downstream: [
      'Your chapter can now see your response'
    ]
  });
}
