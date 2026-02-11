import { createClient } from '@/lib/supabase/server'
import { normalizeJoin } from '@/lib/supabase/utils'
import { redirect } from 'next/navigation'

export default async function ChapterMenPage({
  params,
}: {
  params: Promise<{ chapterId: string }>
}) {
  const { chapterId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get chapter info
  const { data: chapter } = await supabase
    .from('chapters')
    .select('name')
    .eq('id', chapterId)
    .single()

  // Get all active members
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select(`
      role,
      users!inner (
        id,
        name,
        username
      )
    `)
    .eq('chapter_id', chapterId)
    .eq('is_active', true)
    .order('role', { ascending: true })

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-earth-brown mb-6">
        {chapter?.name} - Members
      </h1>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="space-y-4">
          {members?.map((member) => {
            const user = normalizeJoin(member.users);

            return (
            <a
              key={user?.id}
              href={`/chapters/${chapterId}/men/${user?.id}`}
              className="flex items-center justify-between p-4 bg-warm-cream/50 rounded-lg hover:bg-warm-cream transition-colors"
            >
              <div>
                <p className="font-semibold text-earth-brown">
                  {user?.username || user?.name}
                </p>
                {user?.username && user.username !== user.name && (
                  <p className="text-sm text-stone-gray">{user.name}</p>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  member.role === 'leader'
                    ? 'bg-orange-200 text-orange-900'
                    : member.role === 'backup_leader'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-orange-50 text-orange-700'
                }`}
              >
                {member.role === 'leader'
                  ? 'Leader'
                  : member.role === 'backup_leader'
                  ? 'Backup Leader'
                  : 'Member'}
              </span>
            </a>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-blue-800 font-medium">
          📌 More features coming soon
        </p>
        <p className="text-sm text-blue-600 mt-2">
          Member profiles, contact info, and more will be added in future updates.
        </p>
      </div>
    </div>
  )
}
