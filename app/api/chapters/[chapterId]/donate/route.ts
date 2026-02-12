import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity-log';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const { chapterId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is a member
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('id')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this chapter' }, { status: 403 });
  }

  const body = await request.json();
  const { amount, frequency, attribution } = body;

  // Validate inputs
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  if (!['one_time', 'monthly'].includes(frequency)) {
    return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
  }

  if (!['anonymous', 'leader_only', 'chapter'].includes(attribution)) {
    return NextResponse.json({ error: 'Invalid attribution' }, { status: 400 });
  }

  // Get current month
  const currentMonth = new Date();
  const periodMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  // Record the donation
  const { data: donation, error } = await supabase
    .from('chapter_ledger')
    .insert({
      chapter_id: chapterId,
      transaction_type: 'member_donation',
      amount: amount,
      donor_id: user.id,
      attribution: attribution,
      frequency: frequency,
      period_month: periodMonth,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording donation:', error);
    return NextResponse.json({ error: 'Failed to record donation' }, { status: 500 });
  }

  // Get user and chapter names for activity log
  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single();

  const { data: chapterData } = await supabase
    .from('chapters')
    .select('name')
    .eq('id', chapterId)
    .single();

  // Log the donation (fire and forget)
  logActivity({
    actorId: user.id,
    action: 'funding.donation_received',
    entityType: 'funding',
    entityId: donation.id,
    chapterId: chapterId,
    summary: `${userData?.name || 'Member'} donated $${amount.toFixed(2)} to ${chapterData?.name || 'chapter'}`,
    details: {
      amount,
      frequency,
      attribution_type: attribution,
      donor_member_type: 'contributing',
    },
  });

  return NextResponse.json({ donation });
}
