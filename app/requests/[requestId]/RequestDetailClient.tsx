'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { LifecycleRequest, MemberOptIn, LifecycleRequestMessage, FormationRequestData, SplitRequestData, DissolutionRequestData } from '@/types/lifecycle-requests';

interface RequestDetailClientProps {
  request: LifecycleRequest & any;
  chapterName: string | undefined;
  submitterName: string | undefined;
  reviewerName: string | undefined;
  optIns: (MemberOptIn & { user?: any })[];
  messages: (LifecycleRequestMessage & { sender?: any })[];
  foundingMembers: any[];
  splitMembers: Record<string, any>;
  dissolutionMembers: any[];
  isSubmitter: boolean;
  isAdmin: boolean;
  currentUserId: string;
}

export default function RequestDetailClient({
  request,
  chapterName,
  submitterName,
  reviewerName,
  optIns,
  messages: initialMessages,
  foundingMembers,
  splitMembers,
  dissolutionMembers,
  isSubmitter,
  isAdmin,
  currentUserId,
}: RequestDetailClientProps) {
  const router = useRouter();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'submitted': return 'bg-blue-100 text-blue-700';
      case 'in_review': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'withdrawn': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getOptInStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'declined': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const optInSummary = {
    total: optIns.length,
    confirmed: optIns.filter(o => o.status === 'confirmed').length,
    declined: optIns.filter(o => o.status === 'declined').length,
    pending: optIns.filter(o => o.status === 'pending').length,
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/requests/${request.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const { message } = await response.json();
      setMessages([...messages, {
        ...message,
        sender: { id: currentUserId, name: isAdmin ? 'Admin' : submitterName },
      }]);
      setNewMessage('');
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this request?')) {
      return;
    }

    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'withdrawn' }),
      });

      if (!response.ok) {
        throw new Error('Failed to withdraw request');
      }

      router.refresh();
    } catch (err) {
      setError('Failed to withdraw request');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete request');
      }

      router.push('/requests');
    } catch (err) {
      setError('Failed to delete request');
    }
  };

  const formationData = request.request_type === 'formation' ? request.request_data as FormationRequestData : null;
  const splitData = request.request_type === 'split' ? request.request_data as SplitRequestData : null;
  const dissolutionData = request.request_type === 'dissolution' ? request.request_data as DissolutionRequestData : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/requests" className="text-burnt-orange hover:underline mb-2 inline-block">
            ← Back to My Requests
          </Link>
          <h1 className="text-3xl font-bold text-earth-brown mb-2">
            {request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1)} Request
          </h1>
          <p className="text-stone-gray">
            {request.request_type === 'formation'
              ? formationData?.proposed_name
              : chapterName}
          </p>
        </div>
        <span className={`px-4 py-2 rounded text-sm font-medium ${getStatusBadgeClass(request.status)}`}>
          {formatStatus(request.status)}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Request Details */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Request Details</h2>

            {/* Formation Details */}
            {formationData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-stone-gray">Proposed Name</p>
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

                <div>
                  <p className="text-sm font-semibold text-earth-brown mb-2">Leader Statement</p>
                  <p className="text-stone-gray whitespace-pre-wrap">{formationData.leader_statement}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-earth-brown mb-2">
                    Founding Members ({foundingMembers.length + 1} including leader)
                  </p>
                  <ul className="space-y-1">
                    <li className="text-earth-brown">{submitterName} (Leader)</li>
                    {foundingMembers.map(member => (
                      <li key={member.id} className="text-earth-brown">{member.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Split Details */}
            {splitData && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-stone-gray mb-1">Reason for Split</p>
                  <p className="text-earth-brown">{splitData.reason}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-stone-gray">New Chapter Name</p>
                    <p className="font-medium text-earth-brown">{splitData.new_chapter_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-gray">New Chapter Location</p>
                    <p className="font-medium text-earth-brown">{splitData.new_chapter_location}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-earth-brown mb-2">
                      Original Chapter ({splitData.original_chapter_member_ids?.length || 0})
                    </p>
                    <ul className="space-y-1 text-sm">
                      {splitData.original_chapter_member_ids?.map((id: string) => (
                        <li key={id} className="text-stone-gray">
                          {splitMembers[id]?.name || 'Unknown'}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-earth-brown mb-2">
                      New Chapter ({splitData.new_chapter_member_ids?.length || 0})
                    </p>
                    <ul className="space-y-1 text-sm">
                      {splitData.new_chapter_member_ids?.map((id: string) => (
                        <li key={id} className="text-stone-gray">
                          {splitMembers[id]?.name || 'Unknown'}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-earth-brown mb-2">
                      Both Chapters ({splitData.dual_membership_member_ids?.length || 0})
                    </p>
                    <ul className="space-y-1 text-sm">
                      {splitData.dual_membership_member_ids?.map((id: string) => (
                        <li key={id} className="text-stone-gray">
                          {splitMembers[id]?.name || 'Unknown'}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {splitData.new_member_ids && splitData.new_member_ids.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-earth-brown mb-2">
                      New Members ({splitData.new_member_ids.length})
                    </p>
                    <ul className="space-y-1 text-sm">
                      {splitData.new_member_ids.map((id: string) => (
                        <li key={id} className="text-stone-gray">
                          {splitMembers[id]?.name || 'Unknown'} → {splitData.new_members_target?.[id] || 'Unknown'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Dissolution Details */}
            {dissolutionData && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-stone-gray mb-1">Reason</p>
                  <p className="text-earth-brown">{dissolutionData.reason}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-earth-brown mb-2">Chapter Story</p>
                  <p className="text-stone-gray whitespace-pre-wrap">{dissolutionData.what_happened}</p>
                </div>

                {Object.keys(dissolutionData.member_notes || {}).length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-earth-brown mb-2">Member Preferences</p>
                    <div className="space-y-2">
                      {Object.entries(dissolutionData.member_notes).map(([userId, note]) => {
                        const member = dissolutionMembers.find(m => m.id === userId);
                        if (!note) return null;
                        return (
                          <div key={userId} className="text-sm">
                            <span className="font-medium text-earth-brown">{member?.name || 'Unknown'}:</span>
                            <span className="text-stone-gray ml-2">{note as string}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {request.status === 'draft' && isSubmitter && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Link
                  href={
                    request.request_type === 'formation'
                      ? `/requests/formation?edit=${request.id}`
                      : request.request_type === 'split'
                      ? `/chapters/${request.chapter_id}/requests/split?edit=${request.id}`
                      : `/chapters/${request.chapter_id}/requests/dissolution?edit=${request.id}`
                  }
                  className="text-burnt-orange hover:underline"
                >
                  Edit Draft →
                </Link>
              </div>
            )}
          </div>

          {/* Opt-In Status */}
          {optIns.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-earth-brown mb-4">
                Opt-In Status ({optInSummary.confirmed}/{optInSummary.total})
              </h2>

              <div className="space-y-2">
                {optIns.map(optIn => (
                  <div key={optIn.id} className="flex items-center justify-between p-3 bg-warm-cream/30 rounded-lg">
                    <div>
                      <p className="font-medium text-earth-brown">{optIn.user?.name}</p>
                      <p className="text-sm text-stone-gray">{optIn.user?.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${getOptInStatusBadge(optIn.status)}`}>
                        {optIn.status.charAt(0).toUpperCase() + optIn.status.slice(1)}
                      </span>
                      {optIn.responded_at && (
                        <span className="text-xs text-stone-gray">
                          {new Date(optIn.responded_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Thread */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Conversation</h2>

            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-stone-gray text-sm">No messages yet</p>
              ) : (
                messages.map(message => (
                  <div key={message.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-earth-brown text-sm">
                        {message.sender?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-stone-gray">
                        {new Date(message.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-stone-gray text-sm whitespace-pre-wrap">{message.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                className="px-6 py-2 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold text-earth-brown mb-4">Status</h3>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-stone-gray">Current Status</p>
                <p className="font-medium text-earth-brown">{formatStatus(request.status)}</p>
              </div>

              {request.submitted_at && (
                <div>
                  <p className="text-sm text-stone-gray">Submitted</p>
                  <p className="font-medium text-earth-brown">
                    {new Date(request.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              {request.status === 'rejected' && request.review_notes && (
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-1">Rejection Notes</p>
                  <p className="text-sm text-stone-gray">{request.review_notes}</p>
                </div>
              )}

              {request.status === 'approved' && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-green-800 text-sm font-medium">✓ Request Approved</p>
                  {request.reviewed_at && (
                    <p className="text-green-700 text-xs mt-1">
                      {new Date(request.reviewed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions Card */}
          {isSubmitter && (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-bold text-earth-brown mb-4">Actions</h3>

              <div className="space-y-3">
                {request.status === 'draft' && (
                  <>
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Delete Draft
                    </button>
                  </>
                )}

                {request.status === 'submitted' && (
                  <button
                    onClick={handleWithdraw}
                    className="w-full px-4 py-2 bg-gray-200 text-earth-brown font-medium rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Withdraw Request
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
