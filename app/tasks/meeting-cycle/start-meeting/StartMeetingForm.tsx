'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startMeeting } from './actions';

interface StartMeetingFormProps {
  meetingId: string;
  checkedInMembers: Array<{ id: string; name: string }>;
  currentUserId: string;
  isLate: boolean;
  minutesLate: number;
}

export default function StartMeetingForm({
  meetingId,
  checkedInMembers,
  currentUserId,
  isLate,
  minutesLate,
}: StartMeetingFormProps) {
  const [scribeId, setScribeId] = useState(currentUserId);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scribeId) {
      setMessage('Please select a Scribe');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('meetingId', meetingId);
      formData.append('scribeId', scribeId);

      const result = await startMeeting(formData);

      if (result.success) {
        // Redirect to meeting page
        router.push(`/meetings/${meetingId}`);
      } else {
        setMessage(`❌ ${result.message}`);
        setLoading(false);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Scribe Selector */}
      <div>
        <label htmlFor="scribe" className="block text-sm font-medium text-earth-brown mb-2">
          Who will be the Scribe?
        </label>
        <p className="text-xs text-stone-gray mb-3">
          The Scribe runs the app during the meeting (can be changed later).
        </p>
        <select
          id="scribe"
          value={scribeId}
          onChange={(e) => setScribeId(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
          disabled={loading}
        >
          {checkedInMembers.length === 0 ? (
            <option value={currentUserId}>Myself (not checked in yet)</option>
          ) : (
            checkedInMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.name} {member.id === currentUserId ? '(You)' : ''}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Late warning confirmation */}
      {isLate && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-800">
            <strong>Note:</strong> Meeting is starting {minutesLate} minutes late.
            This will be logged to the leadership log.
          </p>
        </div>
      )}

      {/* Submit button */}
      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-burnt-orange text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-burnt-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting Meeting...' : 'Start Meeting'}
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-lg text-center bg-red-50 text-red-800 border border-red-200">
          {message}
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-medium mb-2">After starting:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li>Meeting status will change to "In Progress"</li>
          <li>Members not yet checked in will receive notifications</li>
          <li>The Scribe will have access to meeting runner controls</li>
        </ul>
      </div>
    </form>
  );
}
