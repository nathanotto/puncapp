import { createClient } from '@/lib/supabase/server';

export interface NewPendingTask {
  taskType: string;
  assignedTo: string;           // user id
  relatedEntityType: string;    // e.g., 'meeting', 'commitment'
  relatedEntityId: string;
  metadata?: Record<string, any>;
  dueAt?: Date;
}

export async function createPendingTasks(tasks: NewPendingTask[]) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pending_tasks')
    .insert(tasks.map(t => ({
      task_type: t.taskType,
      assigned_to: t.assignedTo,
      related_entity_type: t.relatedEntityType,
      related_entity_id: t.relatedEntityId,
      metadata: t.metadata || {},
      due_at: t.dueAt?.toISOString(),
    })))
    .select();

  if (error) throw error;
  return data;
}

export async function completeTask(taskId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('pending_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) throw error;
}

export async function getUserPendingTasks(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pending_tasks')
    .select('*')
    .eq('assigned_to', userId)
    .is('completed_at', null)
    .is('dismissed_at', null)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export function describeTask(task: { task_type: string; metadata?: any }): string {
  // Human-readable descriptions of downstream tasks
  const descriptions: Record<string, (meta: any) => string> = {
    'respond_to_rsvp': (m) => `RSVP request sent to member`,
    'confirm_commitment': (m) => `Confirmation request sent to ${m?.recipientName || 'recipient'}`,
    'review_application': (m) => `Application queued for leader review`,
    // Add more as we build tasks
  };

  const describer = descriptions[task.task_type];
  return describer ? describer(task.metadata) : `Task created: ${task.task_type}`;
}
