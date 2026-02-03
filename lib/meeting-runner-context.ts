import { createClient } from '@/lib/supabase/server'

export async function loadMeetingRunnerContext(meetingId: string, userId: string) {
  const supabase = await createClient()

  // Get meeting with chapter and scribe info
  const { data: meeting } = await supabase
    .from('meetings')
    .select(`
      *,
      chapter:chapters!inner(id, name),
      scribe:users!meetings_scribe_id_fkey(id, name, username)
    `)
    .eq('id', meetingId)
    .single()

  if (!meeting || meeting.status !== 'in_progress') {
    return { authorized: false, reason: 'Meeting is not in progress' }
  }

  // Check user is member of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return { authorized: false, reason: 'You are not a member of this chapter' }
  }

  // Get checked-in attendees
  const { data: attendees } = await supabase
    .from('attendance')
    .select(`
      *,
      user:users!attendance_user_id_fkey(id, name, username)
    `)
    .eq('meeting_id', meetingId)
    .not('checked_in_at', 'is', null)

  // Get time logs for this meeting
  const { data: timeLogs } = await supabase
    .from('meeting_time_log')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('start_time', { ascending: true })

  const isScribe = meeting.scribe_id === userId
  const isLeader = membership.role === 'leader' || membership.role === 'backup_leader'

  // Calculate meeting end time
  const meetingStart = new Date(meeting.actual_start_time)
  const meetingEnd = new Date(meetingStart.getTime() + meeting.duration_minutes * 60 * 1000)

  return {
    authorized: true,
    meeting,
    attendees: attendees || [],
    timeLogs: timeLogs || [],
    isScribe,
    isLeader,
    canControl: isScribe || isLeader,
    meetingEndTime: meetingEnd,
  }
}
