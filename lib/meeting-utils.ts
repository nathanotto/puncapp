import { createClient } from '@/lib/supabase/server'

/**
 * Creates a curriculum selection task for the Leader when a meeting is created.
 * Should be called when meetings are scheduled (typically 7 days in advance).
 */
export async function createCurriculumSelectionTask(
  meetingId: string,
  leaderId: string,
  chapterId: string,
  meetingDate: string
) {
  const supabase = await createClient()

  // Get chapter name for task metadata
  const { data: chapter } = await supabase
    .from('chapters')
    .select('name')
    .eq('id', chapterId)
    .single()

  // Create the task
  const { error } = await supabase
    .from('pending_tasks')
    .insert({
      task_type: 'select_curriculum',
      assigned_to: leaderId,
      related_entity_type: 'meeting',
      related_entity_id: meetingId,
      due_at: new Date(meetingDate).toISOString(),
      metadata: {
        chapter_id: chapterId,
        chapter_name: chapter?.name || 'Unknown Chapter',
      }
    })

  if (error) {
    console.error('Failed to create curriculum selection task:', error)
    throw error
  }

  return true
}

/**
 * Creates a new meeting and associated tasks.
 * This should be called by a cron job/scheduled function to create meetings 7 days in advance.
 */
export async function createScheduledMeeting(
  chapterId: string,
  scheduledDate: string,
  scheduledTime: string,
  location: string
) {
  const supabase = await createClient()

  // Get chapter details including leader
  const { data: chapter } = await supabase
    .from('chapters')
    .select(`
      id,
      name,
      chapter_memberships!inner(
        user_id,
        role
      )
    `)
    .eq('id', chapterId)
    .eq('chapter_memberships.role', 'leader')
    .eq('chapter_memberships.is_active', true)
    .single()

  if (!chapter || !chapter.chapter_memberships || chapter.chapter_memberships.length === 0) {
    throw new Error(`No active leader found for chapter ${chapterId}`)
  }

  const leaderId = chapter.chapter_memberships[0].user_id

  // Create the meeting
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      chapter_id: chapterId,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      location,
      status: 'scheduled',
      rsvp_deadline: scheduledDate, // Due on meeting day
    })
    .select('id')
    .single()

  if (meetingError || !meeting) {
    console.error('Failed to create meeting:', meetingError)
    throw meetingError
  }

  // Create curriculum selection task for the Leader
  await createCurriculumSelectionTask(
    meeting.id,
    leaderId,
    chapterId,
    scheduledDate
  )

  return meeting.id
}
