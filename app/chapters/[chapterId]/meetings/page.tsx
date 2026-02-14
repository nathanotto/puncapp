import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChapterMeetingsClient } from './ChapterMeetingsClient'

export default async function ChapterMeetingsPage({
  params,
}: {
  params: Promise<{ chapterId: string }>
}) {
  const { chapterId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get chapter info and default location
  const { data: chapter } = await supabase
    .from('chapters')
    .select('name, meeting_location')
    .eq('id', chapterId)
    .single()

  // Check if user is leader or backup leader
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  const isLeader = membership && ['leader', 'backup_leader'].includes(membership.role)

  // Get all meetings for this chapter
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, scheduled_date, scheduled_time, status, completed_at, topic, meeting_type')
    .eq('chapter_id', chapterId)
    .order('scheduled_date', { ascending: false })
    .order('scheduled_time', { ascending: false })

  return (
    <ChapterMeetingsClient
      chapterId={chapterId}
      chapterName={chapter?.name || 'Chapter'}
      defaultLocation={chapter?.meeting_location || ''}
      isLeader={isLeader || false}
      meetings={meetings || []}
    />
  )
}
