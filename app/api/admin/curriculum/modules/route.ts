import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

  if (!title || !principle || !description || !reflective_question || !exercise) {
    return NextResponse.json(
      { error: 'All module content fields are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('curriculum_modules')
    .insert({
      title,
      principle,
      description,
      reflective_question,
      exercise,
      assignment_text: assignment_text || null,
      assignment_due_days: assignment_due_days || 14,
      is_meeting_only: is_meeting_only ?? true,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating module:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
