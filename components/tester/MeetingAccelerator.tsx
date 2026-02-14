'use client';

import { useState } from 'react';

interface MeetingAcceleratorProps {
  meetingId: string;
}

export function MeetingAccelerator({ meetingId }: MeetingAcceleratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  async function bulkCheckin() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/bulk-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Checked in ${data.count} members` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function accelerateLightning() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/accelerate-lightning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Lightning completed (${data.count} people)` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function accelerateCheckins() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/accelerate-checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Full check-ins completed (${data.count} people)` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function completeCurriculum() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/complete-curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Curriculum completed (${data.count} responses)` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function completeFeedback() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/complete-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Feedback completed (${data.count} responses)` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function resetMeeting() {
    if (!confirm('Reset this meeting to the beginning? This will clear all progress.')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/reset-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ ${data.message}` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -top-2 -left-2 w-8 h-8 bg-green-600 text-white rounded-full text-xs font-bold shadow-lg hover:bg-green-700"
      >
        {isExpanded ? '−' : '⚡'}
      </button>

      {isExpanded && (
        <div className="bg-green-900 text-white rounded-lg shadow-2xl w-80 text-sm overflow-hidden">
          <div className="bg-green-800 px-3 py-2 font-bold flex items-center gap-2">
            <span>⚡</span>
            <span>MEETING ACCELERATOR</span>
          </div>

          <div className="p-3 space-y-3">
            {lastResult && (
              <div className={`text-xs p-2 rounded ${
                lastResult.startsWith('✓') ? 'bg-green-700' : 'bg-red-800'
              }`}>
                {lastResult}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={resetMeeting}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold disabled:opacity-50 transition-colors border-2 border-red-400"
              >
                🔄 Reset Meeting to Beginning
              </button>

              <div className="border-t border-green-700 my-2 pt-2">
                <button
                  onClick={bulkCheckin}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold disabled:opacity-50 transition-colors"
                >
                  1️⃣ Check In All Members
                </button>
              </div>

              <button
                onClick={accelerateLightning}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded font-semibold disabled:opacity-50 transition-colors"
              >
                2️⃣ Complete Lightning Round
              </button>

              <button
                onClick={accelerateCheckins}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded font-semibold disabled:opacity-50 transition-colors"
              >
                3️⃣ Complete Full Check-ins
              </button>

              <button
                onClick={completeCurriculum}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold disabled:opacity-50 transition-colors"
              >
                4️⃣ Complete Curriculum
              </button>

              <button
                onClick={completeFeedback}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded font-semibold disabled:opacity-50 transition-colors"
              >
                5️⃣ Complete Feedback
              </button>
            </div>

            {isLoading && (
              <div className="text-center text-green-300">
                Loading...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
