import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MonthEndClient } from '@/components/admin/MonthEndClient';

export default async function MonthEndPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: userData } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_punc_admin) redirect('/');

  // Get all open chapters with their current month status
  const { data: chapters } = await supabase
    .from('chapter_funding_current_month')
    .select('*')
    .order('chapter_name');

  // Check if monthly debit has been initialized for current month
  const currentMonth = new Date();
  const periodMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const { data: existingDebits, count: debitCount } = await supabase
    .from('chapter_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('transaction_type', 'monthly_debit')
    .eq('period_month', periodMonth);

  const monthlyDebitInitialized = (debitCount || 0) > 0;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-earth-brown mb-2">Month-End Processing</h1>
          <p className="text-stone-gray">
            Initialize monthly debits and calculate PUNC support
          </p>
        </div>

        <MonthEndClient
          chapters={chapters || []}
          periodMonth={periodMonth}
          monthlyDebitInitialized={monthlyDebitInitialized}
          adminId={user.id}
        />
      </div>
    </div>
  );
}
