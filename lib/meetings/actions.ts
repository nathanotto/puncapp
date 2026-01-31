'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateMeetingData {
  chapterId: string
  scheduledDatetime: string
  location: {
    street: string
    city: string
    state: string
    zip: string
  }
  topic?: string
  curriculumModuleId?: string
}

/**
 * Create a new meeting (leader only)
 */
export async function createMeeting(data: CreateMeetingData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify user is a leader of this chapter
  const { data: role } = await supabase
    .from('chapter_roles')
    .select('role_type')
    .eq('chapter_id', data.chapterId)
    .eq('user_id', user.id)
    .in('role_type', ['Chapter Leader', 'Backup Leader'])
    .single()

  if (!role) {
    return { success: false, error: 'Only chapter leaders can create meetings' }
  }

  // Create the meeting
  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      chapter_id: data.chapterId,
      scheduled_datetime: data.scheduledDatetime,
      location: data.location,
      topic: data.topic || null,
      curriculum_module_id: data.curriculumModuleId || null,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Create attendance records for all chapter members with no_response status
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select('user_id')
    .eq('chapter_id', data.chapterId)
    .eq('is_active', true)

  if (members && members.length > 0) {
    await supabase
      .from('attendance')
      .insert(
        members.map(m => ({
          meeting_id: meeting.id,
          user_id: m.user_id,
          rsvp_status: 'no_response',
          attendance_type: 'absent',
        }))
      )
  }

  revalidatePath(`/chapters/${data.chapterId}/meetings`)
  revalidatePath('/dashboard')

  return { success: true, meeting }
}

/**
 * Update RSVP status for a meeting
 */
export async function updateRsvp(meetingId: string, rsvpStatus: 'yes' | 'no' | 'maybe') {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('attendance')
    .update({ rsvp_status: rsvpStatus })
    .eq('meeting_id', meetingId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Self check-in to a meeting
 */
export async function checkIn(meetingId: string, attendanceType: 'in_person' | 'video') {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('attendance')
    .update({
      attendance_type: attendanceType,
      checked_in_at: new Date().toISOString(),
      rsvp_status: 'yes', // Auto-update RSVP to yes
    })
    .eq('meeting_id', meetingId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Submit meeting feedback
 */
export async function submitFeedback(meetingId: string, rating: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Validate rating
  if (rating < 1 || rating > 10) {
    return { success: false, error: 'Rating must be between 1 and 10' }
  }

  const { error } = await supabase
    .from('meeting_feedback')
    .insert({
      meeting_id: meetingId,
      user_id: user.id,
      value_rating: rating,
      submitted_at: new Date().toISOString(),
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
