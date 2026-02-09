import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  const { id, moduleId } = await params;
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
  const { order_in_sequence } = body;

  if (order_in_sequence === undefined) {
    return NextResponse.json({ error: 'order_in_sequence is required' }, { status: 400 });
  }

  // Update by link ID (moduleId is actually the link ID here)
  const { data, error } = await supabase
    .from('curriculum_module_sequences')
    .update({ order_in_sequence })
    .eq('id', moduleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating module order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  const { id, moduleId } = await params;
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

  // Delete by link ID (moduleId is actually the link ID here)
  const { error } = await supabase
    .from('curriculum_module_sequences')
    .delete()
    .eq('id', moduleId);

  if (error) {
    console.error('Error removing module from sequence:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
