import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { accept } = body;

  // Get task
  const { data: task } = await supabase
    .from('pending_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('assigned_to', user.id)
    .eq('task_type', 'become_contributing_member')
    .single();

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status !== 'pending') {
    return NextResponse.json({ error: 'Task already completed' }, { status: 400 });
  }

  const chapterId = task.related_entity_id;

  try {
    if (accept) {
      // Update membership to contributing
      const { error: updateError } = await supabase
        .from('chapter_memberships')
        .update({
          is_contributing: true,
          became_contributing_at: new Date().toISOString(),
        })
        .eq('chapter_id', chapterId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    }

    // Mark task complete
    const { error: taskError } = await supabase
      .from('pending_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (taskError) throw taskError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing response:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
