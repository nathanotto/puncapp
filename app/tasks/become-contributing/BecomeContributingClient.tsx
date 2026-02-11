'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BecomeContributingClientProps {
  taskId: string;
  chapterId: string;
  chapterName: string;
}

export function BecomeContributingClient({
  taskId,
  chapterId,
  chapterName,
}: BecomeContributingClientProps) {
  const router = useRouter();
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResponse = async (accept: boolean) => {
    setResponding(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/become-contributing/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to respond');
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to respond');
      setResponding(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🤝</div>
          <h1 className="text-3xl font-bold text-earth-brown mb-2">
            Become a Contributing Member
          </h1>
          <p className="text-xl text-stone-gray">{chapterName}</p>
        </div>

        {/* Content */}
        <div className="space-y-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-semibold text-earth-brown mb-3">What does this mean?</h2>
            <ul className="space-y-2 text-stone-gray">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>You'll be able to see the chapter's funding status</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>You'll have the option to support the chapter financially</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>You'll see how PUNC supports chapters that need it</span>
              </li>
            </ul>
          </div>

          <div className="bg-sage-green/20 border border-sage-green rounded-lg p-6">
            <h2 className="font-semibold text-earth-brown mb-3">Important to know:</h2>
            <ul className="space-y-2 text-stone-gray">
              <li className="flex items-start gap-2">
                <span className="text-sage-green mt-1">✓</span>
                <span><strong>There's no obligation to donate.</strong> Contributing members can see the funding situation, but giving is always voluntary.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sage-green mt-1">✓</span>
                <span>You can choose to give anonymously, or let the leader or whole chapter know.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sage-green mt-1">✓</span>
                <span>PUNC covers any funding gaps, so the chapter is supported regardless.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => handleResponse(false)}
            disabled={responding}
            className="flex-1 px-6 py-3 bg-gray-200 text-earth-brown font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Not Now
          </button>
          <button
            onClick={() => handleResponse(true)}
            disabled={responding}
            className="flex-1 px-6 py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {responding ? 'Processing...' : 'Yes, I\'ll Be Contributing'}
          </button>
        </div>
      </div>
    </div>
  );
}
