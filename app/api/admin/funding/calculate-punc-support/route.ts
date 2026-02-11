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

  // Get current month funding for all open chapters
  const { data: chapters } = await supabase
    .from('chapter_funding_current_month')
    .select('chapter_id, monthly_cost, contributions_this_month, punc_support_this_month')
    .eq('period_month', period_month);

  if (!chapters || chapters.length === 0) {
    return NextResponse.json({ error: 'No chapters found for this period' }, { status: 404 });
  }

  // Calculate support needed for each chapter
  const supportEntries = [];
  let totalSupport = 0;

  for (const chapter of chapters) {
    const gap = chapter.monthly_cost - chapter.contributions_this_month;

    if (gap > 0) {
      // Only add support if there's a gap
      supportEntries.push({
        chapter_id: chapter.chapter_id,
        transaction_type: 'punc_support' as const,
        amount: gap, // Positive amount (credit to chapter)
        period_month,
      });
      totalSupport += gap;
    }
  }

  if (supportEntries.length === 0) {
    return NextResponse.json({ count: 0, totalSupport: 0, message: 'No support needed - all chapters are fully funded!' });
  }

  // Insert PUNC support entries
  const { data, error } = await supabase
    .from('chapter_ledger')
    .insert(supportEntries)
    .select();

  if (error) {
    console.error('Error recording PUNC support:', error);
    return NextResponse.json({ error: 'Failed to record PUNC support' }, { status: 500 });
  }

  return NextResponse.json({
    count: data.length,
    totalSupport,
    support: data
  });
}
