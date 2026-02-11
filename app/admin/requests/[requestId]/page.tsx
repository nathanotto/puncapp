import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminRequestReviewClient } from '@/components/admin/AdminRequestReviewClient';

export default async function AdminRequestReviewPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const supabase = await createClient();

  // Get current user (admin access already checked by layout)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Get request details
  const { data: request } = await supabase
    .from('chapter_lifecycle_requests')
    .select(`
      *,
      chapters (id, name, status),
      submitter:users!chapter_lifecycle_requests_submitted_by_fkey (id, name, email, is_leader_certified),
      reviewer:users!chapter_lifecycle_requests_reviewed_by_fkey (id, name)
    `)
    .eq('id', requestId)
    .single();

  if (!request) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Request Not Found</h1>
        </div>
      </div>
    );
  }

  const chapter = normalizeJoin(request.chapters);
  const submitter = normalizeJoin(request.submitter);
  const reviewer = normalizeJoin(request.reviewer);

  // Get opt-ins for this request
  const { data: optIns } = await supabase
    .from('member_opt_ins')
    .select(`
      *,
      users!member_opt_ins_user_id_fkey (id, name, email, address, phone)
    `)
    .eq('request_id', requestId)
    .order('created_at');

  const optInsWithUsers = optIns?.map(optIn => ({
    ...optIn,
    user: normalizeJoin(optIn.users),
  })) || [];

  // Get conversation messages
  const { data: messages } = await supabase
    .from('lifecycle_request_messages')
    .select(`
      *,
      sender:users!lifecycle_request_messages_sender_id_fkey (id, name)
    `)
    .eq('request_id', requestId)
    .order('created_at');

  const messagesWithSenders = messages?.map(msg => ({
    ...msg,
    sender: normalizeJoin(msg.sender),
  })) || [];

  // Get founding members details for formation requests
  let foundingMembers: any[] = [];
  if (request.request_type === 'formation' && request.request_data.founding_member_ids) {
    const { data: members } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', request.request_data.founding_member_ids);
    foundingMembers = members || [];
  }

  // Get member details for split requests
  let splitMembers: any = {};
  if (request.request_type === 'split') {
    const allMemberIds = [
      ...(request.request_data.original_chapter_member_ids || []),
      ...(request.request_data.new_chapter_member_ids || []),
      ...(request.request_data.dual_membership_member_ids || []),
      ...(request.request_data.new_member_ids || []),
    ];

    if (allMemberIds.length > 0) {
      const { data: members } = await supabase
        .from('users')
        .select('id, name, email, is_leader_certified')
        .in('id', allMemberIds);

      splitMembers = Object.fromEntries((members || []).map(m => [m.id, m]));
    }
  }

  // Get current chapter member count for split validation
  let currentChapterMemberCount = 0;
  if (request.request_type === 'split' && request.chapter_id) {
    const { count } = await supabase
      .from('chapter_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', request.chapter_id)
      .eq('is_active', true);
    currentChapterMemberCount = count || 0;
  }

  // Get member details for dissolution requests
  let dissolutionMembers: any[] = [];
  if (request.request_type === 'dissolution' && request.chapter_id) {
    const { data: memberships } = await supabase
      .from('chapter_memberships')
      .select(`
        user_id,
        users!inner (id, name, email)
      `)
      .eq('chapter_id', request.chapter_id)
      .eq('is_active', true);

    dissolutionMembers = memberships?.map(m => normalizeJoin(m.users)).filter(Boolean) || [];
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/requests"
            className="text-burnt-orange hover:underline text-sm mb-2 inline-block"
          >
            ← Back to Request Queue
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-earth-brown">
              {request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1)} Request
            </h1>
            <span className={`px-3 py-1 rounded text-sm font-medium ${
              request.status === 'draft' ? 'bg-gray-100 text-gray-700' :
              request.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
              request.status === 'in_review' ? 'bg-yellow-100 text-yellow-700' :
              request.status === 'approved' ? 'bg-green-100 text-green-700' :
              request.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {request.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </span>
          </div>
        </div>

        <AdminRequestReviewClient
          request={request}
          chapterName={chapter?.name}
          submitter={submitter}
          reviewer={reviewer}
          optIns={optInsWithUsers}
          messages={messagesWithSenders}
          foundingMembers={foundingMembers}
          splitMembers={splitMembers}
          dissolutionMembers={dissolutionMembers}
          currentChapterMemberCount={currentChapterMemberCount}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
