import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateRealisticMeetingData } from '@/lib/tester/generate-data';

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

  const { meetingId, section, generateData } = await request.json();

  if (generateData) {
    await generateRealisticMeetingData(supabase, meetingId, section);
  }

  // Update meeting section
  await supabase
    .from('meetings')
    .update({ current_section: section })
    .eq('id', meetingId);

  return NextResponse.json({ success: true, section });
}
