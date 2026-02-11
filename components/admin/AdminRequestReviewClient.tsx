'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AdminRequestReviewClientProps {
  request: any;
  chapterName?: string;
  submitter: any;
  reviewer: any;
  optIns: any[];
  messages: any[];
  foundingMembers: any[];
  splitMembers: Record<string, any>;
  dissolutionMembers: any[];
  currentChapterMemberCount: number;
  currentUserId: string;
}

export function AdminRequestReviewClient({
  request,
  chapterName,
  submitter,
  reviewer,
  optIns,
  messages,
  foundingMembers,
  splitMembers,
  dissolutionMembers,
  currentChapterMemberCount,
  currentUserId,
}: AdminRequestReviewClientProps) {
  const router = useRouter();
  const [newMessage, setNewMessage] = useState('');
  const [adminNotes, setAdminNotes] = useState(request.review_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`/api/admin/requests/${request.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      });

      if (response.ok) {
        setNewMessage('');
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleMarkInReview = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_review', review_notes: adminNotes }),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to mark in review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this request? This will execute the changes immediately.')) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/requests/${request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_notes: adminNotes }),
      });

      if (response.ok) {
        router.push('/admin/requests');
      } else {
        const data = await response.json();
        alert(`Failed to approve: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert('Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!adminNotes.trim()) {
      alert('Please provide notes explaining why this request is being rejected.');
      return;
    }

    if (!confirm('Reject this request?')) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/requests/${request.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_notes: adminNotes }),
      });

      if (response.ok) {
        router.push('/admin/requests');
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate validation checks
  const confirmedOptIns = optIns.filter(o => o.status === 'confirmed');
  const declinedOptIns = optIns.filter(o => o.status === 'declined');
  const pendingOptIns = optIns.filter(o => o.status === 'pending');

  const validationChecks = getValidationChecks(
    request,
    submitter,
    optIns,
    confirmedOptIns,
    declinedOptIns,
    foundingMembers,
    splitMembers,
    currentChapterMemberCount
  );

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Main Content - 2/3 */}
      <div className="col-span-2 space-y-6">
        {/* Request Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-earth-brown">Request Details</h2>
          </div>
          <div className="p-6">
            {request.request_type === 'formation' && (
              <FormationRequestSummary
                data={request.request_data}
                submitter={submitter}
                foundingMembers={foundingMembers}
              />
            )}
            {request.request_type === 'split' && (
              <SplitRequestSummary
                data={request.request_data}
                chapterName={chapterName}
                chapterId={request.chapter_id}
                splitMembers={splitMembers}
              />
            )}
            {request.request_type === 'dissolution' && (
              <DissolutionRequestSummary
                data={request.request_data}
                chapterName={chapterName}
                chapterId={request.chapter_id}
                dissolutionMembers={dissolutionMembers}
              />
            )}
          </div>
        </div>

        {/* Opt-In Status Card */}
        {optIns.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-earth-brown">
                Opt-In Status
                <span className="ml-3 text-sm font-normal text-stone-gray">
                  {confirmedOptIns.length}/{optIns.length} confirmed
                </span>
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {optIns.map(optIn => (
                  <div key={optIn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <Link
                        href={`/admin/members/${optIn.user_id}`}
                        className="font-medium text-burnt-orange hover:underline"
                      >
                        {optIn.user?.name}
                      </Link>
                      <span className="text-sm text-stone-gray ml-2">
                        ({optIn.opt_in_type.replace(/_/g, ' ')})
                      </span>
                      {optIn.proposed_assignment && (
                        <span className="text-sm text-stone-gray ml-2">
                          → {optIn.proposed_assignment}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {optIn.responded_at && (
                        <span className="text-xs text-stone-gray">
                          {new Date(optIn.responded_at).toLocaleDateString()}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        optIn.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        optIn.status === 'declined' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {optIn.status.charAt(0).toUpperCase() + optIn.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversation Thread Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-earth-brown">Conversation</h2>
          </div>
          <div className="p-6">
            {messages.length === 0 ? (
              <p className="text-stone-gray text-sm mb-4">No messages yet</p>
            ) : (
              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {messages.map(msg => (
                  <div key={msg.id} className="border-l-2 border-gray-200 pl-4">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-earth-brown">{msg.sender?.name}</span>
                      <span className="text-xs text-stone-gray">
                        {new Date(msg.created_at).toLocaleDateString()} at{' '}
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-stone-gray whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Add a message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={3}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="mt-2 px-4 py-2 bg-burnt-orange text-white rounded-lg hover:bg-deep-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - 1/3 */}
      <div className="space-y-6">
        {/* Validation Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-bold text-earth-brown">Validation</h2>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {validationChecks.map((check, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className={`text-lg ${check.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {check.passed ? '✓' : '✗'}
                  </span>
                  <span className={`text-sm ${check.passed ? 'text-stone-gray' : 'text-red-600'}`}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-earth-brown mb-3">Status</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-stone-gray">Submitted:</span>
              <span className="ml-2 text-earth-brown">
                {request.submitted_at
                  ? new Date(request.submitted_at).toLocaleDateString()
                  : 'Not submitted'}
              </span>
            </div>
            {reviewer && (
              <div>
                <span className="text-stone-gray">Reviewer:</span>
                <span className="ml-2 text-earth-brown">{reviewer.name}</span>
              </div>
            )}
            {request.reviewed_at && (
              <div>
                <span className="text-stone-gray">Reviewed:</span>
                <span className="ml-2 text-earth-brown">
                  {new Date(request.reviewed_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions Card */}
        {(request.status === 'submitted' || request.status === 'in_review') && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-earth-brown">Actions</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-earth-brown mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {isSubmitting ? 'Processing...' : 'Approve Request'}
                </button>

                <button
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {isSubmitting ? 'Processing...' : 'Reject Request'}
                </button>

                {request.status === 'submitted' && (
                  <button
                    onClick={handleMarkInReview}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    {isSubmitting ? 'Processing...' : 'Mark In Review'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {request.status === 'approved' && (
          <div className="bg-green-50 rounded-lg border-2 border-green-300 p-6">
            <p className="text-green-800 font-medium">
              Request approved on {new Date(request.reviewed_at).toLocaleDateString()}
            </p>
            {request.review_notes && (
              <p className="text-sm text-green-700 mt-2">{request.review_notes}</p>
            )}
          </div>
        )}

        {request.status === 'rejected' && (
          <div className="bg-red-50 rounded-lg border-2 border-red-300 p-6">
            <p className="text-red-800 font-medium mb-2">
              Request rejected on {new Date(request.reviewed_at).toLocaleDateString()}
            </p>
            {request.review_notes && (
              <p className="text-sm text-red-700">{request.review_notes}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper components for request type summaries
function FormationRequestSummary({ data, submitter, foundingMembers }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-earth-brown mb-2">Proposed Chapter</h3>
        <div className="space-y-1 text-sm">
          <div><span className="text-stone-gray">Name:</span> <span className="ml-2">{data.proposed_name}</span></div>
          <div><span className="text-stone-gray">Location:</span> <span className="ml-2">{data.proposed_location}</span></div>
          <div>
            <span className="text-stone-gray">Schedule:</span>
            <span className="ml-2">
              {data.meeting_frequency} on {data.meeting_day}s at {data.meeting_time}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-earth-brown mb-2">Proposed Leader</h3>
        <Link href={`/admin/members/${submitter.id}`} className="text-burnt-orange hover:underline">
          {submitter.name}
        </Link>
        {submitter.is_leader_certified && (
          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Certified</span>
        )}
      </div>

      <div>
        <h3 className="font-bold text-earth-brown mb-2">Leader Statement</h3>
        <p className="text-sm text-stone-gray whitespace-pre-wrap">{data.leader_statement}</p>
      </div>

      <div>
        <h3 className="font-bold text-earth-brown mb-2">
          Founding Members ({foundingMembers.length} + leader = {foundingMembers.length + 1} total)
        </h3>
        <ul className="space-y-1">
          {foundingMembers.map((member: any) => (
            <li key={member.id}>
              <Link href={`/admin/members/${member.id}`} className="text-burnt-orange hover:underline text-sm">
                {member.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SplitRequestSummary({ data, chapterName, chapterId, splitMembers }: any) {
  const originalMembers = data.original_chapter_member_ids || [];
  const newMembers = data.new_chapter_member_ids || [];
  const dualMembers = data.dual_membership_member_ids || [];
  const newMemberIds = data.new_member_ids || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-earth-brown mb-2">Original Chapter</h3>
        <Link href={`/admin/chapters/${chapterId}`} className="text-burnt-orange hover:underline">
          {chapterName}
        </Link>
      </div>

      <div>
        <h3 className="font-bold text-earth-brown mb-2">Reason for Split</h3>
        <p className="text-sm text-stone-gray whitespace-pre-wrap">{data.reason}</p>
      </div>

      <div>
        <h3 className="font-bold text-earth-brown mb-2">New Chapter</h3>
        <div className="space-y-1 text-sm">
          <div><span className="text-stone-gray">Name:</span> <span className="ml-2">{data.new_chapter_name}</span></div>
          <div><span className="text-stone-gray">Location:</span> <span className="ml-2">{data.new_chapter_location}</span></div>
          {data.new_chapter_meeting_day && (
            <div>
              <span className="text-stone-gray">Schedule:</span>
              <span className="ml-2">
                {data.new_chapter_meeting_day}s at {data.new_chapter_meeting_time}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-bold text-earth-brown mb-2">
            Original Chapter ({originalMembers.length + dualMembers.length})
          </h3>
          <ul className="space-y-1 text-sm">
            {originalMembers.map((id: string) => (
              <li key={id}>
                <Link href={`/admin/members/${id}`} className="text-burnt-orange hover:underline">
                  {splitMembers[id]?.name || id}
                </Link>
              </li>
            ))}
            {dualMembers.map((id: string) => (
              <li key={id}>
                <Link href={`/admin/members/${id}`} className="text-burnt-orange hover:underline">
                  {splitMembers[id]?.name || id}
                </Link>
                <span className="ml-2 text-xs text-stone-gray">(both)</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-earth-brown mb-2">
            New Chapter ({newMembers.length + dualMembers.length})
          </h3>
          <ul className="space-y-1 text-sm">
            {newMembers.map((id: string) => (
              <li key={id}>
                <Link href={`/admin/members/${id}`} className="text-burnt-orange hover:underline">
                  {splitMembers[id]?.name || id}
                </Link>
              </li>
            ))}
            {dualMembers.map((id: string) => (
              <li key={id}>
                <Link href={`/admin/members/${id}`} className="text-burnt-orange hover:underline">
                  {splitMembers[id]?.name || id}
                </Link>
                <span className="ml-2 text-xs text-stone-gray">(both)</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {newMemberIds.length > 0 && (
        <div>
          <h3 className="font-bold text-earth-brown mb-2">New Members Joining ({newMemberIds.length})</h3>
          <ul className="space-y-1 text-sm">
            {newMemberIds.map((id: string) => (
              <li key={id}>
                <Link href={`/admin/members/${id}`} className="text-burnt-orange hover:underline">
                  {splitMembers[id]?.name || id}
                </Link>
                <span className="ml-2 text-xs text-stone-gray">
                  → {data.new_members_target[id] === 'original' ? 'Original' : 'New'} Chapter
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-bold text-earth-brown mb-2">New Chapter Leadership</h3>
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-stone-gray">Leader:</span>
            <Link
              href={`/admin/members/${data.new_chapter_leader_id}`}
              className="ml-2 text-burnt-orange hover:underline"
            >
              {splitMembers[data.new_chapter_leader_id]?.name || data.new_chapter_leader_id}
            </Link>
            {splitMembers[data.new_chapter_leader_id]?.is_leader_certified && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Certified</span>
            )}
          </div>
          {data.new_chapter_backup_leader_id && (
            <div>
              <span className="text-stone-gray">Backup:</span>
              <Link
                href={`/admin/members/${data.new_chapter_backup_leader_id}`}
                className="ml-2 text-burnt-orange hover:underline"
              >
                {splitMembers[data.new_chapter_backup_leader_id]?.name || data.new_chapter_backup_leader_id}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DissolutionRequestSummary({ data, chapterName, chapterId, dissolutionMembers }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-earth-brown mb-2">Chapter</h3>
        <Link href={`/admin/chapters/${chapterId}`} className="text-burnt-orange hover:underline">
          {chapterName}
        </Link>
      </div>

      <div>
        <h3 className="font-bold text-earth-brown mb-2">Reason</h3>
        <p className="text-sm text-stone-gray whitespace-pre-wrap">{data.reason}</p>
      </div>

      <div>
        <h3 className="font-bold text-earth-brown mb-2">Chapter Story</h3>
        <p className="text-sm text-stone-gray whitespace-pre-wrap">{data.what_happened}</p>
      </div>

      {data.member_notes && Object.keys(data.member_notes).length > 0 && (
        <div>
          <h3 className="font-bold text-earth-brown mb-2">Member Preferences</h3>
          <div className="space-y-2">
            {dissolutionMembers.map((member: any) => {
              const note = data.member_notes[member.id];
              if (!note) return null;
              return (
                <div key={member.id} className="text-sm">
                  <Link href={`/admin/members/${member.id}`} className="text-burnt-orange hover:underline font-medium">
                    {member.name}:
                  </Link>
                  <span className="text-stone-gray ml-2">{note}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getValidationChecks(
  request: any,
  submitter: any,
  optIns: any[],
  confirmedOptIns: any[],
  declinedOptIns: any[],
  foundingMembers: any[],
  splitMembers: Record<string, any>,
  currentChapterMemberCount: number
): Array<{ label: string; passed: boolean }> {
  const checks: Array<{ label: string; passed: boolean }> = [];

  if (request.request_type === 'formation') {
    checks.push({ label: 'Leader is certified', passed: submitter.is_leader_certified });
    const totalMembers = foundingMembers.length + 1; // +1 for leader
    checks.push({ label: '5-8 founding members (including leader)', passed: totalMembers >= 5 && totalMembers <= 8 });
    checks.push({ label: `All members confirmed (${confirmedOptIns.length}/${optIns.length})`, passed: confirmedOptIns.length === optIns.length });
    checks.push({ label: 'No declined members', passed: declinedOptIns.length === 0 });
  }

  if (request.request_type === 'split') {
    const data = request.request_data;
    const originalCount = (data.original_chapter_member_ids?.length || 0) + (data.dual_membership_member_ids?.length || 0);
    const newCount = (data.new_chapter_member_ids?.length || 0) + (data.dual_membership_member_ids?.length || 0);
    const newLeader = splitMembers[data.new_chapter_leader_id];

    checks.push({ label: `Original chapter has ≥9 members`, passed: currentChapterMemberCount >= 9 });
    checks.push({ label: `Original chapter will have ≥5 members (${originalCount})`, passed: originalCount >= 5 });
    checks.push({ label: `New chapter will have ≥5 members (${newCount})`, passed: newCount >= 5 });
    checks.push({ label: 'New chapter leader is certified', passed: newLeader?.is_leader_certified || false });
    checks.push({ label: `All members confirmed (${confirmedOptIns.length}/${optIns.length})`, passed: confirmedOptIns.length === optIns.length });
  }

  if (request.request_type === 'dissolution') {
    checks.push({ label: 'Submitted by leader or backup', passed: true }); // Already checked by access control
    checks.push({ label: 'Reason provided', passed: !!request.request_data.reason });
    checks.push({ label: 'Chapter story provided', passed: !!request.request_data.what_happened });
  }

  return checks;
}
