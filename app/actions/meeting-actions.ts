'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteMeeting(meetingId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify user is a leader or backup_leader of the chapter
  const { data: meeting } = await supabase
    .from('meetings')
    .select('chapter_id, status, scheduled_date, scheduled_time')
    .eq('id', meetingId)
    .single()

  if (!meeting) throw new Error('Meeting not found')

  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || (membership.role !== 'leader' && membership.role !== 'backup_leader')) {
    throw new Error('Only chapter leaders or backup leaders can delete meetings')
  }

  // Check if meeting was completed
  const { data: completionCheck } = await supabase
    .from('meetings')
    .select('completed_at')
    .eq('id', meetingId)
    .single()

  if (meeting.status === 'completed' || completionCheck?.completed_at) {
    throw new Error('Cannot delete completed meetings')
  }

  // If meeting is scheduled (upcoming), check 2-day rule
  if (meeting.status === 'scheduled') {
    const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`)
    const twoDaysBeforeMeeting = new Date(meetingDateTime.getTime() - 2 * 24 * 60 * 60 * 1000)
    const now = new Date()

    if (now >= twoDaysBeforeMeeting) {
      throw new Error('Cannot delete meetings within 2 days of scheduled time')
    }
  }

  // Delete all associated data (cascading deletes handle most of this)
  // But let's be explicit about what we're deleting:

  // 1. Delete curriculum responses
  const { error: curriculumError } = await supabase
    .from('curriculum_responses')
    .delete()
    .eq('meeting_id', meetingId)

  if (curriculumError) {
    console.error('Error deleting curriculum responses:', curriculumError)
    throw new Error(`Failed to delete curriculum responses: ${curriculumError.message}`)
  }

  // 2. Delete meeting feedback
  const { error: feedbackError } = await supabase
    .from('meeting_feedback')
    .delete()
    .eq('meeting_id', meetingId)

  if (feedbackError) {
    console.error('Error deleting meeting feedback:', feedbackError)
    throw new Error(`Failed to delete meeting feedback: ${feedbackError.message}`)
  }

  // 3. Delete meeting recordings
  const { data: recordings, error: recordingsSelectError } = await supabase
    .from('meeting_recordings')
    .select('storage_path')
    .eq('meeting_id', meetingId)

  if (recordingsSelectError) {
    console.error('Error fetching recordings:', recordingsSelectError)
    throw new Error(`Failed to fetch recordings: ${recordingsSelectError.message}`)
  }

  if (recordings && recordings.length > 0) {
    // Delete files from storage
    for (const recording of recordings) {
      const { error: storageError } = await supabase.storage
        .from('meeting-recordings')
        .remove([recording.storage_path])

      if (storageError) {
        console.error('Error deleting recording file:', storageError)
        // Continue even if storage delete fails
      }
    }
    // Delete records
    const { error: recordingsError } = await supabase
      .from('meeting_recordings')
      .delete()
      .eq('meeting_id', meetingId)

    if (recordingsError) {
      console.error('Error deleting recording records:', recordingsError)
      throw new Error(`Failed to delete recording records: ${recordingsError.message}`)
    }
  }

  // 4. Delete meeting time logs
  const { error: timeLogError } = await supabase
    .from('meeting_time_log')
    .delete()
    .eq('meeting_id', meetingId)

  if (timeLogError) {
    console.error('Error deleting time logs:', timeLogError)
    throw new Error(`Failed to delete time logs: ${timeLogError.message}`)
  }

  // 5. Delete attendance records
  const { error: attendanceError } = await supabase
    .from('attendance')
    .delete()
    .eq('meeting_id', meetingId)

  if (attendanceError) {
    console.error('Error deleting attendance:', attendanceError)
    throw new Error(`Failed to delete attendance: ${attendanceError.message}`)
  }

  // 6. Delete pending tasks related to this meeting
  const { error: tasksError } = await supabase
    .from('pending_tasks')
    .delete()
    .eq('related_entity_type', 'meeting')
    .eq('related_entity_id', meetingId)

  if (tasksError) {
    console.error('Error deleting pending tasks:', tasksError)
    throw new Error(`Failed to delete pending tasks: ${tasksError.message}`)
  }

  // 7. Finally, delete the meeting itself
  const { error: deleteError } = await supabase
    .from('meetings')
    .delete()
    .eq('id', meetingId)

  if (deleteError) {
    console.error('Error deleting meeting:', deleteError)
    throw new Error(`Failed to delete meeting: ${deleteError.message}`)
  }

  revalidatePath('/')
  return { success: true }
}

export async function rescheduleMeeting(
  meetingId: string,
  newDate: string,
  newTime: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify user is a leader or backup_leader of the chapter
  const { data: meeting } = await supabase
    .from('meetings')
    .select('chapter_id, status')
    .eq('id', meetingId)
    .single()

  if (!meeting) throw new Error('Meeting not found')

  if (meeting.status !== 'scheduled') {
    throw new Error('Can only reschedule scheduled meetings')
  }

  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || (membership.role !== 'leader' && membership.role !== 'backup_leader')) {
    throw new Error('Only chapter leaders or backup leaders can reschedule meetings')
  }

  // Update meeting date and time
  const { error: updateError } = await supabase
    .from('meetings')
    .update({
      scheduled_date: newDate,
      scheduled_time: newTime,
      updated_at: new Date().toISOString()
    })
    .eq('id', meetingId)

  if (updateError) {
    console.error('Error rescheduling meeting:', updateError)
    throw new Error('Failed to reschedule meeting')
  }

  // Delete all RSVPs (attendance records without check-in)
  await supabase
    .from('attendance')
    .delete()
    .eq('meeting_id', meetingId)
    .is('checked_in_at', null)

  // TODO: Send notifications to all chapter members
  // This would integrate with a notification system
  // For now, we'll log it
  console.log(`Meeting ${meetingId} rescheduled to ${newDate} ${newTime}`)

  revalidatePath('/')
  revalidatePath(`/meetings/${meetingId}`)
  return { success: true }
}
