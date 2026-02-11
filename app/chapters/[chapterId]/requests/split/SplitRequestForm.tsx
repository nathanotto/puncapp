'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SplitRequestData } from '@/types/lifecycle-requests';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  is_leader_certified: boolean;
}

interface NewMember {
  id: string;
  name: string;
  email: string;
  address: string | null;
}

interface SplitRequestFormProps {
  chapterId: string;
  chapterName: string;
  defaultMeetingDay: string | null;
  defaultMeetingTime: string | null;
  meetingFrequency: string | null;
  currentMembers: Member[];
  availableNewMembers: NewMember[];
  currentUserId: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SplitRequestForm({
  chapterId,
  chapterName,
  defaultMeetingDay,
  defaultMeetingTime,
  meetingFrequency,
  currentMembers,
  availableNewMembers,
  currentUserId,
}: SplitRequestFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [reason, setReason] = useState('');
  const [newChapterName, setNewChapterName] = useState('');
  const [newChapterLocation, setNewChapterLocation] = useState('');
  const [newChapterMeetingDay, setNewChapterMeetingDay] = useState(defaultMeetingDay || 'Wednesday');
  const [newChapterMeetingTime, setNewChapterMeetingTime] = useState(defaultMeetingTime || '19:00');

  // Member assignments (user ID -> assignment)
  const [memberAssignments, setMemberAssignments] = useState<Record<string, 'original' | 'new' | 'both'>>(
    Object.fromEntries(currentMembers.map(m => [m.id, 'original' as const]))
  );

  // New members to add (user ID -> target chapter)
  const [selectedNewMembers, setSelectedNewMembers] = useState<Record<string, 'original' | 'new'>>({});

  // Leadership
  const [newChapterLeaderId, setNewChapterLeaderId] = useState('');
  const [newChapterBackupLeaderId, setNewChapterBackupLeaderId] = useState('');

  const [newMemberSearch, setNewMemberSearch] = useState('');

  const updateAssignment = (memberId: string, assignment: 'original' | 'new' | 'both') => {
    setMemberAssignments(prev => ({ ...prev, [memberId]: assignment }));
    setError(null);
  };

  const toggleNewMember = (userId: string, target: 'original' | 'new') => {
    setSelectedNewMembers(prev => {
      const newSelected = { ...prev };
      if (newSelected[userId]) {
        delete newSelected[userId];
      } else {
        newSelected[userId] = target;
      }
      return newSelected;
    });
  };

  // Calculate assignments
  const originalMembers = currentMembers.filter(m =>
    memberAssignments[m.id] === 'original' || memberAssignments[m.id] === 'both'
  );
  const newMembers = currentMembers.filter(m =>
    memberAssignments[m.id] === 'new' || memberAssignments[m.id] === 'both'
  );
  const dualMembers = currentMembers.filter(m => memberAssignments[m.id] === 'both');

  // Get certified members in new chapter
  const certifiedInNew = currentMembers.filter(m =>
    (memberAssignments[m.id] === 'new' || memberAssignments[m.id] === 'both') &&
    m.is_leader_certified
  );

  const filteredNewMembers = availableNewMembers.filter(user =>
    user.name.toLowerCase().includes(newMemberSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(newMemberSearch.toLowerCase())
  );

  const validate = () => {
    if (!reason || !newChapterName || !newChapterLocation) {
      return 'All required fields must be filled';
    }

    if (originalMembers.length < 5) {
      return `Original chapter must have at least 5 members (currently ${originalMembers.length})`;
    }

    if (newMembers.length < 5) {
      return `New chapter must have at least 5 members (currently ${newMembers.length})`;
    }

    if (!newChapterLeaderId) {
      return 'New chapter leader must be selected';
    }

    if (certifiedInNew.length === 0) {
      return 'New chapter must have at least one certified leader';
    }

    return null;
  };

  const handleSave = async (submit: boolean) => {
    const validationError = validate();
    if (submit && validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const requestData: SplitRequestData = {
        reason,
        new_chapter_name: newChapterName,
        new_chapter_location: newChapterLocation,
        new_chapter_meeting_day: newChapterMeetingDay !== defaultMeetingDay ? newChapterMeetingDay : undefined,
        new_chapter_meeting_time: newChapterMeetingTime !== defaultMeetingTime ? newChapterMeetingTime : undefined,
        original_chapter_member_ids: currentMembers
          .filter(m => memberAssignments[m.id] === 'original')
          .map(m => m.id),
        new_chapter_member_ids: currentMembers
          .filter(m => memberAssignments[m.id] === 'new')
          .map(m => m.id),
        dual_membership_member_ids: dualMembers.map(m => m.id),
        new_member_ids: Object.keys(selectedNewMembers),
        new_members_target: selectedNewMembers,
        new_chapter_leader_id: newChapterLeaderId,
        new_chapter_backup_leader_id: newChapterBackupLeaderId || undefined,
      };

      // Create request
      const createResponse = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: 'split',
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
        <h2 className="text-xl font-bold text-earth-brown mb-4">Reason for Split</h2>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="e.g., We've grown to 11 members and want more time per man..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
        />
      </div>

      {/* New Chapter Details */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-earth-brown mb-4">New Chapter Details</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-earth-brown mb-1">
              New Chapter Name *
            </label>
            <input
              type="text"
              value={newChapterName}
              onChange={(e) => setNewChapterName(e.target.value)}
              placeholder="e.g., Pine Chapter"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-brown mb-1">
              New Chapter Location *
            </label>
            <input
              type="text"
              value={newChapterLocation}
              onChange={(e) => setNewChapterLocation(e.target.value)}
              placeholder="e.g., Mike's House, 456 Oak Ave"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-earth-brown mb-1">
                Meeting Day
              </label>
              <select
                value={newChapterMeetingDay}
                onChange={(e) => setNewChapterMeetingDay(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
              >
                {DAYS.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-earth-brown mb-1">
                Meeting Time
              </label>
              <input
                type="time"
                value={newChapterMeetingTime}
                onChange={(e) => setNewChapterMeetingTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Member Assignments */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-earth-brown mb-4">Member Assignments</h2>
        <p className="text-sm text-stone-gray mb-4">
          Assign each current member to Original Chapter, New Chapter, or Both
        </p>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {currentMembers.map(member => (
            <div key={member.id} className="flex items-center gap-4 p-3 bg-warm-cream/30 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-earth-brown">
                  {member.name}
                  {member.role !== 'member' && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-sage-green text-deep-charcoal rounded">
                      {member.role}
                    </span>
                  )}
                  {member.is_leader_certified && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      Certified
                    </span>
                  )}
                </p>
                <p className="text-sm text-stone-gray">{member.email}</p>
              </div>
              <select
                value={memberAssignments[member.id]}
                onChange={(e) => updateAssignment(member.id, e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
              >
                <option value="original">Original Chapter</option>
                <option value="new">New Chapter</option>
                <option value="both">Both Chapters</option>
              </select>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-4 text-sm">
          <div>
            <span className="font-medium">Original:</span> {originalMembers.length}
          </div>
          <div>
            <span className="font-medium">New:</span> {newMembers.length}
          </div>
          <div>
            <span className="font-medium">Both:</span> {dualMembers.length}
          </div>
        </div>
      </div>

      {/* New Members */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-earth-brown mb-4">Add New Members (Optional)</h2>
        <p className="text-sm text-stone-gray mb-4">
          Now that there's room, add new members to either chapter
        </p>

        <input
          type="text"
          value={newMemberSearch}
          onChange={(e) => setNewMemberSearch(e.target.value)}
          placeholder="Search available members..."
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
        />

        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredNewMembers.map(user => (
            <div key={user.id} className="flex items-center gap-4 p-3 hover:bg-warm-cream/50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-earth-brown">{user.name}</p>
                <p className="text-sm text-stone-gray">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleNewMember(user.id, 'original')}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedNewMembers[user.id] === 'original'
                      ? 'bg-burnt-orange text-white'
                      : 'bg-gray-200 text-earth-brown hover:bg-gray-300'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => toggleNewMember(user.id, 'new')}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedNewMembers[user.id] === 'new'
                      ? 'bg-burnt-orange text-white'
                      : 'bg-gray-200 text-earth-brown hover:bg-gray-300'
                  }`}
                >
                  New
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Chapter Leadership */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-earth-brown mb-4">New Chapter Leadership</h2>

        {certifiedInNew.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ No certified leaders assigned to new chapter
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-earth-brown mb-1">
              New Chapter Leader *
            </label>
            <select
              value={newChapterLeaderId}
              onChange={(e) => setNewChapterLeaderId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
            >
              <option value="">Select leader...</option>
              {certifiedInNew.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.is_leader_certified ? '(Certified)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-brown mb-1">
              Backup Leader (Optional)
            </label>
            <select
              value={newChapterBackupLeaderId}
              onChange={(e) => setNewChapterBackupLeaderId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
            >
              <option value="">None</option>
              {newMembers
                .filter(m => m.id !== newChapterLeaderId)
                .map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
            </select>
          </div>
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
