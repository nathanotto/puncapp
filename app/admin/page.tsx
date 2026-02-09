import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Active chapters
  const { count: totalChapters } = await supabase
    .from('chapters')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  // Total members
  const { count: totalMembers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Unassigned (not in any active membership)
  const { data: assignedUserIds } = await supabase
    .from('chapter_memberships')
    .select('user_id')
    .eq('is_active', true);
  const assignedSet = new Set(assignedUserIds?.map(m => m.user_id));
  const { data: allUsers } = await supabase.from('users').select('id');
  const unassignedCount = allUsers?.filter(u => !assignedSet.has(u.id)).length || 0;

  // Meetings this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const { count: meetingsThisMonth } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })
    .gte('scheduled_date', startOfMonth.toISOString().split('T')[0])
    .eq('status', 'completed');

  // Flagged chapters
  const { data: flaggedChapters } = await supabase
    .from('chapters')
    .select('id, name, attention_reason')
    .eq('needs_attention', true)
    .limit(5);

  const flaggedCount = flaggedChapters?.length || 0;

  // Expiring certifications (within 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: expiringCertifications } = await supabase
    .from('users')
    .select('id, name, username, leader_certification_expires_at')
    .eq('is_leader_certified', true)
    .not('leader_certification_expires_at', 'is', null)
    .lte('leader_certification_expires_at', thirtyDaysFromNow.toISOString());

  // Recent unresolved issues
  const { data: unresolvedIssues } = await supabase
    .from('leadership_log')
    .select(`
      id,
      log_type,
      description,
      created_at,
      chapter_id,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-earth-brown mb-8">Admin Dashboard</h1>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {/* Active Chapters */}
          <Link href="/admin/chapters" className="bg-white rounded-lg p-6 border border-gray-200 hover:border-sage-green transition-colors">
            <div className="text-sm text-stone-gray mb-2">Active Chapters</div>
            <div className="text-3xl font-bold text-earth-brown">{totalChapters || 0}</div>
          </Link>

          {/* Total Members */}
          <Link href="/admin/members" className="bg-white rounded-lg p-6 border border-gray-200 hover:border-sage-green transition-colors">
            <div className="text-sm text-stone-gray mb-2">Total Members</div>
            <div className="text-3xl font-bold text-earth-brown">{totalMembers || 0}</div>
          </Link>

          {/* Unassigned */}
          <Link
            href="/admin/members?filter=unassigned"
            className={`bg-white rounded-lg p-6 border-2 transition-colors ${
              unassignedCount > 0 ? 'border-orange-400 hover:border-orange-500' : 'border-gray-200 hover:border-sage-green'
            }`}
          >
            <div className="text-sm text-stone-gray mb-2">Unassigned</div>
            <div className={`text-3xl font-bold ${unassignedCount > 0 ? 'text-orange-600' : 'text-earth-brown'}`}>
              {unassignedCount}
            </div>
          </Link>

          {/* Meetings This Month */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-sm text-stone-gray mb-2">Meetings This Month</div>
            <div className="text-3xl font-bold text-earth-brown">{meetingsThisMonth || 0}</div>
          </div>
        </div>

        {/* Action Cards Row */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Chapter Flags Card */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-earth-brown">Chapter Flags</h2>
              {flaggedCount > 0 && (
                <span className="bg-red-100 text-red-800 text-sm font-semibold px-3 py-1 rounded-full">
                  {flaggedCount}
                </span>
              )}
            </div>

            {flaggedCount === 0 ? (
              <p className="text-stone-gray text-sm">No chapters flagged</p>
            ) : (
              <>
                <ul className="space-y-2 mb-4">
                  {flaggedChapters?.map((chapter) => (
                    <li key={chapter.id} className="text-sm">
                      <Link href={`/admin/chapters/${chapter.id}`} className="text-burnt-orange hover:underline font-medium">
                        {chapter.name}
                      </Link>
                      {chapter.attention_reason && (
                        <p className="text-stone-gray ml-4">{chapter.attention_reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
                <Link href="/admin/flags" className="text-sm text-burnt-orange hover:underline">
                  View All Flags →
                </Link>
              </>
            )}
          </div>

          {/* Expiring Certifications Card */}
          {expiringCertifications && expiringCertifications.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-6 border-2 border-yellow-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-yellow-900">Expiring Certifications</h2>
                <span className="bg-yellow-200 text-yellow-900 text-sm font-semibold px-3 py-1 rounded-full">
                  {expiringCertifications.length}
                </span>
              </div>

              <ul className="space-y-2">
                {expiringCertifications.map((user) => (
                  <li key={user.id} className="text-sm">
                    <Link href={`/admin/members/${user.id}`} className="text-yellow-900 hover:underline font-medium">
                      {user.username || user.name}
                    </Link>
                    <span className="text-yellow-700 ml-2">
                      expires {new Date(user.leader_certification_expires_at!).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recent Unresolved Issues Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-earth-brown">Recent Unresolved Issues</h2>
          </div>

          {!unresolvedIssues || unresolvedIssues.length === 0 ? (
            <div className="px-6 py-8 text-center text-stone-gray">
              No unresolved issues
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">Chapter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {unresolvedIssues.map((issue) => {
                  const badgeColors = {
                    meeting_started_late: 'bg-yellow-100 text-yellow-800',
                    member_checked_in_late: 'bg-orange-100 text-orange-800',
                    member_not_contacted: 'bg-red-100 text-red-800',
                  };
                  const badgeColor = badgeColors[issue.log_type as keyof typeof badgeColors] || 'bg-gray-100 text-gray-800';
                  const chapter = normalizeJoin(issue.chapters);

                  return (
                    <tr key={issue.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${badgeColor}`}>
                          {issue.log_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/admin/chapters/${issue.chapter_id}`} className="text-burnt-orange hover:underline">
                          {chapter?.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-stone-gray">{issue.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-gray">
                        {new Date(issue.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
