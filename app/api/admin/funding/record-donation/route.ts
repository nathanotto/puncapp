import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_punc_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { chapter_id, donor_chapter_id, transaction_type, amount, note } = body;

  // Validate inputs
  if (!chapter_id || !transaction_type || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['outside_donation', 'cross_chapter_donation'].includes(transaction_type)) {
    return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  if (transaction_type === 'cross_chapter_donation' && !donor_chapter_id) {
    return NextResponse.json({ error: 'Donor chapter required for cross-chapter donation' }, { status: 400 });
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
      chapter_id,
      donor_chapter_id: donor_chapter_id || null,
      transaction_type,
      amount,
      note: note || null,
      recorded_by: user.id,
      period_month: periodMonth,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording donation:', error);
    return NextResponse.json({ error: 'Failed to record donation' }, { status: 500 });
  }

  return NextResponse.json({ donation });
}
