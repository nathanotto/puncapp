import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify access to request
  const { data: lifecycleRequest } = await supabase
    .from('chapter_lifecycle_requests')
    .select('submitted_by')
    .eq('id', id)
    .single();

  if (!lifecycleRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Check if user is submitter, admin, or involved member
  const { data: profile } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  const isSubmitter = lifecycleRequest.submitted_by === user.id;
  const isAdmin = profile?.is_punc_admin || false;

  // Check if user has opt-in for this request
  const { data: optIn } = await supabase
    .from('member_opt_ins')
    .select('id')
    .eq('request_id', id)
    .eq('user_id', user.id)
    .single();

  if (!isSubmitter && !isAdmin && !optIn) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get messages
  const { data: messages, error } = await supabase
    .from('lifecycle_request_messages')
    .select(`
      *,
      sender:users!lifecycle_request_messages_sender_id_fkey (id, name)
    `)
    .eq('request_id', id)
    .order('created_at');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(messages);
}

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

  // Verify access to request
  const { data: lifecycleRequest } = await supabase
    .from('chapter_lifecycle_requests')
    .select('submitted_by')
    .eq('id', id)
    .single();

  if (!lifecycleRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Check if user is submitter, admin, or involved member
  const { data: profile } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  const isSubmitter = lifecycleRequest.submitted_by === user.id;
  const isAdmin = profile?.is_punc_admin || false;

  // Check if user has opt-in for this request
  const { data: optIn } = await supabase
    .from('member_opt_ins')
    .select('id')
    .eq('request_id', id)
    .eq('user_id', user.id)
    .single();

  if (!isSubmitter && !isAdmin && !optIn) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { message } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // Add message
  const { error } = await supabase
    .from('lifecycle_request_messages')
    .insert({
      request_id: id,
      sender_id: user.id,
      message: message.trim(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log notification for request submitter if message is from someone else
  if (user.id !== lifecycleRequest.submitted_by) {
    await supabase.from('notification_log').insert({
      user_id: lifecycleRequest.submitted_by,
      notification_type: 'request_message',
      related_entity_type: 'lifecycle_request',
      related_entity_id: id,
      message: 'New message on your request',
    });
  }

  return NextResponse.json({ success: true });
}
