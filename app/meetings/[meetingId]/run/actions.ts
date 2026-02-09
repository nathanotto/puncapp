'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function startTimer(meetingId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Verify user is scribe
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scribe_id')
    .eq('id', meetingId)
    .single()

  if (meeting?.scribe_id !== user.id) {
    throw new Error('Only the Scribe can start timers')
  }

  // Set the timer
  const { error } = await supabase
    .from('meetings')
    .update({
      current_timer_user_id: userId,
      current_timer_start: new Date().toISOString()
    })
    .eq('id', meetingId)

  if (error) {
    console.error('Error starting timer:', error)
    throw new Error('Failed to start timer')
  }

  revalidatePath(`/meetings/${meetingId}/run`)
  return { success: true }
}

export async function stopTimer(meetingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Verify user is scribe
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scribe_id')
    .eq('id', meetingId)
    .single()

  if (meeting?.scribe_id !== user.id) {
    throw new Error('Only the Scribe can stop timers')
  }

  // Clear the timer
  const { error } = await supabase
    .from('meetings')
    .update({
      current_timer_user_id: null,
      current_timer_start: null
    })
    .eq('id', meetingId)

  if (error) {
    console.error('Error stopping timer:', error)
    throw new Error('Failed to stop timer')
  }

  revalidatePath(`/meetings/${meetingId}/run`)
  return { success: true }
}

export async function changeScribe(meetingId: string, newScribeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get meeting to verify current user is the scribe
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scribe_id, chapter_id')
    .eq('id', meetingId)
    .single()

  if (!meeting) throw new Error('Meeting not found')

  // Only current scribe can switch
  if (meeting.scribe_id !== user.id) {
    throw new Error('Only the current scribe can switch the scribe role')
  }

  // Update the scribe
  const { error } = await supabase
    .from('meetings')
    .update({ scribe_id: newScribeId })
    .eq('id', meetingId)

  if (error) {
    console.error('Error changing scribe:', error)
    throw new Error('Failed to change scribe')
  }

  revalidatePath(`/meetings/${meetingId}/run`)
  return { success: true }
}

export async function advanceSection(meetingId: string, newSection: string) {
  console.log(`[advanceSection] Called with meetingId: ${meetingId}, newSection: ${newSection}`);

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[advanceSection] Not authenticated');
    throw new Error('Not authenticated');
  }

  console.log(`[advanceSection] User authenticated: ${user.id}`);

  // Verify user is scribe
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scribe_id, current_section')
    .eq('id', meetingId)
    .single()

  console.log(`[advanceSection] Meeting data:`, meeting);

  if (meeting?.scribe_id !== user.id) {
    console.error(`[advanceSection] User ${user.id} is not scribe ${meeting?.scribe_id}`);
    throw new Error('Only the Scribe can advance sections');
  }

  const now = new Date().toISOString()

  // End the current section's time log
  if (meeting.current_section && meeting.current_section !== 'not_started') {
    console.log(`[advanceSection] Ending current section: ${meeting.current_section}`);
    const { error } = await supabase
      .from('meeting_time_log')
      .update({ end_time: now })
      .eq('meeting_id', meetingId)
      .eq('section', meeting.current_section)
      .is('end_time', null)
      .is('user_id', null) // Section-level log, not person-level

    if (error) {
      console.error('[advanceSection] Error ending section log:', error);
    }
  }

  // Start new section's time log
  console.log(`[advanceSection] Starting new section log: ${newSection}`);
  const { error: insertError } = await supabase.from('meeting_time_log').insert({
    meeting_id: meetingId,
    section: newSection,
    start_time: now,
  })

  if (insertError) {
    console.error('[advanceSection] Error inserting time log:', insertError)
    throw new Error(`Failed to insert time log: ${insertError.message}`)
  }

  // Update meeting's current section
  console.log(`[advanceSection] Updating meeting current_section to: ${newSection}`);
  const { error: updateError } = await supabase
    .from('meetings')
    .update({ current_section: newSection })
    .eq('id', meetingId)

  if (updateError) {
    console.error('[advanceSection] Error updating meeting section:', updateError)
    throw new Error(`Failed to update meeting: ${updateError.message}`)
  }

  console.log(`[advanceSection] ✓ Successfully advanced meeting ${meetingId} to ${newSection}`)
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

