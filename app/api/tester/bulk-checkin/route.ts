import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { meetingId } = await request.json();

  if (!meetingId) {
    return NextResponse.json({ error: 'Missing meetingId' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  try {
    // Get meeting and chapter info
    const { data: meeting } = await supabase
      .from('meetings')
      .select('id, chapter_id, status')
      .eq('id', meetingId)
      .single();

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' });
    }

    // Get all active chapter members
    const { data: members } = await supabase
      .from('chapter_memberships')
      .select('user_id')
      .eq('chapter_id', meeting.chapter_id)
      .eq('is_active', true);

    if (!members || members.length === 0) {
      return NextResponse.json({ success: false, error: 'No members found' });
    }

    // Check in all members
    const now = new Date().toISOString();
    const attendanceRecords = members.map(m => ({
      meeting_id: meetingId,
      user_id: m.user_id,
      checked_in_at: now,
      attendance_type: 'in_person' as const,
    }));

    const { error } = await supabase
      .from('attendance')
      .upsert(attendanceRecords, {
        onConflict: 'meeting_id,user_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Bulk check-in error:', error);
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({
      success: true,
      count: members.length,
      message: `Checked in ${members.length} members`
    });

  } catch (error: any) {
    console.error('Bulk check-in error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
}
