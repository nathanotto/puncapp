'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOutreachFromRsvpList } from '@/app/meetings/[meetingId]/rsvps/actions';

interface LogOutreachFormProps {
  attendanceId: string;
  memberName: string;
}

export default function LogOutreachForm({ attendanceId, memberName }: LogOutreachFormProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!notes.trim()) {
      setMessage('Please enter notes about your outreach');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('attendanceId', attendanceId);
      formData.append('notes', notes);

      const result = await logOutreachFromRsvpList(formData);

      if (result.success) {
        setMessage('✅ Outreach logged successfully');
        setNotes('');
        router.refresh();
      } else {
        setMessage(`❌ ${result.message}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-earth-brown">
          Log your outreach with {memberName}:
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Called him, he's dealing with a family issue and won't make it..."
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange resize-none"
          rows={2}
          disabled={loading}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !notes.trim()}
          className="bg-burnt-orange text-white py-2 px-4 rounded-lg font-medium hover:bg-burnt-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging...' : 'Log Outreach'}
        </button>

        {message && (
          <span className="text-sm text-stone-gray">{message}</span>
        )}
      </div>
    </form>
  );
}
