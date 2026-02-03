'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface ActionResult {
  success: boolean;
  message: string;
  consequence?: string;
}

export async function changeScribe(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const meetingId = formData.get('meetingId') as string;
  const newScribeId = formData.get('newScribeId') as string;

  // Verify current user is leader/backup or current scribe
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      message: 'Not authenticated',
    };
  }

  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('id, chapter_id, scribe_id')
    .eq('id', meetingId)
    .single();

  if (meetingError || !meeting) {
    return {
      success: false,
      message: 'Meeting not found',
    };
  }

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
    return {
      success: false,
      message: 'Not authorized',
      consequence: 'Only the Leader, Backup Leader, or current Scribe can change the Scribe.',
    };
  }

  // Verify new scribe is checked in
  const { data: newScribeAttendance } = await supabase
    .from('attendance')
    .select('checked_in_at')
    .eq('meeting_id', meetingId)
    .eq('user_id', newScribeId)
    .single();

  if (!newScribeAttendance?.checked_in_at) {
    return {
      success: false,
      message: 'Cannot assign Scribe',
      consequence: 'The new Scribe must be checked in to the meeting.',
    };
  }

  // Update scribe
  const { error: updateError } = await supabase
    .from('meetings')
    .update({ scribe_id: newScribeId })
    .eq('id', meetingId);

  if (updateError) {
    console.error('Failed to update scribe:', updateError);
    return {
      success: false,
      message: 'Failed to change Scribe',
      consequence: updateError.message,
    };
  }

  // Get new scribe name
  const { data: newScribe } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', newScribeId)
    .single();

  const scribeName = newScribe?.username || newScribe?.name || 'Scribe';

  // Revalidate paths
  revalidatePath(`/meetings/${meetingId}`);

  return {
    success: true,
    message: 'Scribe changed',
    consequence: `${scribeName} is now running the app.`,
  };
}
