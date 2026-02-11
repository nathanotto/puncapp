import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chapterId: string; memberId: string }> }
) {
  const { chapterId, memberId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is leader or backup leader
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!membership || !['leader', 'backup_leader'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only leaders can invite contributing members' }, { status: 403 });
  }

  // Verify member exists and is not already contributing
  const { data: targetMembership } = await supabase
    .from('chapter_memberships')
    .select('is_contributing')
    .eq('chapter_id', chapterId)
    .eq('user_id', memberId)
    .eq('is_active', true)
    .single();

  if (!targetMembership) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  if (targetMembership.is_contributing) {
    return NextResponse.json({ error: 'Member is already contributing' }, { status: 400 });
  }

  // Check if there's already a pending task
  const { data: existingTask } = await supabase
    .from('pending_tasks')
    .select('id')
    .eq('task_type', 'become_contributing_member')
    .eq('assigned_to', memberId)
    .eq('related_entity_id', chapterId)
    .eq('status', 'pending')
    .single();

  if (existingTask) {
    return NextResponse.json({ error: 'Invitation already pending' }, { status: 400 });
  }

  // Create pending task
  const { error: taskError } = await supabase
    .from('pending_tasks')
    .insert({
      task_type: 'become_contributing_member',
      assigned_to: memberId,
      related_entity_type: 'chapter',
      related_entity_id: chapterId,
      status: 'pending',
    });

  if (taskError) {
    console.error('Error creating task:', taskError);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }

  // Log notification
  await supabase.from('notification_log').insert({
    user_id: memberId,
    notification_type: 'contributing_member_invitation',
    related_entity_type: 'chapter',
    related_entity_id: chapterId,
    message: 'You\'ve been invited to become a contributing member',
  });

  return NextResponse.json({ success: true });
}
