import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { InviteContributingButton } from './InviteContributingButton';

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ chapterId: string; memberId: string }>;
}) {
  const { chapterId, memberId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Get chapter info
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name')
    .eq('id', chapterId)
    .single();

  if (!chapter) redirect('/chapters');

  // Get current user's membership
  const { data: currentUserMembership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!currentUserMembership) redirect('/');

  const isLeader = currentUserMembership.role === 'leader' || currentUserMembership.role === 'backup_leader';

  // Get member details
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select(`
      role,
      joined_at,
      is_contributing,
      became_contributing_at,
      users!inner (
        id,
        name,
        username,
        email
      )
    `)
    .eq('chapter_id', chapterId)
    .eq('user_id', memberId)
    .eq('is_active', true)
    .single();

  if (!membership) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-earth-brown mb-4">Member not found</h1>
        <Link href={`/chapters/${chapterId}/men`} className="text-burnt-orange hover:underline">
          ← Back to Members
        </Link>
      </div>
    );
  }

  const member = membership.users as any;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/chapters/${chapterId}/men`}
            className="text-burnt-orange hover:underline mb-4 inline-block"
          >
            ← Back to Members
          </Link>
          <h1 className="text-3xl font-bold text-earth-brown">
            {member.name}
          </h1>
          {member.username && member.username !== member.name && (
            <p className="text-stone-gray">@{member.username}</p>
          )}
        </div>

        {/* Member Info Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-earth-brown mb-4">Member Information</h2>

          <div className="space-y-3">
            <div>
              <span className="text-sm text-stone-gray">Role:</span>
              <span className={`ml-2 px-3 py-1 rounded text-sm font-medium ${
                membership.role === 'leader'
                  ? 'bg-orange-200 text-orange-900'
                  : membership.role === 'backup_leader'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-orange-50 text-orange-700'
              }`}>
                {membership.role === 'leader'
                  ? 'Leader'
                  : membership.role === 'backup_leader'
                  ? 'Backup Leader'
                  : 'Member'}
              </span>
            </div>

            <div>
              <span className="text-sm text-stone-gray">Email:</span>
              <span className="ml-2 text-earth-brown">{member.email}</span>
            </div>

            <div>
              <span className="text-sm text-stone-gray">Joined:</span>
              <span className="ml-2 text-earth-brown">
                {new Date(membership.joined_at).toLocaleDateString()}
              </span>
            </div>

            {/* Contributing Member Status */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-stone-gray block mb-1">Contributing Member:</span>
                  {membership.is_contributing ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded font-medium">
                      ✓ Contributing since {new Date(membership.became_contributing_at!).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-stone-gray">Not a contributing member</span>
                  )}
                </div>

                {/* Invite Button (Leader only) */}
                {isLeader && !membership.is_contributing && (
                  <InviteContributingButton
                    chapterId={chapterId}
                    memberId={memberId}
                    memberName={member.name}
                  />
                )}
              </div>

              {!membership.is_contributing && (
                <p className="text-xs text-stone-gray mt-2">
                  Contributing members can see chapter funding status and support the chapter financially.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
