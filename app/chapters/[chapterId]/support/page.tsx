import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SupportChapterClient } from '@/components/funding/SupportChapterClient';

export default async function ChapterSupportPage({
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
    .select('id, name')
    .eq('id', chapterId)
    .single();

  if (!chapter) redirect('/');

  // Get user's membership
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role, is_contributing')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!membership) redirect('/');

  // Get current month funding data
  const { data: currentMonthData } = await supabase
    .from('chapter_funding_current_month')
    .select('*')
    .eq('chapter_id', chapterId)
    .single();

  // Get user's contribution history for this chapter
  const { data: userContributions } = await supabase
    .from('chapter_ledger')
    .select('amount, created_at, frequency, attribution')
    .eq('chapter_id', chapterId)
    .eq('donor_id', user.id)
    .eq('transaction_type', 'member_donation')
    .order('created_at', { ascending: false })
    .limit(10);

  const isLeader = membership.role === 'leader' || membership.role === 'backup_leader';

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-earth-brown mb-2">
            Support {chapter.name}
          </h1>
          <p className="text-stone-gray">
            Help cover our chapter's monthly costs and support the PUNC network
          </p>
        </div>

        <SupportChapterClient
          chapterId={chapterId}
          chapterName={chapter.name}
          userId={user.id}
          isLeader={isLeader}
          currentMonthData={currentMonthData}
          userContributions={userContributions || []}
        />
      </div>
    </div>
  );
}
