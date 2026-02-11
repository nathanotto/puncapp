import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import { BecomeContributingClient } from './BecomeContributingClient';

export default async function BecomeContributingPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task: taskId } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  if (!taskId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-earth-brown mb-4">Task not found</h1>
        <p className="text-stone-gray">No task ID provided.</p>
      </div>
    );
  }

  // Get task
  const { data: task } = await supabase
    .from('pending_tasks')
    .select(`
      id,
      task_type,
      status,
      related_entity_id,
      chapters!pending_tasks_related_entity_id_fkey (
        id,
        name
      )
    `)
    .eq('id', taskId)
    .eq('assigned_to', user.id)
    .eq('task_type', 'become_contributing_member')
    .single();

  if (!task) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-earth-brown mb-4">Task not found</h1>
        <p className="text-stone-gray">This task doesn't exist or isn't assigned to you.</p>
      </div>
    );
  }

  if (task.status !== 'pending') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-earth-brown mb-4">Task already completed</h1>
        <p className="text-stone-gray">You've already responded to this invitation.</p>
      </div>
    );
  }

  const chapter = normalizeJoin(task.chapters);

  return (
    <div className="min-h-screen bg-warm-cream py-12 px-6">
      <BecomeContributingClient
        taskId={task.id}
        chapterId={task.related_entity_id}
        chapterName={chapter?.name || 'Chapter'}
      />
    </div>
  );
}
