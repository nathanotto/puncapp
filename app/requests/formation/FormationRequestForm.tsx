'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormationRequestData } from '@/types/lifecycle-requests';

interface User {
  id: string;
  name: string;
  username: string | null;
  email: string;
  address: string | null;
}

interface FormationRequestFormProps {
  leaderId: string;
  leaderName: string;
  availableUsers: User[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;

export default function FormationRequestForm({
  leaderId,
  leaderName,
  availableUsers,
}: FormationRequestFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [proposedName, setProposedName] = useState('');
  const [proposedLocation, setProposedLocation] = useState('');
  const [meetingDay, setMeetingDay] = useState('Wednesday');
  const [meetingTime, setMeetingTime] = useState('19:00');
  const [meetingFrequency, setMeetingFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [leaderStatement, setLeaderStatement] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleMember = (userId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      if (newSelected.size >= 7) {
        setError('Maximum 7 founding members (plus you = 8 total)');
        return;
      }
      newSelected.add(userId);
    }
    setSelectedMembers(newSelected);
    setError(null);
  };

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveDraft = async () => {
    if (!proposedName || !proposedLocation) {
      setError('Chapter name and location are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const requestData: FormationRequestData = {
        proposed_name: proposedName,
        proposed_location: proposedLocation,
        meeting_day: meetingDay,
        meeting_time: meetingTime,
        meeting_frequency: meetingFrequency,
        founding_member_ids: Array.from(selectedMembers),
        leader_statement: leaderStatement,
      };

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: 'formation',
          request_data: requestData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save draft');
      }

      const { request } = await response.json();
      router.push(`/requests/${request.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!proposedName || !proposedLocation || !leaderStatement) {
      setError('All required fields must be filled');
      return;
    }

    if (selectedMembers.size < 4) {
      setError('Minimum 4 founding members required (plus you = 5 total)');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const requestData: FormationRequestData = {
        proposed_name: proposedName,
        proposed_location: proposedLocation,
        meeting_day: meetingDay,
        meeting_time: meetingTime,
        meeting_frequency: meetingFrequency,
        founding_member_ids: Array.from(selectedMembers),
        leader_statement: leaderStatement,
      };

      // Create request
      const createResponse = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: 'formation',
          request_data: requestData,
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || 'Failed to create request');
      }

      const { request } = await createResponse.json();

      // Submit request
      const submitResponse = await fetch(`/api/requests/${request.id}/submit`, {
        method: 'POST',
      });

      if (!submitResponse.ok) {
        throw new Error('Failed to submit request');
      }

      router.push(`/requests/${request.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSaving(false);
    }
  };

  const totalMembers = selectedMembers.size + 1; // +1 for leader

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Chapter Details */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-earth-brown mb-4">Chapter Details</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-earth-brown mb-1">
              Chapter Name *
            </label>
            <input
              type="text"
              value={proposedName}
              onChange={(e) => setProposedName(e.target.value)}
              placeholder="e.g., Cedar Chapter"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-brown mb-1">
              Default Meeting Location *
            </label>
            <input
              type="text"
              value={proposedLocation}
              onChange={(e) => setProposedLocation(e.target.value)}
              placeholder="e.g., Joe's House, 123 Main St"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-earth-brown mb-1">
                Meeting Day *
              </label>
              <select
                value={meetingDay}
                onChange={(e) => setMeetingDay(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
              >
                {DAYS.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-earth-brown mb-1">
                Meeting Time *
              </label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-earth-brown mb-1">
                Frequency *
              </label>
              <select
                value={meetingFrequency}
                onChange={(e) => setMeetingFrequency(e.target.value as typeof meetingFrequency)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
              >
                {FREQUENCIES.map(freq => (
                  <option key={freq} value={freq}>
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Leader Statement */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-earth-brown mb-4">Your Statement</h2>
        <label className="block text-sm font-medium text-earth-brown mb-2">
          Why do you want to lead this chapter? What's your vision? *
        </label>
        <textarea
          value={leaderStatement}
          onChange={(e) => setLeaderStatement(e.target.value)}
          rows={6}
          placeholder="Share your vision for this chapter..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
        />
      </div>

      {/* Founding Members */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-earth-brown">Founding Members</h2>
          <span className="text-sm text-stone-gray">
            {totalMembers} member{totalMembers !== 1 ? 's' : ''} selected (including you)
          </span>
        </div>

        <p className="text-sm text-stone-gray mb-4">
          Select 4-7 founding members (plus you = 5-8 total)
        </p>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or location..."
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
        />

        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredUsers.map(user => (
            <label
              key={user.id}
              className="flex items-center gap-3 p-3 hover:bg-warm-cream/50 rounded-lg cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedMembers.has(user.id)}
                onChange={() => toggleMember(user.id)}
                className="w-4 h-4 text-burnt-orange focus:ring-burnt-orange rounded"
              />
              <div className="flex-1">
                <p className="font-medium text-earth-brown">{user.name}</p>
                <p className="text-sm text-stone-gray">{user.email}</p>
                {user.address && (
                  <p className="text-xs text-stone-gray">{user.address}</p>
                )}
              </div>
            </label>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <p className="text-center text-stone-gray py-8">
            No available users found
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleSaveDraft}
          disabled={saving || !proposedName || !proposedLocation}
          className="px-6 py-3 bg-gray-200 text-earth-brown font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || selectedMembers.size < 4}
          className="flex-1 px-6 py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
}
