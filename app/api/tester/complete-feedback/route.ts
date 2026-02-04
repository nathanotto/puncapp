import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { meetingId } = await req.json()

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Missing meetingId' })
    }

    const supabase = createServiceRoleClient()

    // Get all checked-in attendees
    const { data: attendees } = await supabase
      .from('attendance')
      .select('user_id')
      .eq('meeting_id', meetingId)
      .not('checked_in_at', 'is', null)

    if (!attendees || attendees.length === 0) {
      return NextResponse.json({ success: false, error: 'No attendees found' })
    }

    // Create feedback responses for each attendee
    const feedbackPromises = attendees.map(async (attendee, index) => {
      // Pick a random rating between 7-10 (most meetings are pretty good)
      const rating = Math.floor(Math.random() * 4) + 7

      // Randomly pick someone else who provided value (not themselves)
      const otherAttendees = attendees.filter(a => a.user_id !== attendee.user_id)
      const mostValueUserId = otherAttendees.length > 0
        ? otherAttendees[Math.floor(Math.random() * otherAttendees.length)].user_id
        : null

      return supabase
        .from('meeting_feedback')
        .upsert({
          meeting_id: meetingId,
          user_id: attendee.user_id,
          value_rating: rating,
          skipped_rating: false,
          most_value_user_id: mostValueUserId,
          skipped_most_value: mostValueUserId === null,
        }, {
          onConflict: 'meeting_id,user_id'
        })
    })

    const results = await Promise.all(feedbackPromises)

    // Check for errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Some feedback submissions failed:', errors)
      return NextResponse.json({
        success: false,
        error: `${errors.length} feedback submissions failed`
      })
    }

    return NextResponse.json({
      success: true,
      count: attendees.length
    })

  } catch (error: any) {
    console.error('Error completing feedback:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    })
  }
}
