import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { meetingId } = await req.json()

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Missing meetingId' })
    }

    const supabase = createServiceRoleClient()

    // Get meeting info
    const { data: meeting } = await supabase
      .from('meetings')
      .select('current_section')
      .eq('id', meetingId)
      .single()

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' })
    }

    // Update meeting to lightning_round if not already there
    if (meeting.current_section !== 'lightning_round') {
      await supabase
        .from('meetings')
        .update({ current_section: 'lightning_round' })
        .eq('id', meetingId)
    }

    // Get all checked-in attendees
    const { data: attendees } = await supabase
      .from('attendance')
      .select('user_id')
      .eq('meeting_id', meetingId)
      .not('checked_in_at', 'is', null)

    if (!attendees || attendees.length === 0) {
      return NextResponse.json({ success: false, error: 'No attendees found' })
    }

    const now = new Date()

    // Create section-level time log if it doesn't exist
    const { data: existingSectionLog } = await supabase
      .from('meeting_time_log')
      .select('id')
      .eq('meeting_id', meetingId)
      .eq('section', 'lightning_round')
      .is('user_id', null)
      .maybeSingle()

    if (!existingSectionLog) {
      // Calculate section start time based on when we'll say it started
      const sectionStartTime = new Date(now.getTime() - (attendees.length * 60 * 1000) - (5 * 60 * 1000))

      await supabase.from('meeting_time_log').insert({
        meeting_id: meetingId,
        section: 'lightning_round',
        start_time: sectionStartTime.toISOString(),
        user_id: null, // Section-level log
      })
    }

    // Create lightning round logs for each attendee
    const logs = attendees.map((attendee, index) => {
      // Realistic durations: 45-75 seconds
      const baseDuration = 45 + Math.floor(Math.random() * 30)
      const overtime = Math.random() > 0.7 ? Math.floor(Math.random() * 15) : 0
      const duration = baseDuration - overtime

      // Randomly assign priority (70% P2, 30% P1)
      const priority = Math.random() > 0.7 ? 1 : 2

      // Stagger start times by ~60 seconds each
      const startTime = new Date(now.getTime() - (attendees.length - index) * 60 * 1000)
      const endTime = new Date(startTime.getTime() + (duration + overtime) * 1000)

      return {
        meeting_id: meetingId,
        section: 'lightning_round',
        user_id: attendee.user_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_seconds: duration,
        overtime_seconds: overtime,
        priority: priority,
        skipped: false,
      }
    })

    const { error: insertError } = await supabase
      .from('meeting_time_log')
      .insert(logs)

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message })
    }

    return NextResponse.json({
      success: true,
      count: attendees.length
    })

  } catch (error: any) {
    console.error('Error accelerating lightning round:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    })
  }
}
