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

  const { chapterId, newRole } = await request.json();

  // Actually change the role in chapter_memberships
  await supabase
    .from('chapter_memberships')
    .update({ role: newRole })
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId);

  return NextResponse.json({ success: true, newRole });
}
