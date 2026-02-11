import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Check admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_punc_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { review_notes } = body;

  // Get request
  const { data: lifecycleRequest, error: fetchError } = await supabase
    .from('chapter_lifecycle_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !lifecycleRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Execute based on type
  try {
    if (lifecycleRequest.request_type === 'formation') {
      await executeFormationApproval(supabase, lifecycleRequest);
    } else if (lifecycleRequest.request_type === 'split') {
      await executeSplitApproval(supabase, lifecycleRequest);
    } else if (lifecycleRequest.request_type === 'dissolution') {
      await executeDissolutionApproval(supabase, lifecycleRequest);
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('chapter_lifecycle_requests')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || '',
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Log notification for submitter
    await supabase.from('notification_log').insert({
      user_id: lifecycleRequest.submitted_by,
      notification_type: 'request_approved',
      related_entity_type: 'lifecycle_request',
      related_entity_id: id,
      message: `Your ${lifecycleRequest.request_type} request has been approved`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Approval execution error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function executeFormationApproval(supabase: any, request: any) {
  const data = request.request_data;

  // Create chapter
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .insert({
      name: data.proposed_name,
      status: 'forming',
      default_location: data.proposed_location,
      recurring_meeting_day: data.meeting_day,
      recurring_meeting_time: data.meeting_time,
      meeting_frequency: data.meeting_frequency,
    })
    .select()
    .single();

  if (chapterError) throw chapterError;

  // Add leader
  const { error: leaderError } = await supabase
    .from('chapter_memberships')
    .insert({
      chapter_id: chapter.id,
      user_id: request.submitted_by,
      role: 'leader',
      is_active: true,
    });

  if (leaderError) throw leaderError;

  // Add confirmed founding members
  const { data: confirmedOptIns } = await supabase
    .from('member_opt_ins')
    .select('user_id, confirmed_address, confirmed_phone')
    .eq('request_id', request.id)
    .eq('status', 'confirmed');

  for (const optIn of confirmedOptIns || []) {
    // Create membership
    await supabase.from('chapter_memberships').insert({
      chapter_id: chapter.id,
      user_id: optIn.user_id,
      role: 'member',
      is_active: true,
    });

    // Update user contact info if provided
    if (optIn.confirmed_address || optIn.confirmed_phone) {
      const updateData: any = {};
      if (optIn.confirmed_address) updateData.address = optIn.confirmed_address;
      if (optIn.confirmed_phone) updateData.phone = optIn.confirmed_phone;
      await supabase.from('users').update(updateData).eq('id', optIn.user_id);
    }

    // Log notification
    await supabase.from('notification_log').insert({
      user_id: optIn.user_id,
      notification_type: 'chapter_formed',
      related_entity_type: 'chapter',
      related_entity_id: chapter.id,
      message: `Welcome to ${data.proposed_name}!`,
    });
  }
}

async function executeSplitApproval(supabase: any, request: any) {
  const data = request.request_data;

  // Get original chapter
  const { data: originalChapter } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', request.chapter_id)
    .single();

  if (!originalChapter) throw new Error('Original chapter not found');

  // Create new chapter
  const { data: newChapter, error: chapterError } = await supabase
    .from('chapters')
    .insert({
      name: data.new_chapter_name,
      status: 'open',
      default_location: data.new_chapter_location,
      recurring_meeting_day: data.new_chapter_meeting_day || originalChapter.recurring_meeting_day,
      recurring_meeting_time: data.new_chapter_meeting_time || originalChapter.recurring_meeting_time,
      meeting_frequency: originalChapter.meeting_frequency,
      parent_chapter_id: originalChapter.id,
    })
    .select()
    .single();

  if (chapterError) throw chapterError;

  // Get confirmed opt-ins
  const { data: optIns } = await supabase
    .from('member_opt_ins')
    .select('*')
    .eq('request_id', request.id)
    .eq('status', 'confirmed');

  for (const optIn of optIns || []) {
    const assignment = optIn.confirmed_assignment || optIn.proposed_assignment;

    // Handle assignment to original chapter
    if (assignment === 'original' || assignment === 'both') {
      if (optIn.opt_in_type === 'split_new') {
        // New member joining original
        await supabase.from('chapter_memberships').insert({
          chapter_id: originalChapter.id,
          user_id: optIn.user_id,
          role: 'member',
          is_active: true,
        });
      }
      // Existing members already have membership, keep it active
    }

    // Handle assignment to new chapter
    if (assignment === 'new' || assignment === 'both') {
      const role =
        optIn.user_id === data.new_chapter_leader_id
          ? 'leader'
          : optIn.user_id === data.new_chapter_backup_leader_id
          ? 'backup_leader'
          : 'member';

      await supabase.from('chapter_memberships').insert({
        chapter_id: newChapter.id,
        user_id: optIn.user_id,
        role: role,
        is_active: true,
      });
    }

    // If existing member moving to new only (not both), deactivate original membership
    if (assignment === 'new' && optIn.opt_in_type === 'split_existing') {
      await supabase
        .from('chapter_memberships')
        .update({
          is_active: false,
          left_at: new Date().toISOString(),
        })
        .eq('chapter_id', originalChapter.id)
        .eq('user_id', optIn.user_id);
    }

    // Update user contact info if provided (for new members)
    if (optIn.confirmed_address || optIn.confirmed_phone) {
      const updateData: any = {};
      if (optIn.confirmed_address) updateData.address = optIn.confirmed_address;
      if (optIn.confirmed_phone) updateData.phone = optIn.confirmed_phone;
      await supabase.from('users').update(updateData).eq('id', optIn.user_id);
    }

    // Log notification
    await supabase.from('notification_log').insert({
      user_id: optIn.user_id,
      notification_type: 'chapter_split',
      related_entity_type: 'chapter',
      related_entity_id: assignment === 'new' ? newChapter.id : originalChapter.id,
      message: `Chapter split complete. You are in ${
        assignment === 'both'
          ? 'both chapters'
          : assignment === 'new'
          ? data.new_chapter_name
          : originalChapter.name
      }`,
    });
  }
}

async function executeDissolutionApproval(supabase: any, request: any) {
  // Close chapter
  const { error: chapterError } = await supabase
    .from('chapters')
    .update({
      status: 'closed',
    })
    .eq('id', request.chapter_id);

  if (chapterError) throw chapterError;

  // Get all active members before deactivating
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select('user_id')
    .eq('chapter_id', request.chapter_id)
    .eq('is_active', true);

  // Deactivate all memberships
  const { error: membershipError } = await supabase
    .from('chapter_memberships')
    .update({
      is_active: false,
      left_at: new Date().toISOString(),
    })
    .eq('chapter_id', request.chapter_id);

  if (membershipError) throw membershipError;

  // Notify all former members
  for (const membership of memberships || []) {
    await supabase.from('notification_log').insert({
      user_id: membership.user_id,
      notification_type: 'chapter_dissolved',
      related_entity_type: 'chapter',
      related_entity_id: request.chapter_id,
      message: 'Your chapter has been dissolved',
    });
  }
}
