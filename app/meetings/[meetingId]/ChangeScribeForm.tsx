'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeScribe } from './actions';

interface ChangeScribeFormProps {
  meetingId: string;
  currentScribeId: string | null;
  checkedInMembers: Array<{ id: string; name: string }>;
}

export default function ChangeScribeForm({
  meetingId,
  currentScribeId,
  checkedInMembers,
}: ChangeScribeFormProps) {
  const [newScribeId, setNewScribeId] = useState(currentScribeId || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newScribeId || newScribeId === currentScribeId) {
      setMessage('Please select a different Scribe');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('meetingId', meetingId);
      formData.append('newScribeId', newScribeId);

      const result = await changeScribe(formData);

      if (result.success) {
        setMessage(`✅ ${result.message}`);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="newScribe" className="block text-sm font-medium text-earth-brown mb-2">
          Select new Scribe:
        </label>
        <select
          id="newScribe"
          value={newScribeId}
          onChange={(e) => setNewScribeId(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
          disabled={loading}
        >
          <option value="">-- Select a member --</option>
          {checkedInMembers.map(member => (
            <option key={member.id} value={member.id}>
              {member.name} {member.id === currentScribeId ? '(Current Scribe)' : ''}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading || !newScribeId || newScribeId === currentScribeId}
        className="bg-burnt-orange text-white py-2 px-6 rounded-lg font-semibold hover:bg-burnt-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Changing...' : 'Change Scribe'}
      </button>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.startsWith('✅')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}
    </form>
  );
}