export async function logFullCheckin(
  meetingId: string,
  userId: string,
  durationSeconds: number,
  overtimeSeconds: number,
  stretchGoalAction: 'kept' | 'completed' | 'new' | 'none',
  requestedSupport: boolean,
  newStretchGoalText?: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date()
  const startTime = new Date(now.getTime() - durationSeconds * 1000)

  // Get user's current stretch goal (if any)
  const { data: currentStretchGoal } = await supabase
    .from('commitments')
    .select('id')
    .eq('committer_id', userId)
    .eq('commitment_type', 'stretch_goal')
    .eq('status', 'active')
    .single()

  let newStretchGoalId: string | null = null

  // Handle stretch goal actions
  if (stretchGoalAction === 'completed' && currentStretchGoal) {
    // Mark current goal as completed
    await supabase
      .from('commitments')
      .update({
        status: 'completed',
        completed_at: now.toISOString(),
        completed_at_meeting_id: meetingId,
      })
      .eq('id', currentStretchGoal.id)
  }

  if (stretchGoalAction === 'new') {
    if (newStretchGoalText) {
      // Replace old goal and create new one
      if (currentStretchGoal) {
        await supabase
          .from('commitments')
          .update({ status: 'replaced' })
          .eq('id', currentStretchGoal.id)
      }

      const { data: newGoal } = await supabase
        .from('commitments')
        .insert({
          committer_id: userId,
          commitment_type: 'stretch_goal',
          description: newStretchGoalText,
          created_at_meeting_id: meetingId,
        })
        .select('id')
        .single()

      newStretchGoalId = newGoal?.id || null
    } else {
      // Create pending task for user to enter goal later
      await supabase.from('pending_tasks').insert({
        task_type: 'enter_stretch_goal',
        assigned_to: userId,
        related_entity_type: 'meeting',
        related_entity_id: meetingId,
        metadata: {
          reason: 'Deferred stretch goal entry from meeting',
        },
      })
    }
  }

  // Log the check-in
  await supabase.from('meeting_time_log').insert({
    meeting_id: meetingId,
    section: 'full_checkins',
    user_id: userId,
    start_time: startTime.toISOString(),
    end_time: now.toISOString(),
    duration_seconds: durationSeconds,
    overtime_seconds: overtimeSeconds,
    stretch_goal_action: stretchGoalAction,
    requested_support: requestedSupport,
    new_stretch_goal_id: newStretchGoalId,
    skipped: false,
  })

  revalidatePath(`/meetings/${meetingId}/run`)
}

export async function skipFullCheckin(meetingId: string, userId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date().toISOString()

  await supabase.from('meeting_time_log').insert({
    meeting_id: meetingId,
    section: 'full_checkins',
    user_id: userId,
    start_time: now,
    end_time: now,
    duration_seconds: 0,
    overtime_seconds: 0,
    skipped: true,
  })

  revalidatePath(`/meetings/${meetingId}/run`)
}

export async function addMeetingTime(meetingId: string, minutes: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get current meeting duration
  const { data: meeting } = await supabase
    .from('meetings')
    .select('duration_minutes')
    .eq('id', meetingId)
    .single()

  if (!meeting) throw new Error('Meeting not found')

  // Add time
  await supabase
    .from('meetings')
    .update({ duration_minutes: meeting.duration_minutes + minutes })
    .eq('id', meetingId)

  revalidatePath(`/meetings/${meetingId}/run`)
}

