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

  // Update request status to rejected
  const { error } = await supabase
    .from('chapter_lifecycle_requests')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: review_notes || '',
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log notification for submitter
  const { data: req } = await supabase
    .from('chapter_lifecycle_requests')
    .select('submitted_by, request_type')
    .eq('id', id)
    .single();

  if (req) {
    await supabase.from('notification_log').insert({
      user_id: req.submitted_by,
      notification_type: 'request_rejected',
      related_entity_type: 'lifecycle_request',
      related_entity_id: id,
      message: `Your ${req.request_type} request was not approved`,
    });
  }

  return NextResponse.json({ success: true });
}
