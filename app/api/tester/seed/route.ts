import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { NextResponse } from 'next/server';
import { runSeedState } from '@/lib/tester/seed-states';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is tester
  const { data: userData } = await supabase
    .from('users')
    .select('is_tester')
    .eq('id', user.id)
    .single();

  if (!userData?.is_tester) {
    return NextResponse.json({ error: 'Not a tester' }, { status: 403 });
  }

  const { state } = await request.json();

  try {
    // Use service role client for seeding to bypass RLS
    const serviceRoleClient = createServiceRoleClient();
    await runSeedState(serviceRoleClient, state);
    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
