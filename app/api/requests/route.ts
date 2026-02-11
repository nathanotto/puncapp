import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all requests submitted by this user
  const { data: requests, error } = await supabase
    .from('chapter_lifecycle_requests')
    .select('*')
    .eq('submitted_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { request_type, chapter_id, request_data } = body;

  // Validate request_type
  if (!['formation', 'split', 'dissolution'].includes(request_type)) {
    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
  }

  // Validate access based on type
  if (request_type === 'formation') {
    // Check if user is certified
    const { data: userData } = await supabase
      .from('users')
      .select('is_leader_certified')
      .eq('id', user.id)
      .single();

    if (!userData?.is_leader_certified) {
      return NextResponse.json({ error: 'Must be leader certified to submit formation request' }, { status: 403 });
    }
  } else {
    // For split/dissolution, validate chapter leadership
    if (!chapter_id) {
      return NextResponse.json({ error: 'chapter_id required for split/dissolution' }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from('chapter_memberships')
      .select('role')
      .eq('chapter_id', chapter_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this chapter' }, { status: 403 });
    }

    if (request_type === 'split' && membership.role !== 'leader') {
      return NextResponse.json({ error: 'Must be chapter leader for split request' }, { status: 403 });
    }

    if (request_type === 'dissolution' && !['leader', 'backup_leader'].includes(membership.role)) {
      return NextResponse.json({ error: 'Must be leader or backup for dissolution request' }, { status: 403 });
    }
  }

  // Create draft request
  const { data: newRequest, error } = await supabase
    .from('chapter_lifecycle_requests')
    .insert({
      request_type,
      status: 'draft',
      submitted_by: user.id,
      chapter_id: chapter_id || null,
      request_data: request_data || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ request: newRequest });
}
