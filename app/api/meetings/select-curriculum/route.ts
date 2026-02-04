import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { meetingId, moduleId } = await request.json()

    if (!meetingId || !moduleId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get meeting and verify user is Leader
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        id,
        chapter_id,
        chapters!inner (
          chapter_memberships!inner (
            user_id,
            role
          )
        )
      `)
      .eq('id', meetingId)
      .eq('chapters.chapter_memberships.user_id', user.id)
      .eq('chapters.chapter_memberships.role', 'leader')
      .eq('chapters.chapter_memberships.is_active', true)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found or access denied' },
        { status: 403 }
      )
    }

    // Verify the module exists
    const { data: module, error: moduleError } = await supabase
      .from('curriculum_modules')
      .select('id')
      .eq('id', moduleId)
      .single()

    if (moduleError || !module) {
      return NextResponse.json(
        { error: 'Invalid curriculum module' },
        { status: 400 }
      )
    }

    // Update meeting with selected curriculum
    const { error: updateError } = await supabase
      .from('meetings')
      .update({ selected_curriculum_id: moduleId })
      .eq('id', meetingId)

    if (updateError) {
      console.error('Error updating meeting:', updateError)
      return NextResponse.json(
        { error: 'Failed to save curriculum selection' },
        { status: 500 }
      )
    }

    // Mark the curriculum selection task as completed
    const { error: taskError } = await supabase
      .from('pending_tasks')
      .update({ completed_at: new Date().toISOString() })
      .eq('related_entity_id', meetingId)
      .eq('task_type', 'select_curriculum')
      .eq('assigned_to', user.id)
      .is('completed_at', null)

    if (taskError) {
      console.error('Error marking task complete:', taskError)
      // Don't fail the request if task update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Curriculum selected successfully'
    })

  } catch (error) {
    console.error('Error in select-curriculum API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