export async function ditchCurriculum(meetingId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Mark curriculum as ditched
  await supabase
    .from('meetings')
    .update({ curriculum_ditched: true })
    .eq('id', meetingId)

  revalidatePath(`/meetings/${meetingId}/run`)
}

export async function submitCurriculumResponse(
  meetingId: string,
  moduleId: string,
  response: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get chapter_id from meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select('chapter_id')
    .eq('id', meetingId)
    .single()

  if (!meeting) throw new Error('Meeting not found')

  // Get or create chapter_curriculum_history record
  const { data: history, error: historyError } = await supabase
    .from('chapter_curriculum_history')
    .select('id')
    .eq('chapter_id', meeting.chapter_id)
    .eq('module_id', moduleId)
    .eq('meeting_id', meetingId)
    .maybeSingle()

  let historyId: string

  if (history) {
    historyId = history.id
  } else {
    // Create new history record
    const { data: newHistory, error: createError } = await supabase
      .from('chapter_curriculum_history')
      .insert({
        chapter_id: meeting.chapter_id,
        module_id: moduleId,
        meeting_id: meetingId,
      })
      .select('id')
      .single()

    if (createError || !newHistory) {
      console.error('Error creating history:', createError)
      throw new Error('Failed to create curriculum history')
    }

    historyId = newHistory.id
  }

  // Insert or update the response
  const { error: responseError } = await supabase
    .from('curriculum_responses')
    .upsert({
      chapter_curriculum_history_id: historyId,
      user_id: user.id,
      meeting_id: meetingId,
      module_id: moduleId,
      response: response,
    }, {
      onConflict: 'meeting_id,module_id,user_id'
    })

  if (responseError) {
    console.error('Error saving response:', responseError)
    throw new Error('Failed to save response')
  }

  revalidatePath(`/meetings/${meetingId}/run`)
}

export async function acceptCurriculumAssignment(
  meetingId: string,
  moduleId: string,
  assignmentText: string,
  dueDate: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Create commitment for the assignment
  const { error } = await supabase
    .from('commitments')
    .insert({
      committer_id: user.id,
      commitment_type: 'curriculum_assignment',
      description: assignmentText,
      status: 'active',
      due_date: dueDate,
      created_at_meeting_id: meetingId,
      metadata: { module_id: moduleId },
    })

  if (error) {
    console.error('Error creating assignment commitment:', error)
    throw new Error('Failed to accept assignment')
  }

  revalidatePath(`/meetings/${meetingId}/run`)
}

export async function completeCurriculum(meetingId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify user is scribe
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scribe_id, chapter_id, selected_curriculum_id')
    .eq('id', meetingId)
    .single()

  if (meeting?.scribe_id !== user.id) {
    throw new Error('Only the Scribe can advance sections')
  }

  const moduleId = meeting.selected_curriculum_id

  if (moduleId) {
    // Get all attendees who submitted responses
    const { data: responses } = await supabase
      .from('curriculum_responses')
      .select('user_id')
      .eq('meeting_id', meetingId)
      .eq('module_id', moduleId)

    const respondentIds = responses?.map(r => r.user_id) || []

    // Track completion for each respondent
    if (respondentIds.length > 0) {
      const completions = respondentIds.map(userId => ({
        user_id: userId,
        module_id: moduleId,
        meeting_id: meetingId,
        completed_at: new Date().toISOString(),
      }))

      await supabase
        .from('member_curriculum_completion')
        .insert(completions)
    }

    // Get all chapter members
    const { data: chapterMembers } = await supabase
      .from('chapter_memberships')
      .select('user_id')
      .eq('chapter_id', meeting.chapter_id)
      .eq('is_active', true)

    const allMemberIds = chapterMembers?.map(m => m.user_id) || []

    // Find non-attendees (members who didn't respond)
    const nonAttendeeIds = allMemberIds.filter(id => !respondentIds.includes(id))

    // Get module details for task metadata
    const { data: module } = await supabase
      .from('curriculum_modules')
      .select('title')
      .eq('id', moduleId)
      .single()

    // Create tasks for non-attendees
    if (nonAttendeeIds.length > 0) {
      const tasks = nonAttendeeIds.map(userId => ({
        task_type: 'complete_curriculum_module',
        assigned_to: userId,
        related_entity_type: 'curriculum_module',
        related_entity_id: moduleId,
        metadata: {
          meeting_id: meetingId,
          chapter_id: meeting.chapter_id,
          module_title: module?.title || 'Unknown Module',
        },
      }))

      await supabase.from('pending_tasks').insert(tasks)
    }
  }

  // Advance to closing section
  await advanceSection(meetingId, 'closing')

  revalidatePath(`/meetings/${meetingId}/run`)
}

