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

  const { meetingId, offset } = await request.json();

  // Calculate new date based on offset
  const now = new Date();
  let newDate: Date;

  switch (offset) {
    case 'now':
      newDate = now;
      break;
    case '+15min':
      newDate = new Date(now.getTime() + 15 * 60 * 1000);
      break;
    case '+1day':
      newDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case '+3days':
      newDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      break;
    case '+7days':
      newDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      return NextResponse.json({ error: 'Invalid offset' }, { status: 400 });
  }

  const dateStr = newDate.toISOString().split('T')[0];
  const timeStr = newDate.toTimeString().slice(0, 5);

  // Also update RSVP deadline to 2 days before
  const rsvpDeadline = new Date(newDate.getTime() - 2 * 24 * 60 * 60 * 1000);

  await supabase
    .from('meetings')
    .update({
      scheduled_date: dateStr,
      scheduled_time: timeStr,
      rsvp_deadline: rsvpDeadline.toISOString().split('T')[0],
    })
    .eq('id', meetingId);

  return NextResponse.json({
    success: true,
    newDate: `${dateStr} ${timeStr}`
  });
}
