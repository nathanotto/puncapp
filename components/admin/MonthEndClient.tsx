'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Chapter {
  chapter_id: string;
  chapter_name: string;
  monthly_cost: number;
  contributions_this_month: number;
  punc_support_this_month: number;
  balance_this_month: number;
}

interface MonthEndClientProps {
  chapters: Chapter[];
  periodMonth: string;
  monthlyDebitInitialized: boolean;
  adminId: string;
}

export function MonthEndClient({
  chapters,
  periodMonth,
  monthlyDebitInitialized,
  adminId,
}: MonthEndClientProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const periodDate = new Date(periodMonth);
  const monthName = periodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleInitializeDebits = async () => {
    if (!confirm(`Initialize monthly debits for all open chapters for ${monthName}?`)) {
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/funding/initialize-debits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_month: periodMonth }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize debits');
      }

      setSuccess(`Successfully initialized ${data.count} monthly debits`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCalculatePuncSupport = async () => {
    if (!confirm(`Calculate and record PUNC support for ${monthName}?\n\nThis will cover any funding gaps for all chapters.`)) {
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/funding/calculate-punc-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_month: periodMonth }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate PUNC support');
      }

      setSuccess(`PUNC support calculated: $${data.totalSupport.toFixed(2)} across ${data.count} chapters`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate totals
  const totalMonthlyCost = chapters.reduce((sum, c) => sum + c.monthly_cost, 0);
  const totalContributions = chapters.reduce((sum, c) => sum + c.contributions_this_month, 0);
  const totalPuncSupport = chapters.reduce((sum, c) => sum + Math.abs(c.punc_support_this_month), 0);
  const projectedPuncSupport = chapters.reduce((sum, c) => {
    const gap = c.monthly_cost - c.contributions_this_month;
    return sum + Math.max(0, gap);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-stone-gray mb-1">Total Monthly Cost</div>
          <div className="text-2xl font-bold text-earth-brown">
            ${totalMonthlyCost.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-stone-gray mb-1">Total Contributions</div>
          <div className="text-2xl font-bold text-green-700">
            ${totalContributions.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-stone-gray mb-1">Current PUNC Support</div>
          <div className="text-2xl font-bold text-orange-700">
            ${totalPuncSupport.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-stone-gray mb-1">Projected Support Needed</div>
          <div className="text-2xl font-bold text-orange-700">
            ${projectedPuncSupport.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Initialize Monthly Debits */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-earth-brown mb-3">
            1. Initialize Monthly Debits
          </h2>
          <p className="text-sm text-stone-gray mb-4">
            Create a $55 monthly debit entry for each open chapter for {monthName}.
          </p>
          {monthlyDebitInitialized ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              ✓ Monthly debits already initialized for {monthName}
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                This will create {chapters.length} debit entries of -$55.00 each.
              </div>
              <button
                onClick={handleInitializeDebits}
                disabled={isProcessing}
                className="w-full py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Initialize Debits'}
              </button>
            </>
          )}
        </div>

        {/* Calculate PUNC Support */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-earth-brown mb-3">
            2. Calculate PUNC Support
          </h2>
          <p className="text-sm text-stone-gray mb-4">
            Calculate funding gaps and record PUNC support to cover them for {monthName}.
          </p>
          {!monthlyDebitInitialized ? (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm">
              ⚠ Initialize monthly debits first
            </div>
          ) : (
            <>
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-gray">Total needed:</span>
                  <span className="font-semibold">${projectedPuncSupport.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-gray">Chapters needing support:</span>
                  <span className="font-semibold">
                    {chapters.filter(c => c.contributions_this_month < c.monthly_cost).length}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCalculatePuncSupport}
                disabled={isProcessing}
                className="w-full py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Calculate & Record Support'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
        </div>
      )}

      {/* Chapter Details */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b-2 border-gray-100">
          <h2 className="text-2xl font-semibold text-earth-brown">
            Chapter Funding Details - {monthName}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-warm-cream/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-earth-brown">Chapter</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-earth-brown">Cost</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-earth-brown">Contributions</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-earth-brown">Gap</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-earth-brown">PUNC Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chapters.map((chapter) => {
                const gap = Math.max(0, chapter.monthly_cost - chapter.contributions_this_month);
                const isFullyFunded = chapter.contributions_this_month >= chapter.monthly_cost;

                return (
                  <tr key={chapter.chapter_id} className="hover:bg-warm-cream/20">
                    <td className="px-6 py-4 font-semibold text-earth-brown">
                      {chapter.chapter_name}
                    </td>
                    <td className="px-6 py-4 text-right text-stone-gray">
                      ${chapter.monthly_cost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-green-700">
                      ${chapter.contributions_this_month.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-orange-700">
                      {gap > 0 ? `$${gap.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isFullyFunded ? (
                        <span className="text-green-600">✓ Fully funded</span>
                      ) : (
                        <span className="font-semibold text-orange-700">
                          ${Math.abs(chapter.punc_support_this_month).toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
