import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { OptInResponsePayload } from '@/types/lifecycle-requests';

// POST /api/opt-ins/[id]/respond - Submit opt-in response
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

  // Get opt-in
  const { data: optIn } = await supabase
    .from('member_opt_ins')
    .select('*')
    .eq('id', id)
    .single();

  if (!optIn) {
    return NextResponse.json({ error: 'Opt-in not found' }, { status: 404 });
  }

  // Verify this is for the current user
  if (optIn.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check if already responded
  if (optIn.status !== 'pending') {
    return NextResponse.json({ error: 'Already responded' }, { status: 400 });
  }

  const body: OptInResponsePayload = await request.json();
  const now = new Date().toISOString();

  if (body.response === 'confirm') {
    // Confirm opt-in
    const { error: updateError } = await supabase
      .from('member_opt_ins')
      .update({
        status: 'confirmed',
        confirmed_assignment: optIn.proposed_assignment,
        confirmed_address: body.address || null,
        confirmed_phone: body.phone || null,
        responded_at: now,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update user's address/phone if provided
    if (body.address || body.phone) {
      const updates: any = {};
      if (body.address) updates.address = body.address;
      if (body.phone) updates.phone = body.phone;

      await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);
    }

    // Log notification
    await supabase.from('notification_log').insert({
      user_id: optIn.user_id,
      notification_type: 'opt_in_confirmed',
      related_entity_type: 'lifecycle_request',
      related_entity_id: optIn.request_id,
      message: 'You confirmed your participation',
    });

    return NextResponse.json({ success: true, status: 'confirmed' });

  } else if (body.response === 'decline') {
    // Decline opt-in
    const { error: updateError } = await supabase
      .from('member_opt_ins')
      .update({
        status: 'declined',
        responded_at: now,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log notification
    await supabase.from('notification_log').insert({
      user_id: optIn.user_id,
      notification_type: 'opt_in_declined',
      related_entity_type: 'lifecycle_request',
      related_entity_id: optIn.request_id,
      message: 'You declined the invitation',
    });

    return NextResponse.json({ success: true, status: 'declined' });

  } else if (body.response === 'request_change') {
    // Request assignment change (status stays pending)
    if (!body.change_request) {
      return NextResponse.json({ error: 'Change request message required' }, { status: 400 });
    }

    // Add message to request thread
    const { error: messageError } = await supabase
      .from('lifecycle_request_messages')
      .insert({
        request_id: optIn.request_id,
        sender_id: user.id,
        message: `Assignment change request: ${body.change_request}`,
      });

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    // Log notification
    await supabase.from('notification_log').insert({
      user_id: optIn.user_id,
      notification_type: 'assignment_change_requested',
      related_entity_type: 'lifecycle_request',
      related_entity_id: optIn.request_id,
      message: 'You requested a different assignment',
    });

    return NextResponse.json({ success: true, status: 'pending', message: 'Change request submitted' });

  } else {
    return NextResponse.json({ error: 'Invalid response type' }, { status: 400 });
  }
}
