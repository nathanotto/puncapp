import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { meetingId: string } }
) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, leader_id, chapter_id, validation_status')
    .eq('id', params.meetingId)
    .single();

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  // Verify user is the leader
  if (meeting.leader_id !== user.id) {
    return NextResponse.json({ error: 'Only the leader can validate' }, { status: 403 });
  }

  // Verify meeting is awaiting leader validation
  if (meeting.validation_status !== 'awaiting_leader') {
    return NextResponse.json(
      { error: 'Meeting is not awaiting leader validation' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { notes } = body;

  const now = new Date().toISOString();

  // Update meeting validation status
  const { error: updateError } = await supabase
    .from('meetings')
    .update({
      leader_validated_at: now,
      leader_validation_notes: notes || null,
      validation_status: 'awaiting_admin',
    })
    .eq('id', params.meetingId);

  if (updateError) {
    console.error('Error updating meeting validation:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Mark validation task as completed
  await supabase
    .from('pending_tasks')
    .update({
      status: 'completed',
      completed_at: now,
    })
    .eq('related_entity_id', params.meetingId)
    .eq('task_type', 'validate_meeting')
    .eq('assigned_to', user.id);

  // Log to leadership log
  await supabase.from('leadership_log').insert({
    chapter_id: meeting.chapter_id,
    meeting_id: params.meetingId,
    user_id: user.id,
    log_type: 'leader_validated_meeting',
    description: 'Leader validated meeting',
  });

  return NextResponse.json({ success: true });
}
