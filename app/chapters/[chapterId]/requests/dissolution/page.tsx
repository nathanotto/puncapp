import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import DissolutionRequestForm from './DissolutionRequestForm';

export default async function DissolutionRequestPage({
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
    .select('id, name, status')
    .eq('id', chapterId)
    .single();

  if (!chapter) {
    redirect('/');
  }

  // Check if user is the chapter leader or backup leader
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!membership || (membership.role !== 'leader' && membership.role !== 'backup_leader')) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">
            Access Denied
          </h1>
          <p className="text-stone-gray">
            Only the chapter leader or backup leader can request dissolution.
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
        email
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
    };
  }) || [];

  return (
    <div className="min-h-screen bg-warm-cream py-8 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                This will request the closure of the chapter. Member history will be preserved.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-earth-brown mb-2">
            Request Chapter Dissolution
          </h1>
          <p className="text-stone-gray">{chapter.name}</p>
        </div>

        <DissolutionRequestForm
          chapterId={chapterId}
          chapterName={chapter.name}
          currentMembers={currentMembers}
        />
      </div>
    </div>
  );
}
