import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import RequestDetailClient from './RequestDetailClient';

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Get request details
  const { data: request } = await supabase
    .from('chapter_lifecycle_requests')
    .select(`
      *,
      chapters (id, name),
      submitter:users!chapter_lifecycle_requests_submitted_by_fkey (id, name, email),
      reviewer:users!chapter_lifecycle_requests_reviewed_by_fkey (id, name)
    `)
    .eq('id', requestId)
    .single();

  if (!request) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Request Not Found</h1>
        </div>
      </div>
    );
  }

  // Check if user is the submitter or admin
  const isSubmitter = request.submitted_by === user.id;

  const { data: userData } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  const isAdmin = userData?.is_punc_admin || false;

  if (!isSubmitter && !isAdmin) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Access Denied</h1>
          <p className="text-stone-gray">You don't have permission to view this request.</p>
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
      users!member_opt_ins_user_id_fkey (id, name, email)
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
        .select('id, name, email')
        .in('id', allMemberIds);

      splitMembers = Object.fromEntries((members || []).map(m => [m.id, m]));
    }
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
    <div className="min-h-screen bg-warm-cream py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <RequestDetailClient
          request={request}
          chapterName={chapter?.name}
          submitterName={submitter?.name}
          reviewerName={reviewer?.name}
          optIns={optInsWithUsers}
          messages={messagesWithSenders}
          foundingMembers={foundingMembers}
          splitMembers={splitMembers}
          dissolutionMembers={dissolutionMembers}
          isSubmitter={isSubmitter}
          isAdmin={isAdmin}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
