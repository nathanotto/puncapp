'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkInToMeeting } from './actions';

interface CheckInFormProps {
  meetingId: string;
  isUpdate?: boolean;
}

export default function CheckInForm({ meetingId, isUpdate = false }: CheckInFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleCheckIn = async (attendanceType: 'in_person' | 'video') => {
    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('meetingId', meetingId);
      formData.append('attendanceType', attendanceType);

      const result = await checkInToMeeting(formData);

      if (result.success) {
        setMessage(`✅ ${result.message} - You're all set!`);
        // Refresh to show updated state
        router.refresh();

        // Give a hint about hard refresh if they have other pages open
        setTimeout(() => {
          setMessage(`✅ ${result.message} - You're all set! (If you have the Start Meeting page open, hard refresh it to see the update)`);
        }, 2000);
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleCheckIn('in_person')}
          disabled={loading}
          className="bg-burnt-orange text-white py-4 px-6 rounded-lg font-semibold hover:bg-burnt-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2"
        >
          <span className="text-2xl">🤝</span>
          <span>{isUpdate ? 'Switch to' : 'I\'m'} In Person</span>
        </button>

        <button
          onClick={() => handleCheckIn('video')}
          disabled={loading}
          className="bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2"
        >
          <span className="text-2xl">📹</span>
          <span>{isUpdate ? 'Switch to' : 'I\'m'} Video</span>
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-center ${
          message.startsWith('✅')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {loading && (
        <div className="text-center text-stone-gray">
          <p>Checking you in...</p>
        </div>
      )}
    </div>
  );
}
