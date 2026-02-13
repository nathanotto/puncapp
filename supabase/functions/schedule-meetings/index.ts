import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

interface Chapter {
  id: string
  name: string
  meeting_frequency: 'weekly' | 'biweekly' | 'threeweekly' | 'monthly'
  meeting_day_of_week: number // 0 = Sunday, 6 = Saturday
  meeting_time: string // HH:MM:SS format
  meeting_location: string
}

/**
 * Calculate the next meeting date based on chapter schedule
 */
function getNextMeetingDate(
  fromDate: Date,
  dayOfWeek: number,
  frequency: string
): Date {
  const result = new Date(fromDate)

  // Find next occurrence of the target day of week
  const currentDay = result.getDay()
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7

  // If we're already on the target day, move to next occurrence
  const daysToAdd = daysUntilTarget === 0 ? 7 : daysUntilTarget
  result.setDate(result.getDate() + daysToAdd)

  // Apply frequency multiplier
  switch (frequency) {
    case 'biweekly':
      result.setDate(result.getDate() + 7) // Add one more week
      break
    case 'threeweekly':
      result.setDate(result.getDate() + 14) // Add two more weeks
      break
    case 'monthly':
      result.setDate(result.getDate() + 21) // Add three more weeks
      break
    // 'weekly' is default - no additional days
  }

  return result
}

/**
 * Get the leader's user ID for a chapter
 */
async function getChapterLeader(supabase: any, chapterId: string): Promise<string | null> {
  const { data } = await supabase
    .from('chapter_memberships')
    .select('user_id')
    .eq('chapter_id', chapterId)
    .eq('role', 'leader')
    .eq('is_active', true)
    .single()

  return data?.user_id || null
}

/**
 * Create a curriculum selection task for the leader
 */
async function createCurriculumTask(
  supabase: any,
  meetingId: string,
  leaderId: string,
  chapterId: string,
  chapterName: string,
  meetingDate: string
) {
  await supabase
    .from('pending_tasks')
    .insert({
      task_type: 'select_curriculum',
      assigned_to: leaderId,
      related_entity_type: 'meeting',
      related_entity_id: meetingId,
      due_at: new Date(meetingDate).toISOString(),
      metadata: {
        chapter_id: chapterId,
        chapter_name: chapterName,
      }
    })
}

/**
 * Main function to schedule meetings for all active chapters
 */
Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all active chapters with recurring schedules
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, name, meeting_frequency, meeting_day_of_week, meeting_time, meeting_location')
      .eq('status', 'active')
      .not('meeting_frequency', 'is', null)
      .not('meeting_day_of_week', 'is', null)
      .not('meeting_time', 'is', null)

    if (chaptersError) {
      throw chaptersError
    }

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[]
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const oneMonthOut = new Date(today)
    oneMonthOut.setDate(oneMonthOut.getDate() + 30)

    for (const chapter of (chapters as Chapter[])) {
      try {
        results.processed++

        // Get existing scheduled meetings for this chapter (future only)
        const { data: existingMeetings } = await supabase
          .from('meetings')
          .select('scheduled_date, scheduled_time')
          .eq('chapter_id', chapter.id)
          .eq('status', 'scheduled')
          .gte('scheduled_date', today.toISOString().split('T')[0])
          .order('scheduled_date', { ascending: true })

        const existingDates = new Set(
          existingMeetings?.map((m: any) => m.scheduled_date) || []
        )

        // Calculate what meetings SHOULD exist based on recurring schedule
        const meetingsToCreate: Date[] = []
        let nextDate = getNextMeetingDate(today, chapter.meeting_day_of_week, chapter.meeting_frequency)

        // Check up to 2 potential meetings
        for (let i = 0; i < 2; i++) {
          // Only schedule if within 1 month
          if (nextDate <= oneMonthOut) {
            const dateStr = nextDate.toISOString().split('T')[0]

            // Only create if it doesn't already exist
            if (!existingDates.has(dateStr)) {
              meetingsToCreate.push(new Date(nextDate))
            }

            // Calculate next meeting after this one
            nextDate = getNextMeetingDate(nextDate, chapter.meeting_day_of_week, chapter.meeting_frequency)
          } else {
            break // Stop if beyond 1 month
          }
        }

        // Create missing meetings
        if (meetingsToCreate.length > 0) {
          const leaderId = await getChapterLeader(supabase, chapter.id)

          if (!leaderId) {
            results.errors.push(`Chapter ${chapter.name} has no active leader`)
            continue
          }

          for (const meetingDate of meetingsToCreate) {
            const dateStr = meetingDate.toISOString().split('T')[0]

            // Create meeting
            const { data: meeting, error: meetingError } = await supabase
              .from('meetings')
              .insert({
                chapter_id: chapter.id,
                scheduled_date: dateStr,
                scheduled_time: chapter.meeting_time,
                location: chapter.meeting_location,
                status: 'scheduled',
                rsvp_deadline: dateStr,
              })
              .select('id')
              .single()

            if (meetingError) {
              results.errors.push(`Failed to create meeting for ${chapter.name} on ${dateStr}: ${meetingError.message}`)
              continue
            }

            // Create curriculum selection task
            await createCurriculumTask(
              supabase,
              meeting.id,
              leaderId,
              chapter.id,
              chapter.name,
              dateStr
            )

            results.created++
            console.log(`Created meeting for ${chapter.name} on ${dateStr}`)
          }
        } else {
          results.skipped++
        }

      } catch (error: any) {
        results.errors.push(`Error processing chapter ${chapter.name}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Schedule meetings function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
