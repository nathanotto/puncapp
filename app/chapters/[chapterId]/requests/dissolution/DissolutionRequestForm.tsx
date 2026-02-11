'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DissolutionRequestData } from '@/types/lifecycle-requests';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DissolutionRequestFormProps {
  chapterId: string;
  chapterName: string;
  currentMembers: Member[];
}

export default function DissolutionRequestForm({
  chapterId,
  chapterName,
  currentMembers,
}: DissolutionRequestFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [reason, setReason] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [memberNotes, setMemberNotes] = useState<Record<string, string>>(
    Object.fromEntries(currentMembers.map(m => [m.id, '']))
  );

  const updateMemberNote = (memberId: string, note: string) => {
    setMemberNotes(prev => ({ ...prev, [memberId]: note }));
  };

  const validate = () => {
    if (!reason) {
      return 'Reason for dissolution is required';
    }
    if (!whatHappened) {
      return 'Chapter story is required';
    }
    return null;
  };

  const handleSave = async (submit: boolean) => {
    if (submit) {
      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const requestData: DissolutionRequestData = {
        reason,
        what_happened: whatHappened,
        member_notes: memberNotes,
      };

      // Create request
      const createResponse = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: 'dissolution',
          chapter_id: chapterId,
          request_data: requestData,
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || 'Failed to save request');
      }

      const { request } = await createResponse.json();

      // Submit if requested
      if (submit) {
        const submitResponse = await fetch(`/api/requests/${request.id}/submit`, {
          method: 'POST',
        });

        if (!submitResponse.ok) {
          throw new Error('Failed to submit request');
        }
      }

      router.push(`/requests/${request.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Reason */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-earth-brown mb-4">Reason for Dissolution</h2>
        <label className="block text-sm font-medium text-earth-brown mb-2">
          Why is the chapter dissolving? *
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="e.g., Several members have moved away, insufficient attendance..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
        />
      </div>

      {/* Chapter Story */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-earth-brown mb-4">Chapter Story</h2>
        <label className="block text-sm font-medium text-earth-brown mb-2">
          Tell the story of this chapter — what happened, what worked, what didn't: *
        </label>
        <textarea
          value={whatHappened}
          onChange={(e) => setWhatHappened(e.target.value)}
          rows={8}
          placeholder="Share the journey of this chapter..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
        />
      </div>

      {/* Member Preferences */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-earth-brown mb-4">Member Preferences</h2>
        <p className="text-sm text-stone-gray mb-4">
          Note any preferences or plans for each member after the chapter closes
        </p>

        <div className="space-y-4">
          {currentMembers.map(member => (
            <div key={member.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
              <label className="block mb-2">
                <span className="font-medium text-earth-brown">
                  {member.name}
                  {member.role !== 'member' && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-sage-green text-deep-charcoal rounded">
                      {member.role}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-stone-gray mb-2">{member.email}</span>
                <input
                  type="text"
                  value={memberNotes[member.id] || ''}
                  onChange={(e) => updateMemberNote(member.id, e.target.value)}
                  placeholder="e.g., Interested in joining Cedar Chapter, moving away, taking a break..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="px-6 py-3 bg-gray-200 text-earth-brown font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex-1 px-6 py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
}
