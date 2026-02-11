import { createClient } from '@/lib/supabase/server'
import { normalizeJoin } from '@/lib/supabase/utils'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function MeetingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get user's name, admin status, and leader certification
  const { data: userData } = await supabase
    .from('users')
    .select('name, username, is_punc_admin, is_leader_certified')
    .eq('id', user.id)
    .single()

  // Get user's chapter memberships with roles and chapter info
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select(`
      chapter_id,
      role,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)

  const userName = userData?.name || userData?.username || 'Member'
  const isAdmin = userData?.is_punc_admin || false
  const isLeaderCertified = userData?.is_leader_certified || false
  const firstMembership = memberships && memberships.length > 0 ? memberships[0] : null
  const firstChapter = firstMembership ? normalizeJoin(firstMembership.chapters) : null

  return (
    <div className="flex min-h-screen bg-warm-cream">
      <Sidebar
        userName={userName}
        chapterId={firstChapter?.id}
        chapterName={firstChapter?.name}
        isAdmin={isAdmin}
        isLeaderCertified={isLeaderCertified}
      />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
