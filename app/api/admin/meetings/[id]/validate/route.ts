import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin access
  const { data: profile } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_punc_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, validation_status')
    .eq('id', params.id)
    .single();

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  // Verify meeting is awaiting admin validation
  if (meeting.validation_status !== 'awaiting_admin') {
    return NextResponse.json(
      { error: 'Meeting is not awaiting admin validation' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { action, notes, admin_user_id } = body;

  if (!action || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (action === 'reject' && !notes) {
    return NextResponse.json(
      { error: 'Notes are required when rejecting a meeting' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  // Update meeting validation status
  const { error: updateError } = await supabase
    .from('meetings')
    .update({
      admin_validated_at: now,
      admin_validated_by: admin_user_id || user.id,
      admin_validation_notes: notes || null,
      validation_status: newStatus,
    })
    .eq('id', params.id);

  if (updateError) {
    console.error('Error updating meeting validation:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
