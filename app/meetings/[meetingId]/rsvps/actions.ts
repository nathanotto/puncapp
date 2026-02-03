'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface ActionResult {
  success: boolean;
  message: string;
}

export async function logOutreachFromRsvpList(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const attendanceId = formData.get('attendanceId') as string;
  const notes = formData.get('notes') as string;

  // Get current user (the leader logging this)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      message: 'Not authenticated',
    };
  }

  // Get the attendance record to find meeting and member
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select(`
      id,
      user_id,
      meeting_id,
      users!inner (
        name,
        username
      ),
      meetings!inner (
        id,
        chapter_id
      )
    `)
    .eq('id', attendanceId)
    .single();

  if (attendanceError || !attendance) {
    return {
      success: false,
      message: 'Attendance record not found',
    };
  }

  const memberName = attendance.users.username || attendance.users.name;

  // Update attendance record with outreach notes
  const { error: updateError } = await supabase
    .from('attendance')
    .update({
      leader_outreach_logged_at: new Date().toISOString(),
      leader_outreach_notes: notes,
      leader_outreach_by: user.id,
      rsvp_status: 'no', // Default to "not coming" – leader's note explains
    })
    .eq('id', attendanceId);

  if (updateError) {
    return {
      success: false,
      message: `Failed to log outreach: ${updateError.message}`,
    };
  }

  // Complete the member's RSVP task (if still open)
  await supabase
    .from('pending_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('task_type', 'respond_to_rsvp')
    .eq('assigned_to', attendance.user_id)
    .eq('related_entity_id', attendance.meeting_id)
    .is('completed_at', null);

  // Complete any leader's contact task for same member
  await supabase
    .from('pending_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('task_type', 'contact_unresponsive_member')
    .eq('related_entity_id', attendanceId)
    .is('completed_at', null);

  // Create agenda item for the meeting
  await supabase
    .from('meeting_agenda_items')
    .insert({
      meeting_id: attendance.meeting_id,
      item_type: 'housekeeping',
      title: `Check in about ${memberName}`,
      notes: notes,
      source_type: 'unresponsive_member_outreach',
      source_entity_id: attendanceId,
      related_user_id: attendance.user_id,
    });

  // Revalidate the page
  revalidatePath(`/meetings/${attendance.meeting_id}/rsvps`);

  return {
    success: true,
    message: `Outreach logged for ${memberName}`,
  };
}
