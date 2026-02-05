'use server';

import { createClient } from '@/lib/supabase/server';

interface ActionResult {
  success: boolean;
  message: string;
  consequence?: string;
  redirect?: string;
  nextStep?: {
    description: string;
    href: string;
    label: string;
  };
}

export async function logOutreach(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const attendanceId = formData.get('attendanceId') as string;
  const notes = formData.get('notes') as string;
  const taskId = formData.get('taskId') as string;

  // Get current user (the leader logging this)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      message: 'Not authenticated',
    };
  }

  // 1. Get the attendance record to find meeting and member
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('id, user_id, meeting_id')
    .eq('id', attendanceId)
    .single();

  if (attendanceError || !attendance) {
    console.error('Attendance lookup error:', { attendanceError, attendanceId });
    return {
      success: false,
      message: 'Attendance record not found',
      consequence: 'Please try again or contact support.',
    };
  }

  // Get member info
  const { data: member } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', attendance.user_id)
    .single();

  const memberName = member?.username || member?.name || 'Member';

  // 2. Update attendance record with outreach notes
  // DO NOT change rsvp_status - it stays "no_response" until actual RSVP is recorded
  const { error: updateError } = await supabase
    .from('attendance')
    .update({
      leader_outreach_logged_at: new Date().toISOString(),
      leader_outreach_notes: notes,
      leader_outreach_by: user.id,
    })
    .eq('id', attendanceId);

  if (updateError) {
    return {
      success: false,
      message: `Failed to update attendance: ${updateError.message}`,
    };
  }

  // 3. DO NOT complete the tasks - they stay open until actual RSVP is recorded
  // The task remains on the leader's dashboard

  // 3. Create agenda item for the meeting
  const { error: agendaError } = await supabase
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

  if (agendaError) {
    console.error('Failed to create agenda item:', agendaError);
  }

  return {
    success: true,
    message: 'Outreach logged',
    consequence: `Your notes about ${memberName} have been logged and will be noted at the meeting. The task remains open until an RSVP is recorded.`,
  };
}

export async function rsvpForMember(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const attendanceId = formData.get('attendanceId') as string;
  const rsvpStatus = formData.get('rsvpStatus') as 'yes' | 'no';
  const taskId = formData.get('taskId') as string;

  // Get current user (the leader)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      message: 'Not authenticated',
    };
  }

  // Get the attendance record
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('id, user_id, meeting_id')
    .eq('id', attendanceId)
    .single();

  if (attendanceError || !attendance) {
    console.error('Attendance lookup error:', { attendanceError, attendanceId });
    return {
      success: false,
      message: `Attendance record not found: ${attendanceError?.message || 'Unknown error'}`,
    };
  }

  // Get member info
  const { data: member } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', attendance.user_id)
    .single();

  const memberName = member?.username || member?.name || 'Member';

  // Update attendance with RSVP
  const { error: updateError } = await supabase
    .from('attendance')
    .update({
      rsvp_status: rsvpStatus,
      rsvp_at: new Date().toISOString(),
    })
    .eq('id', attendanceId);

  if (updateError) {
    return {
      success: false,
      message: `Failed to update RSVP: ${updateError.message}`,
    };
  }

  // Complete the leader's contact task
  await supabase
    .from('pending_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', taskId);

  // Complete the member's RSVP task
  await supabase
    .from('pending_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('task_type', 'respond_to_rsvp')
    .eq('assigned_to', attendance.user_id)
    .eq('related_entity_id', attendance.meeting_id)
    .is('completed_at', null);

  return {
    success: true,
    message: `RSVP'd ${rsvpStatus} for ${memberName}`,
    redirect: '/',
  };
}

export async function createFollowUpCommitment(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const attendanceId = formData.get('attendanceId') as string;
  const commitmentDescription = formData.get('commitmentDescription') as string;

  // Get current user (the leader)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      message: 'Not authenticated',
    };
  }

  // Get the attendance record to find meeting info
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('id, user_id, meeting_id')
    .eq('id', attendanceId)
    .single();

  if (attendanceError || !attendance) {
    console.error('Attendance lookup error:', { attendanceError, attendanceId });
    return {
      success: false,
      message: 'Attendance record not found',
    };
  }

  // Get member info
  const { data: member } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', attendance.user_id)
    .single();

  const memberName = member?.username || member?.name || 'Member';

  // Create commitment for the leader
  const { error: commitmentError } = await supabase
    .from('commitments')
    .insert({
      committer_id: user.id,
      commitment_type: 'support_a_man',
      description: commitmentDescription,
      status: 'active',
      created_at_meeting_id: attendance.meeting_id,
      receiver_id: attendance.user_id,
    });

  if (commitmentError) {
    return {
      success: false,
      message: `Failed to create commitment: ${commitmentError.message}`,
    };
  }

  return {
    success: true,
    message: `Commitment created to follow up with ${memberName}`,
  };
}
