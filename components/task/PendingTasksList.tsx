import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUserPendingTasks } from '@/lib/task-queue';

interface PendingTasksListProps {
  userId: string;
}

function getTaskUrl(taskType: string, relatedEntityId: string, taskId?: string): string {
  // Map task types to their URLs
  // We'll expand this as we build more tasks
  const urlMap: Record<string, (id: string, taskId?: string) => string> = {
    'respond_to_rsvp': (id) => `/tasks/meeting-cycle/respond-to-rsvp?meeting=${id}`,
    'contact_unresponsive_member': (id, tid) => `/tasks/meeting-cycle/contact-unresponsive-member?attendance=${id}&task=${tid}`,
    'check_in_to_meeting': (id) => `/tasks/meeting-cycle/check-in?meeting=${id}`,
    'start_meeting': (id) => `/tasks/meeting-cycle/start-meeting?meeting=${id}`,
    'select_curriculum': (id) => `/tasks/meeting-cycle/select-curriculum?meeting=${id}`,
    'confirm_commitment': (id) => `/tasks/confirm-commitment/${id}`,
    'review_application': (id) => `/tasks/review-application/${id}`,
  };

  const urlBuilder = urlMap[taskType];
  return urlBuilder ? urlBuilder(relatedEntityId, taskId) : `/tasks/${taskType}/${relatedEntityId}`;
}

function formatTaskType(taskType: string): string {
  // Convert snake_case to Title Case
  return taskType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDueDate(dueAt: string | null): string | null {
  if (!dueAt) return null;

  const date = new Date(dueAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    // Task is overdue - show how long
    const overdueDiffMs = Math.abs(diffMs);
    const totalSeconds = Math.floor(overdueDiffMs / 1000);

    const overdueDays = Math.floor(totalSeconds / (24 * 60 * 60));
    const overdueHours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const overdueMinutes = Math.floor((totalSeconds % (60 * 60)) / 60);

    if (overdueDays > 0) {
      return `Overdue ${overdueDays}d`;
    } else if (overdueHours > 0) {
      return `Overdue ${overdueHours}h`;
    } else if (overdueMinutes > 0) {
      return `Overdue ${overdueMinutes}m`;
    } else {
      return 'Overdue';
    }
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else if (diffDays < 7) {
    return `Due in ${diffDays} days`;
  } else {
    return date.toLocaleDateString();
  }
}

export default async function PendingTasksList({ userId }: PendingTasksListProps) {
  const tasks = await getUserPendingTasks(userId);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h3 className="text-xl font-semibold text-earth-brown mb-2">
          No pending tasks
        </h3>
        <p className="text-stone-gray">
          Nice! You're all caught up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const dueDate = formatDueDate(task.due_at);
        const isOverdue = dueDate?.startsWith('Overdue') || false;
        const urgency = task.urgency || 'normal';

        // Determine styling based on urgency
        const urgencyStyles = {
          normal: 'bg-white border-gray-200',
          reminded: 'bg-orange-50 border-orange-300 border-2',
          escalated: 'bg-orange-100 border-orange-500 border-2',
        };

        const urgencyBadge = {
          normal: null,
          reminded: (
            <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded font-medium">
              Texted & Emailed
            </span>
          ),
          escalated: (
            <span className="text-xs bg-orange-300 text-orange-900 px-2 py-1 rounded font-medium">
              Leader Reaching Out
            </span>
          ),
        };

        return (
          <Link
            key={task.id}
            href={getTaskUrl(task.task_type, task.related_entity_id, task.id)}
            className={`block rounded-lg p-4 hover:shadow-md transition-shadow border ${urgencyStyles[urgency as keyof typeof urgencyStyles]}`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-earth-brown">
                    {formatTaskType(task.task_type)}
                  </h3>
                  {urgencyBadge[urgency as keyof typeof urgencyBadge]}
                </div>
                <p className="text-sm text-stone-gray">
                  {task.related_entity_type} • {task.related_entity_id.slice(0, 8)}
                </p>
              </div>

              {dueDate && (
                <div
                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                    isOverdue
                      ? 'bg-red-100 text-red-700'
                      : 'bg-burnt-orange/10 text-burnt-orange'
                  }`}
                >
                  {dueDate}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
