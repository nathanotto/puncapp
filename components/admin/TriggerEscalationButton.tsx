'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TriggerEscalationButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleTrigger = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/trigger-escalation', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Escalation completed! Found ${data.meetingsIn3Days} meetings in 3 days, ${data.meetingsIn2Days} meetings in 2 days.`);
        // Refresh the page to show new notifications
        router.refresh();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleTrigger}
        disabled={loading}
        className="bg-burnt-orange text-white py-3 px-6 rounded-lg font-semibold hover:bg-burnt-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Running...' : 'Trigger Escalation'}
      </button>
      {message && (
        <p className="mt-3 text-sm text-stone-gray">{message}</p>
      )}
    </div>
  );
}
