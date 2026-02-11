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

  // Get request
  const { data: lifecycleRequest, error } = await supabase
    .from('chapter_lifecycle_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check if user is submitter or admin
  const { data: profile } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (lifecycleRequest.submitted_by !== user.id && !profile?.is_punc_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(lifecycleRequest);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get request to verify ownership
  const { data: lifecycleRequest } = await supabase
    .from('chapter_lifecycle_requests')
    .select('submitted_by, status')
    .eq('id', id)
    .single();

  if (!lifecycleRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  if (lifecycleRequest.submitted_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only allow updates to draft requests
  if (lifecycleRequest.status !== 'draft') {
    return NextResponse.json({ error: 'Can only update draft requests' }, { status: 400 });
  }

  const body = await request.json();
  const { request_data } = body;

  const { error } = await supabase
    .from('chapter_lifecycle_requests')
    .update({
      request_data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get request to verify ownership and status
  const { data: lifecycleRequest } = await supabase
    .from('chapter_lifecycle_requests')
    .select('submitted_by, status')
    .eq('id', id)
    .single();

  if (!lifecycleRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  if (lifecycleRequest.submitted_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only allow deletion of draft or withdrawn requests
  if (!['draft', 'withdrawn'].includes(lifecycleRequest.status)) {
    return NextResponse.json({ error: 'Can only delete draft or withdrawn requests' }, { status: 400 });
  }

  const { error } = await supabase
    .from('chapter_lifecycle_requests')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
