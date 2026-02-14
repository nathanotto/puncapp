import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeJoin } from '@/lib/supabase/utils'
import { ChapterMessagesClient } from './ChapterMessagesClient'

export default async function ChapterMessagesPage({
  params,
}: {
  params: Promise<{ chapterId: string }>
}) {
  const { chapterId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Verify user is a member of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role, is_active')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return (
      <div className="p-8 text-center text-red-600">
        You are not a member of this chapter.
      </div>
    )
  }

  const isLeader = membership.role === 'leader' || membership.role === 'backup_leader'

  // Get chapter info
  const { data: chapter } = await supabase
    .from('chapters')
    .select('name')
    .eq('id', chapterId)
    .single()

  // Get initial messages (top 20, newest first)
  const { data: messages } = await supabase
    .from('chapter_messages')
    .select(`
      id,
      message_text,
      created_at,
      updated_at,
      edited,
      user_id,
      users!chapter_messages_user_id_fkey(id, name, username)
    `)
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Normalize the joined users field
  const normalizedMessages = (messages || []).map(msg => ({
    ...msg,
    users: normalizeJoin(msg.users)
  }))

  return (
    <ChapterMessagesClient
      chapterId={chapterId}
      chapterName={chapter?.name || 'Chapter'}
      currentUserId={user.id}
      isLeader={isLeader}
      initialMessages={normalizedMessages}
    />
  )
}
