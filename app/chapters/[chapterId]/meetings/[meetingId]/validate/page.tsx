import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LeaderValidationClient from './LeaderValidationClient';

export default async function LeaderValidateMeetingPage({
  params,
}: {
  params: Promise<{ chapterId: string; meetingId: string }>;
}) {
  const { chapterId, meetingId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get meeting with validation status
  const { data: meeting } = await supabase
    .from('meetings')
    .select(`
      *,
      chapter:chapters(name),
      leader:users!meetings_leader_id_fkey(id, name),
      scribe:users!meetings_scribe_id_fkey(id, name)
    `)
    .eq('id', meetingId)
    .eq('chapter_id', chapterId)
    .single();

  if (!meeting) {
    redirect(`/chapters/${chapterId}`);
  }

  // Verify user is the chapter leader
  if (meeting.leader_id !== user.id) {
    redirect(`/chapters/${chapterId}`);
  }

  // Check validation status
  if (meeting.validation_status !== 'awaiting_leader') {
    redirect(`/meetings/${meetingId}/summary`);
  }

  // Get attendance
  const { data: attendance } = await supabase
    .from('meeting_attendance')
    .select(`
      *,
      user:users(id, name)
    `)
    .eq('meeting_id', meetingId)
    .order('checked_in_at');

  // Get time logs
  const { data: timeLogs } = await supabase
    .from('meeting_time_log')
    .select(`
      *,
      user:users(id, name)
    `)
    .eq('meeting_id', meetingId)
    .order('start_time');

  // Get curriculum info
  const { data: curriculumHistory } = await supabase
    .from('chapter_curriculum_history')
    .select(`
      *,
      module:curriculum_modules(id, title, principle)
    `)
    .eq('meeting_id', meetingId)
    .maybeSingle();

  // Get feedback
  const { data: feedback } = await supabase
    .from('meeting_feedback')
    .select(`
      *,
      user:users(id, name),
      most_value_user:users!meeting_feedback_most_value_user_id_fkey(id, name)
    `)
    .eq('meeting_id', meetingId);

  // Get recording info
  const { data: recording } = await supabase
    .from('meeting_recordings')
    .select('*')
    .eq('meeting_id', meetingId)
    .maybeSingle();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href={`/meetings/${meetingId}/summary`} className="text-blue-600 hover:underline">
          ← Back to Summary
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Validate Meeting</h1>
        <p className="text-gray-600">
          {meeting.chapter?.name} • {new Date(meeting.scheduled_start).toLocaleDateString()}
        </p>
      </div>

      <LeaderValidationClient
        meeting={meeting}
        attendance={attendance || []}
        timeLogs={timeLogs || []}
        curriculumHistory={curriculumHistory}
        feedback={feedback || []}
        recording={recording}
      />
    </div>
  );
}
