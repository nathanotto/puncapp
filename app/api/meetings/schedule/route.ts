import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const {
      chapterId,
      scheduledDate,
      scheduledTime,
      location,
      topic,
      durationMinutes,
      messageToMembers,
      isSpecialMeeting,
    } = await req.json()

    // Validate required fields
    if (!chapterId || !scheduledDate || !scheduledTime || !location || !topic) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user is leader or backup leader
    const { data: membership } = await supabase
      .from('chapter_memberships')
      .select('role')
      .eq('chapter_id', chapterId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership || !['leader', 'backup_leader'].includes(membership.role)) {
      return NextResponse.json(
        { success: false, error: 'Only leaders can schedule meetings' },
        { status: 403 }
      )
    }

    // Check not in past
    const meetingDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
    if (meetingDateTime < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Cannot schedule meeting in the past' },
        { status: 400 }
      )
    }

    // Create the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        chapter_id: chapterId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        location: location,
        topic: topic,
        meeting_type: isSpecialMeeting ? 'special_consideration' : 'standard',
        message_to_members: messageToMembers,
        status: 'scheduled',
      })
      .select('id')
      .single()

    if (meetingError) {
      console.error('Error creating meeting:', meetingError)
      return NextResponse.json(
        { success: false, error: `Failed to create meeting: ${meetingError.message}` },
        { status: 500 }
      )
    }

    // Get all active chapter members for notifications
    const { data: members } = await supabase
      .from('chapter_memberships')
      .select('user_id')
      .eq('chapter_id', chapterId)
      .eq('is_active', true)

    // Create pending tasks for RSVP
    if (members && members.length > 0) {
      const tasks = members.map(m => ({
        task_type: 'rsvp_to_meeting',
        assigned_to: m.user_id,
        related_entity_type: 'meeting',
        related_entity_id: meeting.id,
        metadata: {
          meeting_date: scheduledDate,
          meeting_time: scheduledTime,
          meeting_type: isSpecialMeeting ? 'special_consideration' : 'standard',
        },
      }))

      await supabase.from('pending_tasks').insert(tasks)
    }

    // Log simulated notifications
    if (members && members.length > 0) {
      const notifications = members.map(m => ({
        recipient_user_id: m.user_id,
        notification_type: 'sms',
        purpose: 'meeting_scheduled',
        status: 'simulated',
        content: messageToMembers || `New meeting scheduled: ${topic}`,
        related_entity_type: 'meeting',
        related_entity_id: meeting.id,
      }))

      await supabase.from('notification_log').insert(notifications)
    }

    return NextResponse.json({
      success: true,
      meetingId: meeting.id,
      message: `Meeting scheduled for ${scheduledDate} at ${scheduledTime}`,
    })

  } catch (error: any) {
    console.error('Error scheduling meeting:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
