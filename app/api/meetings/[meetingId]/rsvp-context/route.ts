import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({
      authorized: false,
      reason: 'Authentication required',
    });
  }

  // Get user's name
  const { data: userData } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', user.id)
    .single();

  const { meetingId } = await params;

  // Fetch meeting with chapter info
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      location,
      rsvp_deadline,
      chapter_id,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('id', meetingId)
    .single();

  if (meetingError || !meeting) {
    console.error('Meeting fetch error:', meetingError);
    return NextResponse.json({
      authorized: false,
      reason: `Meeting not found: ${meetingError?.message || 'Unknown error'}`,
    });
  }

  // Check if user is a member of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('id')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!membership) {
    return NextResponse.json({
      authorized: false,
      reason: 'You are not a member of this chapter',
    });
  }

  // Fetch current attendance record (if exists)
  const { data: attendance } = await supabase
    .from('attendance')
    .select('rsvp_status, rsvp_reason')
    .eq('meeting_id', meetingId)
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({
    authorized: true,
    currentUserName: userData?.username || userData?.name || 'Member',
    meeting: {
      id: meeting.id,
      scheduled_date: meeting.scheduled_date,
      scheduled_time: meeting.scheduled_time,
      location: meeting.location,
      rsvp_deadline: meeting.rsvp_deadline,
      chapter: meeting.chapters,
    },
    currentRsvp: attendance || null,
  });
}
