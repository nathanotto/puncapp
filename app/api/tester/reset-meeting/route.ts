import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { meetingId } = await request.json();

  if (!meetingId) {
    return NextResponse.json({ success: false, error: 'Missing meetingId' });
  }

  const supabase = createServiceRoleClient();

  try {
    // Get meeting info
    const { data: meeting } = await supabase
      .from('meetings')
      .select('id, scheduled_date, chapter_id, chapters(id, name)')
      .eq('id', meetingId)
      .single();

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' });
    }

    const chapterId = meeting.chapter_id;

    // 1. Delete time logs
    await supabase
      .from('meeting_time_log')
      .delete()
      .eq('meeting_id', meetingId);

    // 2. Clear check-in timestamps
    await supabase
      .from('attendance')
      .update({ checked_in_at: null })
      .eq('meeting_id', meetingId);

    // 3. Delete curriculum responses
    await supabase
      .from('curriculum_responses')
      .delete()
      .eq('meeting_id', meetingId);

    // 4. Delete meeting feedback
    await supabase
      .from('meeting_feedback')
      .delete()
      .eq('meeting_id', meetingId);

    // 5. Get chapter leader to set as scribe
    const { data: leader } = await supabase
      .from('chapter_memberships')
      .select('user_id')
      .eq('chapter_id', chapterId)
      .eq('role', 'leader')
      .eq('is_active', true)
      .single();

    const scribeId = leader?.user_id || null;

    // 6. Reset meeting to scheduled state with current date/time
    const now = new Date();
    const nowISO = now.toISOString();
    const scheduledDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const scheduledTime = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM

    await supabase
      .from('meetings')
      .update({
        status: 'scheduled',
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        actual_start_time: null,
        completed_at: null,
        current_section: null,
        current_timer_user_id: null,
        current_timer_start: null,
        scribe_id: null,
        curriculum_ditched: false,
      })
      .eq('id', meetingId);

    return NextResponse.json({
      success: true,
      message: `Reset complete: Meeting scheduled for ${scheduledTime}, all progress cleared`
    });

  } catch (error: any) {
    console.error('Reset meeting error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
}
