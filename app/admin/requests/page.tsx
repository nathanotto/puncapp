import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = await createClient();

  // Admin access already checked by layout
  // Build query based on filter
  let query = supabase
    .from('chapter_lifecycle_requests')
    .select(`
      id,
      request_type,
      status,
      request_data,
      submitted_at,
      chapter_id,
      submitted_by,
      chapters (id, name),
      submitter:users!chapter_lifecycle_requests_submitted_by_fkey (id, name)
    `)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (filter === 'pending') {
    query = query.in('status', ['submitted', 'in_review']);
  } else if (filter === 'formation' || filter === 'split' || filter === 'dissolution') {
    query = query.eq('request_type', filter);
  }

  const { data: requests } = await query;

  // Get opt-in counts for each request
  const requestsWithOptIns = await Promise.all(
    (requests || []).map(async (request) => {
      const { data: optIns } = await supabase
        .from('member_opt_ins')
        .select('status')
        .eq('request_id', request.id);

      const chapter = normalizeJoin(request.chapters);
      const submitter = normalizeJoin(request.submitter);

      const total = optIns?.length || 0;
      const confirmed = optIns?.filter(o => o.status === 'confirmed').length || 0;
      const declined = optIns?.filter(o => o.status === 'declined').length || 0;

      return {
        ...request,
        chapterName: chapter?.name,
        submitterName: submitter?.name,
        optInProgress: total > 0 ? { confirmed, total, declined } : null,
      };
    })
  );

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'formation': return 'bg-purple-100 text-purple-700';
      case 'split': return 'bg-blue-100 text-blue-700';
      case 'dissolution': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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

  const activeFilter = filter || 'all';

  const filterCounts = {
    all: requests?.length || 0,
    pending: requests?.filter(r => r.status === 'submitted' || r.status === 'in_review').length || 0,
    formation: requests?.filter(r => r.request_type === 'formation').length || 0,
    split: requests?.filter(r => r.request_type === 'split').length || 0,
    dissolution: requests?.filter(r => r.request_type === 'dissolution').length || 0,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-earth-brown mb-2">
          Chapter Lifecycle Requests
        </h1>
        <p className="text-stone-gray">Review and manage formation, split, and dissolution requests</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <Link
              href="/admin/requests"
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeFilter === 'all'
                  ? 'border-burnt-orange text-burnt-orange'
                  : 'border-transparent text-stone-gray hover:text-earth-brown hover:border-gray-300'
              }`}
            >
              All ({filterCounts.all})
            </Link>
            <Link
              href="/admin/requests?filter=pending"
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeFilter === 'pending'
                  ? 'border-burnt-orange text-burnt-orange'
                  : 'border-transparent text-stone-gray hover:text-earth-brown hover:border-gray-300'
              }`}
            >
              Pending Review ({filterCounts.pending})
            </Link>
            <Link
              href="/admin/requests?filter=formation"
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeFilter === 'formation'
                  ? 'border-burnt-orange text-burnt-orange'
                  : 'border-transparent text-stone-gray hover:text-earth-brown hover:border-gray-300'
              }`}
            >
              Formation ({filterCounts.formation})
            </Link>
            <Link
              href="/admin/requests?filter=split"
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeFilter === 'split'
                  ? 'border-burnt-orange text-burnt-orange'
                  : 'border-transparent text-stone-gray hover:text-earth-brown hover:border-gray-300'
              }`}
            >
              Split ({filterCounts.split})
            </Link>
            <Link
              href="/admin/requests?filter=dissolution"
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeFilter === 'dissolution'
                  ? 'border-burnt-orange text-burnt-orange'
                  : 'border-transparent text-stone-gray hover:text-earth-brown hover:border-gray-300'
              }`}
            >
              Dissolution ({filterCounts.dissolution})
            </Link>
          </nav>
        </div>
      </div>

      {/* Request Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                Chapter/Proposed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                Submitted By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                Submitted
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                Opt-Ins
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-gray uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requestsWithOptIns.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-stone-gray">
                  No requests found
                </td>
              </tr>
            ) : (
              requestsWithOptIns.map((request) => (
                <tr key={request.id} className="hover:bg-warm-cream/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadgeClass(request.request_type)}`}>
                      {formatType(request.request_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-earth-brown">
                      {getRequestName(request)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-earth-brown">{request.submitterName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-stone-gray">
                      {request.submitted_at
                        ? new Date(request.submitted_at).toLocaleDateString()
                        : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.optInProgress ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          request.optInProgress.confirmed === request.optInProgress.total
                            ? 'text-green-600'
                            : 'text-burnt-orange'
                        }`}>
                          {request.optInProgress.confirmed}/{request.optInProgress.total}
                        </span>
                        {request.optInProgress.confirmed === request.optInProgress.total && (
                          <span className="text-green-600">✓</span>
                        )}
                        {request.optInProgress.declined > 0 && (
                          <span className="text-red-600" title={`${request.optInProgress.declined} declined`}>
                            ⚠
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-stone-gray">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(request.status)}`}>
                      {formatStatus(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link
                      href={`/admin/requests/${request.id}`}
                      className="text-burnt-orange hover:text-deep-charcoal font-medium"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
