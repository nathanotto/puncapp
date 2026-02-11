import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get request
  const { data: lifecycleRequest, error: fetchError } = await supabase
    .from('chapter_lifecycle_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !lifecycleRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Verify ownership
  if (lifecycleRequest.submitted_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify status is draft
  if (lifecycleRequest.status !== 'draft') {
    return NextResponse.json({ error: 'Request already submitted' }, { status: 400 });
  }

  try {
    // Update status to submitted
    const { error: updateError } = await supabase
      .from('chapter_lifecycle_requests')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Create opt-ins based on request type
    if (lifecycleRequest.request_type === 'formation') {
      await createFormationOptIns(supabase, lifecycleRequest);
    } else if (lifecycleRequest.request_type === 'split') {
      await createSplitOptIns(supabase, lifecycleRequest);
    }
    // Dissolution doesn't require opt-ins

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function createFormationOptIns(supabase: any, request: any) {
  const data = request.request_data;
  const foundingMemberIds = data.founding_member_ids || [];

  for (const memberId of foundingMemberIds) {
    // Create opt-in
    await supabase.from('member_opt_ins').insert({
      request_id: request.id,
      user_id: memberId,
      opt_in_type: 'formation',
      status: 'pending',
      notified_at: new Date().toISOString(),
    });

    // Log notification
    await supabase.from('notification_log').insert({
      user_id: memberId,
      notification_type: 'formation_opt_in',
      related_entity_type: 'lifecycle_request',
      related_entity_id: request.id,
      message: `You've been invited to join ${data.proposed_name} chapter`,
    });
  }
}

async function createSplitOptIns(supabase: any, request: any) {
  const data = request.request_data;

  // Existing members
  const originalMembers = data.original_chapter_member_ids || [];
  const newMembers = data.new_chapter_member_ids || [];
  const dualMembers = data.dual_membership_member_ids || [];

  const allExistingMembers = [...originalMembers, ...newMembers, ...dualMembers];

  for (const memberId of allExistingMembers) {
    const assignment = dualMembers.includes(memberId)
      ? 'both'
      : originalMembers.includes(memberId)
      ? 'original'
      : 'new';

    await supabase.from('member_opt_ins').insert({
      request_id: request.id,
      user_id: memberId,
      opt_in_type: 'split_existing',
      proposed_assignment: assignment,
      status: 'pending',
      notified_at: new Date().toISOString(),
    });

    // Log notification
    await supabase.from('notification_log').insert({
      user_id: memberId,
      notification_type: 'split_assignment',
      related_entity_type: 'lifecycle_request',
      related_entity_id: request.id,
      message: 'Your chapter is splitting. Please confirm your assignment.',
    });
  }

  // New members joining
  const newMemberIds = data.new_member_ids || [];
  const newMembersTarget = data.new_members_target || {};

  for (const memberId of newMemberIds) {
    const targetChapter = newMembersTarget[memberId];

    await supabase.from('member_opt_ins').insert({
      request_id: request.id,
      user_id: memberId,
      opt_in_type: 'split_new',
      proposed_assignment: targetChapter,
      status: 'pending',
      notified_at: new Date().toISOString(),
    });

    // Log notification
    const chapterName = targetChapter === 'original' ? 'existing chapter' : data.new_chapter_name;
    await supabase.from('notification_log').insert({
      user_id: memberId,
      notification_type: 'split_new_member',
      related_entity_type: 'lifecycle_request',
      related_entity_id: request.id,
      message: `You've been invited to join ${chapterName}`,
    });
  }
}
