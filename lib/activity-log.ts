import { createClient } from '@/lib/supabase/server';

interface LogActivityParams {
  actorId?: string | null;       // user ID, or null for system actions
  actorType?: 'user' | 'system' | 'admin' | 'cron';
  action: string;                // from the action names list
  entityType: string;            // 'meeting', 'chapter', 'user', 'commitment', 'funding'
  entityId: string;              // the UUID of the affected entity
  chapterId?: string | null;     // which chapter, if applicable
  summary: string;               // human-readable: "Mike checked in to Oak Chapter meeting"
  details?: Record<string, any>; // rich JSON blob
}

/**
 * Log an activity to the system-wide activity log.
 *
 * CRITICAL: This function must NEVER break the app or slow it down.
 * - Wrapped in try/catch - failures are logged but don't throw
 * - Can be called without await (fire and forget) for non-critical logs
 * - Use await only when you need to ensure the log is written before continuing
 *
 * @example Fire and forget (faster)
 * ```typescript
 * logActivity({
 *   actorId: userId,
 *   action: 'meeting.checkin',
 *   entityType: 'meeting',
 *   entityId: meetingId,
 *   chapterId: chapterId,
 *   summary: `${userName} checked in to ${chapterName} meeting`,
 * });
 * ```
 *
 * @example Await for critical actions
 * ```typescript
 * await logActivity({
 *   actorId: userId,
 *   action: 'meeting.closed',
 *   entityType: 'meeting',
 *   entityId: meetingId,
 *   chapterId: chapterId,
 *   summary: `${leaderName} closed ${chapterName} meeting`,
 *   details: { duration_minutes: 120, attendance: 8 }
 * });
 * ```
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('activity_log')
      .insert({
        actor_id: params.actorId || null,
        actor_type: params.actorType || 'user',
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        chapter_id: params.chapterId || null,
        summary: params.summary,
        details: params.details || {},
      });

    if (error) {
      // Log to console but don't throw — activity logging should never break the app
      console.error('Activity log write failed:', error);
    }
  } catch (err) {
    console.error('Activity log error:', err);
  }
}
