import { SupabaseClient } from '@supabase/supabase-js';

export async function generateRealisticMeetingData(
  supabase: SupabaseClient,
  meetingId: string,
  targetSection: string
) {
  // Get meeting and attendees
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, chapter_id, selected_curriculum_id')
    .eq('id', meetingId)
    .single();

  const { data: attendees } = await supabase
    .from('attendance')
    .select('user_id')
    .eq('meeting_id', meetingId)
    .not('checked_in_at', 'is', null);

  if (!meeting || !attendees) return;

  const userIds = attendees.map(a => a.user_id);
  const now = new Date();

  const sections = ['opening_meditation', 'opening_ethos', 'lightning_round', 'full_checkins', 'curriculum', 'closing'];
  const targetIndex = sections.indexOf(targetSection);

  // Generate data for all sections before target
  if (targetIndex >= 0) {
    // Opening meditation
    await supabase.from('meeting_time_log').upsert({
      meeting_id: meetingId,
      section: 'opening_meditation',
      start_time: now.toISOString(),
      end_time: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    }, { onConflict: 'meeting_id,section,user_id' });
  }

  if (targetIndex >= 1) {
    // Opening ethos
    await supabase.from('meeting_time_log').upsert({
      meeting_id: meetingId,
      section: 'opening_ethos',
      start_time: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      end_time: new Date(now.getTime() + 8 * 60 * 1000).toISOString(),
    }, { onConflict: 'meeting_id,section,user_id' });
  }

  if (targetIndex >= 2) {
    // Lightning round - generate for each user
    let timeOffset = 8 * 60 * 1000;
    for (let i = 0; i < userIds.length; i++) {
      const duration = 45 + Math.floor(Math.random() * 30);
      const startTime = new Date(now.getTime() + timeOffset);

      await supabase.from('meeting_time_log').upsert({
        meeting_id: meetingId,
        section: 'lightning_round',
        user_id: userIds[i],
        start_time: startTime.toISOString(),
        end_time: new Date(startTime.getTime() + duration * 1000).toISOString(),
        duration_seconds: duration,
        overtime_seconds: Math.max(0, duration - 60),
        priority: i < Math.ceil(userIds.length / 3) ? 1 : 2,
        skipped: false,
      }, { onConflict: 'meeting_id,section,user_id' });

      timeOffset += duration * 1000 + 3000;
    }
  }

  if (targetIndex >= 3) {
    // Full check-ins
    let timeOffset = 30 * 60 * 1000;
    for (let i = 0; i < userIds.length; i++) {
      const duration = 300 + Math.floor(Math.random() * 300);
      const startTime = new Date(now.getTime() + timeOffset);

      await supabase.from('meeting_time_log').upsert({
        meeting_id: meetingId,
        section: 'full_checkins',
        user_id: userIds[i],
        start_time: startTime.toISOString(),
        end_time: new Date(startTime.getTime() + duration * 1000).toISOString(),
        duration_seconds: duration,
        overtime_seconds: Math.max(0, duration - 420),
        stretch_goal_action: ['kept', 'completed', 'new', 'none'][i % 4],
        requested_support: i === 2,
        skipped: false,
      }, { onConflict: 'meeting_id,section,user_id' });

      timeOffset += duration * 1000 + 5000;
    }
  }

  if (targetIndex >= 4 && meeting.selected_curriculum_id) {
    // Curriculum responses
    for (const userId of userIds) {
      await supabase.from('curriculum_responses').upsert({
        user_id: userId,
        meeting_id: meetingId,
        module_id: meeting.selected_curriculum_id,
        response: `Generated test response for curriculum reflection.`,
      }, { onConflict: 'meeting_id,module_id,user_id' });
    }
  }
}
