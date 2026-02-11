'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormationRequestData, SplitRequestData, OptInType, ChapterAssignment } from '@/types/lifecycle-requests';

interface OptInResponseFormProps {
  optInId: string;
  optInType: OptInType;
  proposedAssignment: ChapterAssignment | null;
  requestType: string;
  requestData: any;
  chapterName: string | undefined;
  submitterName: string | undefined;
  userAddress: string;
  userPhone: string;
  otherMembers: Array<{ id: string; name: string }>;
}

export default function OptInResponseForm({
  optInId,
  optInType,
  proposedAssignment,
  requestType,
  requestData,
  chapterName,
  submitterName,
  userAddress,
  userPhone,
  otherMembers,
}: OptInResponseFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [confirmed, setConfirmed] = useState(false);
  const [address, setAddress] = useState(userAddress);
  const [phone, setPhone] = useState(userPhone);
  const [changeRequest, setChangeRequest] = useState('');
  const [showChangeRequest, setShowChangeRequest] = useState(false);

  const isFormation = optInType === 'formation' || optInType === 'split_new';
  const isSplitExisting = optInType === 'split_existing';

  const formationData = isFormation ? (requestData as FormationRequestData) : null;
  const splitData = !isFormation ? (requestData as SplitRequestData) : null;

  const handleConfirm = async () => {
    if (!confirmed) {
      setError('Please check the confirmation box');
      return;
    }

    if (isFormation && (!address || !phone)) {
      setError('Address and phone are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/opt-ins/${optInId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: 'confirm',
          address: address || undefined,
          phone: phone || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to confirm');
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this invitation?')) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/opt-ins/${optInId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: 'decline',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to decline');
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChange = async () => {
    if (!changeRequest.trim()) {
      setError('Please describe what assignment you would prefer');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/opt-ins/${optInId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: 'request_change',
          change_request: changeRequest,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit change request');
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit change request');
    } finally {
      setSubmitting(false);
    }
  };

  const getAssignmentText = () => {
    if (proposedAssignment === 'both') return 'Both Chapters';
    if (proposedAssignment === 'original') return 'Original Chapter';
    if (proposedAssignment === 'new') return 'New Chapter';
    return '';
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Formation Opt-In */}
      {isFormation && formationData && (
        <>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-earth-brown mb-2">
              You're Invited to Join {formationData.proposed_name}
            </h1>
            <p className="text-stone-gray">
              {submitterName} has invited you to be a founding member of this new chapter
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Chapter Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-stone-gray">Name</p>
                <p className="font-medium text-earth-brown">{formationData.proposed_name}</p>
              </div>
              <div>
                <p className="text-sm text-stone-gray">Location</p>
                <p className="font-medium text-earth-brown">{formationData.proposed_location}</p>
              </div>
              <div>
                <p className="text-sm text-stone-gray">Schedule</p>
                <p className="font-medium text-earth-brown">
                  {formationData.meeting_day}s at {formationData.meeting_time}
                </p>
              </div>
              <div>
                <p className="text-sm text-stone-gray">Frequency</p>
                <p className="font-medium text-earth-brown">
                  {formationData.meeting_frequency.charAt(0).toUpperCase() + formationData.meeting_frequency.slice(1)}
                </p>
              </div>
            </div>

            {formationData.leader_statement && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-earth-brown mb-2">Leader's Vision</p>
                <p className="text-stone-gray whitespace-pre-wrap">{formationData.leader_statement}</p>
              </div>
            )}
          </div>

          {otherMembers.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-earth-brown mb-4">Other Founding Members</h2>
              <ul className="space-y-2">
                <li className="text-earth-brown">
                  {submitterName} <span className="text-xs text-stone-gray">(Leader)</span>
                </li>
                {otherMembers.map(member => (
                  <li key={member.id} className="text-earth-brown">{member.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Your Response</h2>

            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-4 h-4 text-burnt-orange focus:ring-burnt-orange rounded"
              />
              <span className="text-earth-brown">
                I want to join this chapter and commit to attending meetings
              </span>
            </label>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-earth-brown">Confirm your contact information:</p>

              <div>
                <label className="block text-sm font-medium text-earth-brown mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-earth-brown mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleConfirm}
                disabled={submitting || !confirmed}
                className="flex-1 px-6 py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Confirming...' : 'Confirm & Join'}
              </button>
              <button
                onClick={handleDecline}
                disabled={submitting}
                className="px-6 py-3 bg-gray-200 text-earth-brown font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Decline
              </button>
            </div>
          </div>
        </>
      )}

      {/* Split Existing Member */}
      {isSplitExisting && splitData && (
        <>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-earth-brown mb-2">
              {chapterName} is Splitting
            </h1>
            <p className="text-stone-gray">
              Your chapter is splitting into two chapters to better serve all members
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-earth-brown mb-4">What's Happening</h2>
            <p className="text-stone-gray mb-4">{splitData.reason}</p>

            <div className="bg-warm-cream/50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-earth-brown mb-2">
                You've been assigned to: <span className="text-burnt-orange text-lg">{getAssignmentText()}</span>
              </p>
              {proposedAssignment === 'both' && (
                <p className="text-sm text-stone-gray">
                  You'll be a member of both the original and new chapters
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-earth-brown mb-4">New Chapter Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-stone-gray">Name</p>
                <p className="font-medium text-earth-brown">{splitData.new_chapter_name}</p>
              </div>
              <div>
                <p className="text-sm text-stone-gray">Location</p>
                <p className="font-medium text-earth-brown">{splitData.new_chapter_location}</p>
              </div>
            </div>
          </div>

          {!showChangeRequest ? (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-earth-brown mb-4">Your Response</h2>

              <label className="flex items-start gap-3 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 text-burnt-orange focus:ring-burnt-orange rounded"
                />
                <span className="text-earth-brown">
                  I confirm my assignment to {getAssignmentText()}
                </span>
              </label>

              <div className="flex gap-4">
                <button
                  onClick={handleConfirm}
                  disabled={submitting || !confirmed}
                  className="flex-1 px-6 py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Confirming...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowChangeRequest(true)}
                  disabled={submitting}
                  className="px-6 py-3 bg-gray-200 text-earth-brown font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Request Different Assignment
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-earth-brown mb-4">Request Different Assignment</h2>

              <label className="block text-sm font-medium text-earth-brown mb-2">
                What assignment would you prefer?
              </label>
              <textarea
                value={changeRequest}
                onChange={(e) => setChangeRequest(e.target.value)}
                rows={4}
                placeholder="e.g., I'd prefer to be in the new chapter only, or I'd like to be in both chapters..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange mb-4"
              />

              <div className="flex gap-4">
                <button
                  onClick={handleRequestChange}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Change Request'}
                </button>
                <button
                  onClick={() => setShowChangeRequest(false)}
                  disabled={submitting}
                  className="px-6 py-3 bg-gray-200 text-earth-brown font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
