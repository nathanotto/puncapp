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

  // Can only withdraw submitted or in_review requests
  if (!['submitted', 'in_review'].includes(lifecycleRequest.status)) {
    return NextResponse.json({ error: 'Can only withdraw submitted or in-review requests' }, { status: 400 });
  }

  // Update status to withdrawn
  const { error } = await supabase
    .from('chapter_lifecycle_requests')
    .update({
      status: 'withdrawn',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
