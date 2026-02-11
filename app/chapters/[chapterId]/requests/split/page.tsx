import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import SplitRequestForm from './SplitRequestForm';

export default async function SplitRequestPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Get chapter details
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, recurring_meeting_day, recurring_meeting_time, meeting_frequency')
    .eq('id', chapterId)
    .single();

  if (!chapter) {
    redirect('/');
  }

  // Check if user is the chapter leader
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!membership || membership.role !== 'leader') {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">
            Access Denied
          </h1>
          <p className="text-stone-gray">
            Only the chapter leader can request a split.
          </p>
        </div>
      </div>
    );
  }

  // Get all current chapter members
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select(`
      user_id,
      role,
      users!inner (
        id,
        name,
        email,
        is_leader_certified
      )
    `)
    .eq('chapter_id', chapterId)
    .eq('is_active', true);

  const currentMembers = memberships?.map(m => {
    const member = normalizeJoin(m.users);
    return {
      id: member?.id || '',
      name: member?.name || '',
      email: member?.email || '',
      role: m.role,
      is_leader_certified: member?.is_leader_certified || false,
    };
  }) || [];

  // Check if chapter has enough members (≥9)
  if (currentMembers.length < 9) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">
            Chapter Too Small
          </h1>
          <p className="text-stone-gray mb-4">
            Your chapter must have at least 9 members to request a split.
          </p>
          <p className="text-stone-gray">
            Current members: {currentMembers.length}
          </p>
        </div>
      </div>
    );
  }

  // Get all unassigned users (potential new members)
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, name, email, address');

  const { data: activeMemberships } = await supabase
    .from('chapter_memberships')
    .select('user_id')
    .eq('is_active', true);

  const activeMemberIds = new Set(activeMemberships?.map(m => m.user_id) || []);
  const availableNewMembers = allUsers?.filter(u => !activeMemberIds.has(u.id)) || [];

  return (
    <div className="min-h-screen bg-warm-cream py-8 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-earth-brown mb-2">
            Request Chapter Split
          </h1>
          <p className="text-stone-gray">
            {chapter.name} — {currentMembers.length} current members
          </p>
        </div>

        <SplitRequestForm
          chapterId={chapterId}
          chapterName={chapter.name}
          defaultMeetingDay={chapter.recurring_meeting_day}
          defaultMeetingTime={chapter.recurring_meeting_time}
          meetingFrequency={chapter.meeting_frequency}
          currentMembers={currentMembers}
          availableNewMembers={availableNewMembers}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
