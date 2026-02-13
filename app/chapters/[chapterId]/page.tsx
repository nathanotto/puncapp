import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FundingCard } from '@/components/chapter/FundingCard';

export default async function ChapterOverviewPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Get chapter info
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, status, meeting_location')
    .eq('id', chapterId)
    .single();

  if (!chapter) {
    redirect('/');
  }

  // Get current user's membership
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role, is_contributing')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!membership) {
    redirect('/');
  }

  const isLeader = membership.role === 'leader' || membership.role === 'backup_leader';
  const canSeeFunding = isLeader || membership.is_contributing;

  // Get funding data if user can see it
  let fundingData = null;
  if (canSeeFunding) {
    // Get current month funding
    const { data: currentMonthData } = await supabase
      .from('chapter_funding_current_month')
      .select('*')
      .eq('chapter_id', chapterId)
      .single();

    // Get lifetime funding
    const { data: lifetimeData } = await supabase
      .from('chapter_funding')
      .select('*')
      .eq('chapter_id', chapterId)
      .single();

    // Get breakdown of current month contributions
    const currentMonth = new Date();
    const periodMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const { data: memberDonations } = await supabase
      .from('chapter_ledger')
      .select('amount')
      .eq('chapter_id', chapterId)
      .eq('period_month', periodMonth)
      .eq('transaction_type', 'member_donation');

    const { data: outsideDonations } = await supabase
      .from('chapter_ledger')
      .select('amount')
      .eq('chapter_id', chapterId)
      .eq('period_month', periodMonth)
      .in('transaction_type', ['outside_donation', 'cross_chapter_donation']);

    const memberContributions = memberDonations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
    const outsideContributions = outsideDonations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

    if (currentMonthData && lifetimeData) {
      fundingData = {
        currentMonth: currentMonthData,
        lifetime: lifetimeData,
        memberContributions,
        outsideContributions,
      };
    }
  }

  // Get member count
  const { count: memberCount } = await supabase
    .from('chapter_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('chapter_id', chapterId)
    .eq('is_active', true);

  // Get next upcoming meeting
  const today = new Date().toISOString().split('T')[0];
  const { data: nextMeeting } = await supabase
    .from('meetings')
    .select('id, scheduled_date, scheduled_time, location, status')
    .eq('chapter_id', chapterId)
    .eq('status', 'scheduled')
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })
    .limit(1)
    .single();

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-earth-brown mb-2">{chapter.name}</h1>
          <p className="text-stone-gray">{chapter.meeting_location}</p>
        </div>

        {/* Next Meeting Card */}
        {nextMeeting && (
          <div className="bg-burnt-orange/10 border-2 border-burnt-orange rounded-lg p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📅</span>
                  <h2 className="text-xl font-bold text-earth-brown">Next Meeting</h2>
                </div>
                <div className="space-y-1">
                  <p className="text-earth-brown font-semibold">
                    {new Date(nextMeeting.scheduled_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-stone-gray">
                    {new Date(`2000-01-01T${nextMeeting.scheduled_time}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })} • {nextMeeting.location}
                  </p>
                </div>
              </div>
              <Link
                href={`/meetings/${nextMeeting.id}`}
                className="px-6 py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal transition-colors"
              >
                View Details →
              </Link>
            </div>
          </div>
        )}

        {/* No Upcoming Meeting Notice (for Leaders) */}
        {!nextMeeting && isLeader && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">No Upcoming Meeting Scheduled</h3>
                <p className="text-sm text-yellow-800">
                  Meetings are automatically scheduled based on your chapter's recurring pattern.
                  The next meeting should appear here soon. If you don't see one within 24 hours,
                  contact support.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chapter Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold text-earth-brown mb-4">Chapter Overview</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-stone-gray">Status:</span>
                  <span className={`ml-2 px-3 py-1 rounded text-sm font-medium ${
                    chapter.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : chapter.status === 'forming'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {chapter.status.charAt(0).toUpperCase() + chapter.status.slice(1)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-stone-gray">Members:</span>
                  <span className="ml-2 text-earth-brown font-semibold">{memberCount}</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-earth-brown mb-4">Quick Links</h2>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href={`/chapters/${chapterId}/meetings`}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-burnt-orange transition-colors"
                >
                  <div className="text-2xl mb-2">📅</div>
                  <div className="font-semibold text-earth-brown">Meetings</div>
                </Link>
                <Link
                  href={`/chapters/${chapterId}/men`}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-burnt-orange transition-colors"
                >
                  <div className="text-2xl mb-2">👥</div>
                  <div className="font-semibold text-earth-brown">Members</div>
                </Link>
                <Link
                  href={`/chapters/${chapterId}/curriculum`}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-burnt-orange transition-colors"
                >
                  <div className="text-2xl mb-2">📚</div>
                  <div className="font-semibold text-earth-brown">Curriculum</div>
                </Link>
                <Link
                  href={`/chapters/${chapterId}/commitments`}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-burnt-orange transition-colors"
                >
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="font-semibold text-earth-brown">Commitments</div>
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Funding Card */}
            {canSeeFunding && fundingData && (
              <FundingCard
                chapterId={chapterId}
                chapterName={chapter.name}
                currentMonth={fundingData.currentMonth}
                lifetime={fundingData.lifetime}
                memberContributions={fundingData.memberContributions}
                outsideContributions={fundingData.outsideContributions}
              />
            )}

            {/* Message for non-contributing members */}
            {!canSeeFunding && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-2">Chapter Funding</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Become a contributing member to see chapter funding details and support the chapter.
                </p>
                <p className="text-xs text-blue-700">
                  Ask your chapter leader about becoming a contributing member.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
