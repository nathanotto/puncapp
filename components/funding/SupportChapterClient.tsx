'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SupportChapterClientProps {
  chapterId: string;
  chapterName: string;
  userId: string;
  isLeader: boolean;
  currentMonthData: {
    monthly_cost: number;
    contributions_this_month: number;
    balance_this_month: number;
  } | null;
  userContributions: Array<{
    amount: number;
    created_at: string;
    frequency: string | null;
    attribution: string | null;
  }>;
}

export function SupportChapterClient({
  chapterId,
  chapterName,
  userId,
  isLeader,
  currentMonthData,
  userContributions,
}: SupportChapterClientProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'one_time' | 'monthly'>('one_time');
  const [attribution, setAttribution] = useState<'anonymous' | 'leader_only' | 'chapter'>('chapter');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const monthlyCost = currentMonthData?.monthly_cost || 55;
  const contributionsThisMonth = currentMonthData?.contributions_this_month || 0;
  const stillNeeded = Math.max(0, monthlyCost - contributionsThisMonth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/chapters/${chapterId}/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          frequency,
          attribution,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record donation');
      }

      // Reset form
      setAmount('');
      setFrequency('one_time');
      setAttribution('chapter');

      // Refresh the page to show updated data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userTotalThisMonth = userContributions
    .filter(c => {
      const contributionDate = new Date(c.created_at);
      const now = new Date();
      return contributionDate.getMonth() === now.getMonth() &&
             contributionDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Column - Donation Form */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-earth-brown mb-6">Make a Contribution</h2>

          {/* Current Month Status */}
          <div className="mb-6 p-4 bg-warm-cream/30 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-stone-gray">This Month's Goal:</span>
              <span className="font-semibold text-earth-brown">${monthlyCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-stone-gray">Raised So Far:</span>
              <span className="font-semibold text-green-700">${contributionsThisMonth.toFixed(2)}</span>
            </div>
            {stillNeeded > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-stone-gray/30">
                <span className="text-sm font-semibold text-stone-gray">Still Needed:</span>
                <span className="font-bold text-orange-700">${stillNeeded.toFixed(2)}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-earth-brown mb-2">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-gray">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-burnt-orange focus:outline-none"
                  placeholder="0.00"
                  required
                />
              </div>
              {stillNeeded > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(stillNeeded.toFixed(2))}
                  className="mt-2 text-sm text-burnt-orange hover:underline"
                >
                  Cover remaining ${stillNeeded.toFixed(2)}
                </button>
              )}
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-semibold text-earth-brown mb-2">
                Frequency
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFrequency('one_time')}
                  className={`p-3 border-2 rounded-lg transition-colors ${
                    frequency === 'one_time'
                      ? 'border-burnt-orange bg-burnt-orange/10 font-semibold'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  One-Time
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('monthly')}
                  className={`p-3 border-2 rounded-lg transition-colors ${
                    frequency === 'monthly'
                      ? 'border-burnt-orange bg-burnt-orange/10 font-semibold'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Monthly
                </button>
              </div>
              {frequency === 'monthly' && (
                <p className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded">
                  Note: This is your intent to contribute monthly. You'll need to manually donate each month.
                </p>
              )}
            </div>

            {/* Attribution */}
            <div>
              <label className="block text-sm font-semibold text-earth-brown mb-2">
                Attribution
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="attribution"
                    value="chapter"
                    checked={attribution === 'chapter'}
                    onChange={(e) => setAttribution(e.target.value as any)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-semibold text-earth-brown">Chapter (Public)</div>
                    <div className="text-xs text-stone-gray">All members can see your contribution</div>
                  </div>
                </label>
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="attribution"
                    value="leader_only"
                    checked={attribution === 'leader_only'}
                    onChange={(e) => setAttribution(e.target.value as any)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-semibold text-earth-brown">Leader Only</div>
                    <div className="text-xs text-stone-gray">Only chapter leaders can see your name</div>
                  </div>
                </label>
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="attribution"
                    value="anonymous"
                    checked={attribution === 'anonymous'}
                    onChange={(e) => setAttribution(e.target.value as any)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-semibold text-earth-brown">Anonymous</div>
                    <div className="text-xs text-stone-gray">No one sees your name, not even leaders</div>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Submit Contribution'}
            </button>
          </form>
        </div>
      </div>

      {/* Sidebar - Contribution History */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-earth-brown mb-4">Your Contributions</h3>

          {userTotalThisMonth > 0 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">This Month</div>
              <div className="text-2xl font-bold text-green-900">
                ${userTotalThisMonth.toFixed(2)}
              </div>
            </div>
          )}

          {userContributions.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-stone-gray uppercase">Recent</h4>
              {userContributions.map((contribution, idx) => (
                <div key={idx} className="pb-3 border-b border-gray-200 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-earth-brown">
                        ${Number(contribution.amount).toFixed(2)}
                      </div>
                      <div className="text-xs text-stone-gray">
                        {new Date(contribution.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      {contribution.frequency === 'monthly' && (
                        <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          Monthly
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-gray">No contributions yet</p>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Contributions go directly to chapter expenses</li>
            <li>• PUNC covers any monthly funding gap</li>
            <li>• Monthly cost: ${monthlyCost}/month per chapter</li>
            <li>• All contributions are voluntary</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
