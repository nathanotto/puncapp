import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function MyRequestsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Get user info to check if certified
  const { data: userData } = await supabase
    .from('users')
    .select('is_leader_certified')
    .eq('id', user.id)
    .single();

  // Get user's chapter memberships to check for split eligibility
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select(`
      chapter_id,
      role,
      chapters!inner (id, name)
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('role', 'leader');

  const leaderChapters = memberships?.map(m => {
    const chapter = normalizeJoin(m.chapters);
    return {
      id: chapter?.id || '',
      name: chapter?.name || '',
    };
  }) || [];

  // Check which chapters have ≥9 members for split eligibility
  const chaptersWithMemberCount = await Promise.all(
    leaderChapters.map(async (chapter) => {
      const { count } = await supabase
        .from('chapter_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', chapter.id)
        .eq('is_active', true);

      return {
        ...chapter,
        memberCount: count || 0,
        canSplit: (count || 0) >= 9,
      };
    })
  );

  // Get all requests submitted by this user
  const { data: requests } = await supabase
    .from('chapter_lifecycle_requests')
    .select(`
      id,
      request_type,
      status,
      request_data,
      chapter_id,
      submitted_at,
      created_at,
      chapters (id, name)
    `)
    .eq('submitted_by', user.id)
    .order('created_at', { ascending: false });

  // Get opt-in counts for each request
  const requestsWithOptIns = await Promise.all(
    (requests || []).map(async (request) => {
      const { data: optIns } = await supabase
        .from('member_opt_ins')
        .select('status')
        .eq('request_id', request.id);

      const chapter = normalizeJoin(request.chapters);
      const total = optIns?.length || 0;
      const confirmed = optIns?.filter(o => o.status === 'confirmed').length || 0;

      return {
        ...request,
        chapterName: chapter?.name,
        optInProgress: total > 0 ? `${confirmed}/${total}` : null,
        optInsComplete: total > 0 && confirmed === total,
      };
    })
  );

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

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'formation': return 'bg-purple-100 text-purple-700';
      case 'split': return 'bg-blue-100 text-blue-700';
      case 'dissolution': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getRequestName = (request: any) => {
    if (request.request_type === 'formation') {
      return request.request_data.proposed_name || 'New Chapter';
    } else {
      return request.chapterName || 'Unknown Chapter';
    }
  };

  return (
    <div className="min-h-screen bg-warm-cream py-8 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-earth-brown mb-2">My Requests</h1>
            <p className="text-stone-gray">Chapter lifecycle requests you've submitted</p>
          </div>

          <div className="flex gap-3">
            {userData?.is_leader_certified && (
              <Link
                href="/requests/formation"
                className="px-4 py-2 bg-purple-100 text-purple-900 font-medium rounded-lg hover:bg-purple-200 transition-colors"
              >
                + Formation Request
              </Link>
            )}
            {chaptersWithMemberCount.filter(c => c.canSplit).map(chapter => (
              <Link
                key={chapter.id}
                href={`/chapters/${chapter.id}/requests/split`}
                className="px-4 py-2 bg-blue-100 text-blue-900 font-medium rounded-lg hover:bg-blue-200 transition-colors"
              >
                + Split {chapter.name}
              </Link>
            ))}
          </div>
        </div>

        {requestsWithOptIns.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-stone-gray mb-4">You haven't submitted any requests yet.</p>
            {userData?.is_leader_certified && (
              <Link
                href="/requests/formation"
                className="inline-block px-6 py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors"
              >
                Create Formation Request
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {requestsWithOptIns.map(request => (
              <Link
                key={request.id}
                href={`/requests/${request.id}`}
                className="block bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getTypeBadgeClass(request.request_type)}`}>
                      {formatType(request.request_type)}
                    </span>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadgeClass(request.status)}`}>
                      {formatStatus(request.status)}
                    </span>
                  </div>
                  {request.optInProgress && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-gray">Opt-ins:</span>
                      <span className={`text-sm font-medium ${request.optInsComplete ? 'text-green-600' : 'text-burnt-orange'}`}>
                        {request.optInProgress}
                        {request.optInsComplete && ' ✓'}
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-semibold text-earth-brown mb-2">
                  {getRequestName(request)}
                </h3>

                <div className="flex gap-4 text-sm text-stone-gray">
                  {request.submitted_at ? (
                    <p>Submitted {new Date(request.submitted_at).toLocaleDateString()}</p>
                  ) : (
                    <p>Draft created {new Date(request.created_at).toLocaleDateString()}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
