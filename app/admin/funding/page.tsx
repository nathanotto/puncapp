import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminFundingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: userData } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_punc_admin) redirect('/');

  // Get all open chapters with their funding status
  const { data: chapters } = await supabase
    .from('chapter_funding_current_month')
    .select('*')
    .order('chapter_name');

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-earth-brown mb-2">Chapter Funding Management</h1>
          <p className="text-stone-gray">Admin tools for managing chapter finances</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <Link
            href="/admin/funding/record-donation"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border-2 border-transparent hover:border-burnt-orange"
          >
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-xl font-semibold text-earth-brown mb-2">Record Donation</h3>
            <p className="text-sm text-stone-gray">
              Record outside or cross-chapter donations
            </p>
          </Link>

          <Link
            href="/admin/funding/adjustments"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border-2 border-transparent hover:border-burnt-orange"
          >
            <div className="text-3xl mb-3">⚙️</div>
            <h3 className="text-xl font-semibold text-earth-brown mb-2">Adjustments</h3>
            <p className="text-sm text-stone-gray">
              Make manual adjustments to chapter ledgers
            </p>
          </Link>

          <Link
            href="/admin/funding/month-end"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border-2 border-transparent hover:border-burnt-orange"
          >
            <div className="text-3xl mb-3">📅</div>
            <h3 className="text-xl font-semibold text-earth-brown mb-2">Month-End</h3>
            <p className="text-sm text-stone-gray">
              Process monthly debits and PUNC support
            </p>
          </Link>
        </div>

        {/* Chapter Funding Overview */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b-2 border-gray-100">
            <h2 className="text-2xl font-semibold text-earth-brown">
              Current Month Funding Status
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-warm-cream/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-earth-brown">Chapter</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-earth-brown">Goal</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-earth-brown">Raised</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-earth-brown">PUNC Support</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-earth-brown">Balance</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-earth-brown">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {chapters?.map((chapter) => {
                  const fundingPercentage = (chapter.contributions_this_month / chapter.monthly_cost) * 100;
                  const isFullyFunded = chapter.contributions_this_month >= chapter.monthly_cost;
                  const isPartiallyFunded = chapter.contributions_this_month > 0;

                  return (
                    <tr key={chapter.chapter_id} className="hover:bg-warm-cream/20">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/chapters/${chapter.chapter_id}`}
                          className="font-semibold text-earth-brown hover:text-burnt-orange"
                        >
                          {chapter.chapter_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-right text-stone-gray">
                        ${chapter.monthly_cost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-green-700">
                        ${chapter.contributions_this_month.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-orange-700">
                        ${Math.abs(chapter.punc_support_this_month).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        ${chapter.balance_this_month.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            isFullyFunded
                              ? 'bg-green-100 text-green-800'
                              : isPartiallyFunded
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {isFullyFunded ? 'Fully Funded' : isPartiallyFunded ? `${fundingPercentage.toFixed(0)}%` : 'Needs Support'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
