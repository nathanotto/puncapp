'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RecordDonationClientProps {
  chapters: Array<{ id: string; name: string }>;
  adminId: string;
}

export function RecordDonationClient({ chapters, adminId }: RecordDonationClientProps) {
  const router = useRouter();
  const [donationType, setDonationType] = useState<'outside_donation' | 'cross_chapter_donation'>('outside_donation');
  const [chapterId, setChapterId] = useState('');
  const [donorChapterId, setDonorChapterId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!chapterId) {
      setError('Please select a recipient chapter');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (donationType === 'cross_chapter_donation' && !donorChapterId) {
      setError('Please select a donor chapter');
      return;
    }

    if (donationType === 'cross_chapter_donation' && donorChapterId === chapterId) {
      setError('Donor and recipient chapters must be different');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/funding/record-donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_id: chapterId,
          donor_chapter_id: donationType === 'cross_chapter_donation' ? donorChapterId : null,
          transaction_type: donationType,
          amount: amountNum,
          note: note || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record donation');
      }

      // Reset form
      setChapterId('');
      setDonorChapterId('');
      setAmount('');
      setNote('');
      setSuccess(true);

      // Refresh data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Donation Type */}
        <div>
          <label className="block text-sm font-semibold text-earth-brown mb-2">
            Donation Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDonationType('outside_donation')}
              className={`p-3 border-2 rounded-lg transition-colors ${
                donationType === 'outside_donation'
                  ? 'border-burnt-orange bg-burnt-orange/10 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Outside Donation
            </button>
            <button
              type="button"
              onClick={() => setDonationType('cross_chapter_donation')}
              className={`p-3 border-2 rounded-lg transition-colors ${
                donationType === 'cross_chapter_donation'
                  ? 'border-burnt-orange bg-burnt-orange/10 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Cross-Chapter Donation
            </button>
          </div>
        </div>

        {/* Donor Chapter (for cross-chapter only) */}
        {donationType === 'cross_chapter_donation' && (
          <div>
            <label className="block text-sm font-semibold text-earth-brown mb-2">
              Donor Chapter
            </label>
            <select
              value={donorChapterId}
              onChange={(e) => setDonorChapterId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-burnt-orange focus:outline-none"
              required
            >
              <option value="">Select donor chapter...</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Recipient Chapter */}
        <div>
          <label className="block text-sm font-semibold text-earth-brown mb-2">
            Recipient Chapter
          </label>
          <select
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-burnt-orange focus:outline-none"
            required
          >
            <option value="">Select recipient chapter...</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
        </div>

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
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-semibold text-earth-brown mb-2">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-burnt-orange focus:outline-none"
            placeholder="Add any relevant details about this donation..."
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            Donation recorded successfully!
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Recording...' : 'Record Donation'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/funding')}
            className="px-6 py-3 border-2 border-gray-300 text-earth-brown font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
