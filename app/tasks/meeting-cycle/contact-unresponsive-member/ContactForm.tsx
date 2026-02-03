'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOutreach } from './actions';

interface ContactFormProps {
  attendanceId: string;
  taskId: string;
  memberName: string;
}

export default function ContactForm({ attendanceId, taskId, memberName }: ContactFormProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!notes.trim()) {
      alert('Please enter notes about your outreach');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('attendanceId', attendanceId);
      formData.append('taskId', taskId);
      formData.append('notes', notes);

      const result = await logOutreach(formData);

      if (result.success) {
        // Redirect to dashboard with success message
        router.push('/dashboard');
      } else {
        alert(result.message);
        setLoading(false);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-earth-brown mb-2">
          What happened when you reached out?
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Called him, he's dealing with a family issue and won't make it..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange resize-none"
          rows={4}
          disabled={loading}
          required
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !notes.trim()}
          className="flex-1 bg-burnt-orange text-white py-3 px-6 rounded-lg font-semibold hover:bg-burnt-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging Outreach...' : 'Log Outreach'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          disabled={loading}
          className="px-6 py-3 border-2 border-stone-gray text-stone-gray rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-medium mb-1">After you log this:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li>{memberName}'s RSVP task will be marked as complete</li>
          <li>Your contact task will be marked as complete</li>
          <li>This will be noted as an agenda item for the meeting</li>
        </ul>
      </div>
    </form>
  );
}
