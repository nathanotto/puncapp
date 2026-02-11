import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import OptInResponseForm from './OptInResponseForm';
import type { FormationRequestData, SplitRequestData } from '@/types/lifecycle-requests';

export default async function OptInPage({
  params,
}: {
  params: Promise<{ optInId: string }>;
}) {
  const { optInId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Get opt-in details
  const { data: optIn } = await supabase
    .from('member_opt_ins')
    .select(`
      id,
      request_id,
      user_id,
      opt_in_type,
      proposed_assignment,
      status,
      confirmed_address,
      confirmed_phone
    `)
    .eq('id', optInId)
    .single();

  if (!optIn) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Opt-In Not Found</h1>
          <p className="text-stone-gray">This opt-in request could not be found.</p>
        </div>
      </div>
    );
  }

  // Verify this opt-in is for the current user
  if (optIn.user_id !== user.id) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Access Denied</h1>
          <p className="text-stone-gray">This opt-in is for a different user.</p>
        </div>
      </div>
    );
  }

  // If already responded, show status
  if (optIn.status !== 'pending') {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">
            Already Responded
          </h1>
          <p className="text-stone-gray mb-4">
            You have already responded to this opt-in request.
          </p>
          <p className="text-stone-gray">
            Status: <span className="font-semibold">{optIn.status}</span>
          </p>
        </div>
      </div>
    );
  }

  // Get request details
  const { data: request } = await supabase
    .from('chapter_lifecycle_requests')
    .select(`
      id,
      request_type,
      request_data,
      chapter_id,
      submitted_by,
      chapters (id, name),
      users!chapter_lifecycle_requests_submitted_by_fkey (id, name)
    `)
    .eq('id', optIn.request_id)
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

  const chapter = normalizeJoin(request.chapters);
  const submitter = normalizeJoin(request.users);

  // Get user's current info
  const { data: userData } = await supabase
    .from('users')
    .select('name, email, address, phone')
    .eq('id', user.id)
    .single();

  // Get other founding members for formation requests
  let otherMembers: any[] = [];
  if (optIn.opt_in_type === 'formation') {
    const requestData = request.request_data as FormationRequestData;
    const { data: members } = await supabase
      .from('users')
      .select('id, name')
      .in('id', requestData.founding_member_ids)
      .neq('id', user.id);
    otherMembers = members || [];
  }

  return (
    <div className="min-h-screen bg-warm-cream py-8 px-6">
      <div className="max-w-4xl mx-auto">
        <OptInResponseForm
          optInId={optInId}
          optInType={optIn.opt_in_type}
          proposedAssignment={optIn.proposed_assignment}
          requestType={request.request_type}
          requestData={request.request_data}
          chapterName={chapter?.name}
          submitterName={submitter?.name}
          userAddress={userData?.address || ''}
          userPhone={userData?.phone || ''}
          otherMembers={otherMembers}
        />
      </div>
    </div>
  );
}
