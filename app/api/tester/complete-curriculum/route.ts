import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { meetingId } = await req.json()

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Missing meetingId' })
    }

    const supabase = createServiceRoleClient()

    // Get the meeting with module info
    const { data: meeting } = await supabase
      .from('meetings')
      .select('id, chapter_id, selected_curriculum_id, current_section')
      .eq('id', meetingId)
      .single()

    if (!meeting || !meeting.selected_curriculum_id) {
      return NextResponse.json({ success: false, error: 'Meeting not found or no curriculum selected' })
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

    // Check if chapter_curriculum_history exists
    const { data: history } = await supabase
      .from('chapter_curriculum_history')
      .select('id')
      .eq('chapter_id', meeting.chapter_id)
      .eq('module_id', meeting.selected_curriculum_id)
      .eq('meeting_id', meetingId)
      .maybeSingle()

    let historyId: string

    if (history) {
      historyId = history.id
    } else {
      // Create history record
      const { data: newHistory, error: createError } = await supabase
        .from('chapter_curriculum_history')
        .insert({
          chapter_id: meeting.chapter_id,
          module_id: meeting.selected_curriculum_id,
          meeting_id: meetingId,
        })
        .select('id')
        .single()

      if (createError || !newHistory) {
        return NextResponse.json({ success: false, error: 'Failed to create curriculum history' })
      }

      historyId = newHistory.id
    }

    // Submit a response for each attendee
    const responses = attendees.map((attendee, index) => ({
      chapter_curriculum_history_id: historyId,
      user_id: attendee.user_id,
      meeting_id: meetingId,
      module_id: meeting.selected_curriculum_id,
      response: `Test response from automated completion ${index + 1}. This is a sample answer for testing purposes.`
    }))

    const { error: insertError } = await supabase
      .from('curriculum_responses')
      .upsert(responses, {
        onConflict: 'meeting_id,module_id,user_id'
      })

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message })
    }

    return NextResponse.json({
      success: true,
      count: attendees.length
    })

  } catch (error: any) {
    console.error('Error completing curriculum:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    })
  }
}