export async function submitMeetingFeedback(
  meetingId: string,
  rating: number | null,
  mostValueUserId: string | null,
  skipRating: boolean,
  skipMostValue: boolean
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Insert or update feedback
  const { error } = await supabase
    .from('meeting_feedback')
    .upsert({
      meeting_id: meetingId,
      user_id: user.id,
      value_rating: skipRating ? null : rating,
      skipped_rating: skipRating,
      most_value_user_id: skipMostValue ? null : mostValueUserId,
      skipped_most_value: skipMostValue,
    }, {
      onConflict: 'meeting_id,user_id'
    })

  if (error) {
    console.error('Error submitting feedback:', error)
    throw new Error('Failed to submit feedback')
  }

  revalidatePath(`/meetings/${meetingId}/run`)
}

export async function saveAudioMetadata(
  meetingId: string,
  storagePath: string,
  fileSize: number
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify user is scribe
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scribe_id')
    .eq('id', meetingId)
    .single()

  if (meeting?.scribe_id !== user.id) {
    throw new Error('Only the Scribe can upload audio')
  }

  // Save recording metadata to database
  const { error: dbError } = await supabase
    .from('meeting_recordings')
    .insert({
      meeting_id: meetingId,
      storage_path: storagePath,
      file_size_bytes: fileSize,
      recorded_by: user.id,
    })

  if (dbError) {
    console.error('Error saving recording metadata:', dbError)
    throw new Error('Failed to save recording metadata')
  }

  revalidatePath(`/meetings/${meetingId}/run`)
}

export async function completeMeeting(meetingId: string) {
  'use server'

  const { redirect: nextRedirect } = await import('next/navigation')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify user is scribe
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scribe_id, chapter_id, leader_id')
    .eq('id', meetingId)
    .single()

  if (meeting?.scribe_id !== user.id) {
    throw new Error('Only the Scribe can complete the meeting')
  }

  const now = new Date().toISOString()

  // End the current section's time log
  await supabase
    .from('meeting_time_log')
    .update({ end_time: now })
    .eq('meeting_id', meetingId)
    .eq('section', 'closing')
    .is('end_time', null)
    .is('user_id', null)

  // Update meeting status to completed with validation workflow
  const { error: updateError } = await supabase
    .from('meetings')
    .update({
      status: 'completed',
      current_section: 'ended',
      completed_at: now,
      validation_status: 'awaiting_leader',
    })
    .eq('id', meetingId)

  if (updateError) {
    console.error('Error completing meeting:', updateError)
    throw new Error('Failed to complete meeting')
  }

  // Create leader validation task
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  await supabase.from('pending_tasks').insert({
    task_type: 'validate_meeting',
    assigned_to: meeting.leader_id,
    related_entity_type: 'meeting',
    related_entity_id: meetingId,
    due_date: dueDate,
    metadata: { chapter_id: meeting.chapter_id },
  })

  revalidatePath(`/meetings/${meetingId}/run`)
  revalidatePath(`/meetings/${meetingId}`)
  revalidatePath(`/meetings/${meetingId}/summary`)

  // Redirect to summary page
  nextRedirect(`/meetings/${meetingId}/summary`)
}
