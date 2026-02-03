'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function advanceSection(meetingId: string, newSection: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify user is scribe
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scribe_id, current_section')
    .eq('id', meetingId)
    .single()

  if (meeting?.scribe_id !== user.id) {
    throw new Error('Only the Scribe can advance sections')
  }

  const now = new Date().toISOString()

  // End the current section's time log
  if (meeting.current_section && meeting.current_section !== 'not_started') {
    await supabase
      .from('meeting_time_log')
      .update({ end_time: now })
      .eq('meeting_id', meetingId)
      .eq('section', meeting.current_section)
      .is('end_time', null)
      .is('user_id', null) // Section-level log, not person-level
  }

  // Start new section's time log
  const { error: insertError } = await supabase.from('meeting_time_log').insert({
    meeting_id: meetingId,
    section: newSection,
    start_time: now,
  })

  if (insertError) {
    console.error('Error inserting time log:', insertError)
    throw new Error(`Failed to insert time log: ${insertError.message}`)
  }

  // Update meeting's current section using the database function
  const { error: updateError } = await supabase.rpc('advance_meeting_section', {
    p_meeting_id: meetingId,
    p_new_section: newSection
  })

  if (updateError) {
    console.error('Error updating meeting section:', updateError)
    throw new Error(`Failed to update meeting: ${updateError.message}`)
  }

  console.log(`✓ Advanced meeting ${meetingId} to ${newSection}`)
  revalidatePath(`/meetings/${meetingId}/run`)
}

export async function logLightningRound(
  meetingId: string,
  userId: string,
  durationSeconds: number,
  overtimeSeconds: number,
  priority: number
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date()
  const startTime = new Date(now.getTime() - durationSeconds * 1000)

  await supabase.from('meeting_time_log').insert({
    meeting_id: meetingId,
    section: 'lightning_round',
    user_id: userId,
    start_time: startTime.toISOString(),
    end_time: now.toISOString(),
    duration_seconds: durationSeconds,
    overtime_seconds: overtimeSeconds,
    priority: priority,
    skipped: false,
  })

  revalidatePath(`/meetings/${meetingId}/run`)
}

export async function skipLightningRound(meetingId: string, userId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date().toISOString()

  await supabase.from('meeting_time_log').insert({
    meeting_id: meetingId,
    section: 'lightning_round',
    user_id: userId,
    start_time: now,
    end_time: now,
    duration_seconds: 0,
    overtime_seconds: 0,
    skipped: true,
  })

  revalidatePath(`/meetings/${meetingId}/run`)
}
