import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  // Check admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_punc_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { module_id, order_in_sequence } = body;

  if (!module_id) {
    return NextResponse.json({ error: 'module_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('curriculum_module_sequences')
    .insert({
      sequence_id: params.id,
      module_id,
      order_in_sequence: order_in_sequence || 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding module to sequence:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
