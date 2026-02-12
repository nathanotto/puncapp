import { createClient } from '@/lib/supabase/server';

/**
 * Delete activity log entries older than 12 months.
 * Run this monthly via cron or manual admin trigger.
 */
export async function cleanupOldActivityLogs(): Promise<{ deleted: number }> {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 12);

  const { data, error } = await supabase
    .from('activity_log')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error('Activity log cleanup failed:', error);
    return { deleted: 0 };
  }

  return { deleted: data?.length || 0 };
}
