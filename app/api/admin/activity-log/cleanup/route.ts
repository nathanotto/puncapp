import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cleanupOldActivityLogs } from '@/lib/activity-log-cleanup';

export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_punc_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await cleanupOldActivityLogs();

  return NextResponse.json({
    success: true,
    deleted: result.deleted,
    message: `Deleted ${result.deleted} activity log entries older than 12 months`,
  });
}
