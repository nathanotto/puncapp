import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_tester')
    .eq('id', user.id)
    .single();

  if (!userData?.is_tester) {
    return NextResponse.json({ error: 'Not a tester' }, { status: 403 });
  }

  const { meetingId, durationSeconds } = await request.json();

  // Get current meeting section and current person in queue
  const { data: meeting } = await supabase
    .from('meetings')
    .select('current_section')
    .eq('id', meetingId)
    .single();

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  // Find the next person who hasn't gone yet
  const { data: timeLogs } = await supabase
    .from('meeting_time_log')
    .select('user_id')
    .eq('meeting_id', meetingId)
    .eq('section', meeting.current_section);

  const completedUserIds = new Set(timeLogs?.map(l => l.user_id) || []);

  const { data: attendees } = await supabase
    .from('attendance')
    .select('user_id')
    .eq('meeting_id', meetingId)
    .not('checked_in_at', 'is', null);

  const nextPerson = attendees?.find(a => !completedUserIds.has(a.user_id));

  if (!nextPerson) {
    return NextResponse.json({ error: 'No one left in queue' }, { status: 400 });
  }

  // Calculate overtime if applicable
  const allottedSeconds = meeting.current_section === 'lightning_round' ? 60 : 600; // 1 min or 10 min
  const overtimeSeconds = Math.max(0, durationSeconds - allottedSeconds);

  const now = new Date();
  const startTime = new Date(now.getTime() - durationSeconds * 1000);

  // Insert time log
  await supabase.from('meeting_time_log').insert({
    meeting_id: meetingId,
    section: meeting.current_section,
    user_id: nextPerson.user_id,
    start_time: startTime.toISOString(),
    end_time: now.toISOString(),
    duration_seconds: durationSeconds,
    overtime_seconds: overtimeSeconds,
    priority: meeting.current_section === 'lightning_round' ? (Math.random() > 0.5 ? 1 : 2) : null,
    skipped: false,
  });

  return NextResponse.json({ success: true, userId: nextPerson.user_id, durationSeconds });
}
