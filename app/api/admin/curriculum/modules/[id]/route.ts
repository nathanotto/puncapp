import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { data, error } = await supabase
    .from('curriculum_modules')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const {
    title,
    principle,
    description,
    reflective_question,
    exercise,
    assignment_text,
    assignment_due_days,
    is_meeting_only,
    is_active,
  } = body;

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (principle !== undefined) updates.principle = principle;
  if (description !== undefined) updates.description = description;
  if (reflective_question !== undefined) updates.reflective_question = reflective_question;
  if (exercise !== undefined) updates.exercise = exercise;
  if (assignment_text !== undefined) updates.assignment_text = assignment_text;
  if (assignment_due_days !== undefined) updates.assignment_due_days = assignment_due_days;
  if (is_meeting_only !== undefined) updates.is_meeting_only = is_meeting_only;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('curriculum_modules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating module:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Deactivate instead of delete to preserve data integrity
  const { data, error } = await supabase
    .from('curriculum_modules')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error deactivating module:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
