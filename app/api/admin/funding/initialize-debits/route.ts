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
  const { period_month } = body;

  if (!period_month) {
    return NextResponse.json({ error: 'period_month required' }, { status: 400 });
  }

  // Get all open chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('status', 'open');

  if (!chapters || chapters.length === 0) {
    return NextResponse.json({ error: 'No open chapters found' }, { status: 404 });
  }

  // Check if debits already exist for this month
  const { data: existingDebits } = await supabase
    .from('chapter_ledger')
    .select('id')
    .eq('transaction_type', 'monthly_debit')
    .eq('period_month', period_month)
    .limit(1);

  if (existingDebits && existingDebits.length > 0) {
    return NextResponse.json({ error: 'Monthly debits already initialized for this period' }, { status: 400 });
  }

  // Create debit entries for all open chapters
  const debits = chapters.map(chapter => ({
    chapter_id: chapter.id,
    transaction_type: 'monthly_debit' as const,
    amount: -55.00,
    period_month,
  }));

  const { data, error } = await supabase
    .from('chapter_ledger')
    .insert(debits)
    .select();

  if (error) {
    console.error('Error initializing debits:', error);
    return NextResponse.json({ error: 'Failed to initialize debits' }, { status: 500 });
  }

  return NextResponse.json({ count: data.length, debits: data });
}
