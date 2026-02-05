'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { rsvpForMember, logOutreach, createFollowUpCommitment } from './actions';

interface Holdout {
  taskId: string;
  attendanceId: string;
  member: {
    id: string;
    name: string;
    username: string;
    phone: string | null;
  };
  meeting: any;
  reminderSentAt: string | null;
}

interface ContactActionsClientProps {
  holdouts: Holdout[];
}

export default function ContactActionsClient({ holdouts }: ContactActionsClientProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [commitmentDesc, setCommitmentDesc] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const handleRsvp = async (holdout: Holdout, rsvpStatus: 'yes' | 'no') => {
    const memberName = holdout.member.username || holdout.member.name;

    if (!confirm(`RSVP ${rsvpStatus} for ${memberName}?`)) {
      return;
    }

    setLoading({ ...loading, [holdout.member.id]: true });

    try {
      const formData = new FormData();
      formData.append('attendanceId', holdout.attendanceId);
      formData.append('taskId', holdout.taskId);
      formData.append('rsvpStatus', rsvpStatus);

      const result = await rsvpForMember(formData);

      if (result.success) {
        alert(result.message);
        if (result.redirect) {
          router.push(result.redirect);
          router.refresh();
        } else {
          router.push('/');
          router.refresh();
        }
      } else {
        alert(result.message);
        setLoading({ ...loading, [holdout.member.id]: false });
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setLoading({ ...loading, [holdout.member.id]: false });
    }
  };

  const handleLogOutreach = async (holdout: Holdout) => {
    const memberNotes = notes[holdout.member.id];

    if (!memberNotes?.trim()) {
      alert('Please enter notes about your outreach');
      return;
    }

    setLoading({ ...loading, [holdout.member.id]: true });

    try {
      const formData = new FormData();
      formData.append('attendanceId', holdout.attendanceId);
      formData.append('taskId', holdout.taskId);
      formData.append('notes', memberNotes);

      const result = await logOutreach(formData);

      if (result.success) {
        alert(result.consequence || result.message);
        // Clear the notes field
        setNotes({ ...notes, [holdout.member.id]: '' });
        setLoading({ ...loading, [holdout.member.id]: false });
        // Task stays open - don't redirect
      } else {
        alert(result.message);
        setLoading({ ...loading, [holdout.member.id]: false });
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setLoading({ ...loading, [holdout.member.id]: false });
    }
  };

  const handleCreateCommitment = async (holdout: Holdout) => {
    const desc = commitmentDesc[holdout.member.id];

    if (!desc?.trim()) {
      alert('Please enter a commitment description');
      return;
    }

    setLoading({ ...loading, [`commitment-${holdout.member.id}`]: true });

    try {
      const formData = new FormData();
      formData.append('attendanceId', holdout.attendanceId);
      formData.append('commitmentDescription', desc);

      const result = await createFollowUpCommitment(formData);

      if (result.success) {
        alert(result.message);
        setCommitmentDesc({ ...commitmentDesc, [holdout.member.id]: '' });
        setLoading({ ...loading, [`commitment-${holdout.member.id}`]: false });
      } else {
        alert(result.message);
        setLoading({ ...loading, [`commitment-${holdout.member.id}`]: false });
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setLoading({ ...loading, [`commitment-${holdout.member.id}`]: false });
    }
  };

  return (
    <div className="space-y-4">
      {holdouts.map((holdout) => {
        const memberName = holdout.member.username || holdout.member.name;
        const isExpanded = expandedMember === holdout.member.id;
        const isLoading = loading[holdout.member.id];
        const reminderDate = holdout.reminderSentAt
          ? new Date(holdout.reminderSentAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : null;

        return (
          <div
            key={holdout.member.id}
            className="border border-gray-200 rounded-lg p-4"
          >
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-earth-brown text-lg">
                  {holdout.member.name}
                </h3>
                {holdout.member.phone && (
                  <a
                    href={`tel:${holdout.member.phone}`}
                    className="text-sm text-burnt-orange hover:underline"
                  >
                    {holdout.member.phone}
                  </a>
                )}
                {reminderDate && (
                  <p className="text-xs text-stone-gray mt-1">
                    Reminder sent {reminderDate}
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleRsvp(holdout, 'yes')}
                  disabled={isLoading}
                  className="bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  ✓ Yes
                </button>
                <button
                  onClick={() => handleRsvp(holdout, 'no')}
                  disabled={isLoading}
                  className="bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  ✗ No
                </button>
                <button
                  onClick={() => setExpandedMember(isExpanded ? null : holdout.member.id)}
                  className="bg-gray-100 text-earth-brown py-2 px-4 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  {isExpanded ? 'Less' : 'More'}
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="border-t border-gray-200 pt-4 space-y-4">
                {/* Log Outreach Notes */}
                <div>
                  <label className="block text-sm font-medium text-earth-brown mb-2">
                    Log contact attempt
                  </label>
                  <textarea
                    value={notes[holdout.member.id] || ''}
                    onChange={(e) => setNotes({ ...notes, [holdout.member.id]: e.target.value })}
                    placeholder="Called, no answer. Will try again tomorrow..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                    rows={3}
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => handleLogOutreach(holdout)}
                    disabled={isLoading || !notes[holdout.member.id]?.trim()}
                    className="mt-2 bg-burnt-orange text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-burnt-orange/90 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Logging...' : 'Log Notes'}
                  </button>
                </div>

                {/* Create Commitment */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-earth-brown mb-2">
                    Create follow-up commitment
                  </label>
                  <textarea
                    value={commitmentDesc[holdout.member.id] || ''}
                    onChange={(e) => setCommitmentDesc({ ...commitmentDesc, [holdout.member.id]: e.target.value })}
                    placeholder={`I will reach out to ${memberName} by next Tuesday`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                    rows={2}
                    disabled={loading[`commitment-${holdout.member.id}`]}
                  />
                  <button
                    onClick={() => handleCreateCommitment(holdout)}
                    disabled={loading[`commitment-${holdout.member.id}`] || !commitmentDesc[holdout.member.id]?.trim()}
                    className="mt-2 bg-sage-green text-deep-charcoal py-2 px-4 rounded-lg text-sm font-semibold hover:bg-sage-green/90 transition-colors disabled:opacity-50"
                  >
                    {loading[`commitment-${holdout.member.id}`] ? 'Creating...' : 'Create Commitment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
