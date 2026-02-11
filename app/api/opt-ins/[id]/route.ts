import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/opt-ins/[id] - Get opt-in details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: optIn, error } = await supabase
    .from('member_opt_ins')
    .select(`
      *,
      users!member_opt_ins_user_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!optIn) {
    return NextResponse.json({ error: 'Opt-in not found' }, { status: 404 });
  }

  // Only the user or admins can view
  if (optIn.user_id !== user.id) {
    const { data: userData } = await supabase
      .from('users')
      .select('is_punc_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_punc_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({ optIn });
}
