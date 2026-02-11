import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function ChapterLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ chapterId: string }>
}) {
  const { chapterId } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('name, username, is_punc_admin, is_leader_certified')
    .eq('id', user.id)
    .single()

  // Get chapter info
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name')
    .eq('id', chapterId)
    .single()

  // Verify user is a member
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    redirect('/dashboard')
  }

  const userName = userData?.name || userData?.username || 'Member'
  const isAdmin = userData?.is_punc_admin || false
  const isLeaderCertified = userData?.is_leader_certified || false

  return (
    <div className="flex min-h-screen bg-warm-cream">
      <Sidebar
        userName={userName}
        chapterId={chapter?.id}
        chapterName={chapter?.name}
        isAdmin={isAdmin}
        isLeaderCertified={isLeaderCertified}
      />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
