import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { meetingId } = await req.json();

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Missing meetingId' });
    }

    const supabase = createServiceRoleClient();

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' });
    }

    // Get all time logs
    const { data: timeLogs } = await supabase
      .from('meeting_time_log')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('start_time', { ascending: true });

    // Get all attendees
    const { data: attendees } = await supabase
      .from('attendance')
      .select('user_id, checked_in_at')
      .eq('meeting_id', meetingId)
      .not('checked_in_at', 'is', null);

    // Calculate lightning logs
    const lightningLogs = timeLogs?.filter(l => l.section === 'lightning_round' && l.user_id) || [];
    const fullCheckinLogs = timeLogs?.filter(l => l.section === 'full_checkins' && l.user_id) || [];

    // Get section-level logs
    const sectionLogs = timeLogs?.filter(l => !l.user_id) || [];

    const state = {
      meeting: {
        id: meeting.id,
        status: meeting.status,
        current_section: meeting.current_section,
        scribe_id: meeting.scribe_id,
        duration_minutes: meeting.duration_minutes,
      },
      attendees: {
        count: attendees?.length || 0,
        userIds: attendees?.map(a => a.user_id) || [],
      },
      sections: {
        current: meeting.current_section,
        sectionLogs: sectionLogs.map(s => ({
          section: s.section,
          start_time: s.start_time,
          end_time: s.end_time,
        })),
      },
      lightningRound: {
        completedCount: lightningLogs.length,
        expectedCount: attendees?.length || 0,
        isComplete: lightningLogs.length === attendees?.length,
        logs: lightningLogs.map(l => ({
          user_id: l.user_id,
          duration_seconds: l.duration_seconds,
          skipped: l.skipped,
          priority: l.priority,
        })),
      },
      fullCheckins: {
        completedCount: fullCheckinLogs.length,
        expectedCount: attendees?.length || 0,
        isComplete: fullCheckinLogs.length === attendees?.length,
        logs: fullCheckinLogs.map(l => ({
          user_id: l.user_id,
          duration_seconds: l.duration_seconds,
          skipped: l.skipped,
        })),
      },
    };

    return NextResponse.json({
      success: true,
      state,
    });
  } catch (error: any) {
    console.error('Error debugging meeting state:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
    });
  }
}
