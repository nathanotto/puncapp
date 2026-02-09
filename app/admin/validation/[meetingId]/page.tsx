import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminValidationClient from './AdminValidationClient';

export default async function AdminReviewMeetingPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const supabase = await createClient();

  // Check admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_punc_admin) {
    redirect('/');
  }

  // Get meeting with all related data
  const { data: meeting } = await supabase
    .from('meetings')
    .select(`
      *,
      chapter:chapters(id, name),
      leader:users!meetings_leader_id_fkey(id, name),
      scribe:users!meetings_scribe_id_fkey(id, name)
    `)
    .eq('id', meetingId)
    .single();

  if (!meeting) {
    redirect('/admin/validation');
  }

  // Check validation status
  if (meeting.validation_status !== 'awaiting_admin') {
    redirect('/admin/validation');
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

  // Get RSVPs for comparison
  const { data: rsvps } = await supabase
    .from('meeting_rsvps')
    .select('user_id, response')
    .eq('meeting_id', meetingId)
    .eq('response', 'yes');

  // Get time logs
  const { data: timeLogs } = await supabase
    .from('meeting_time_log')
    .select(`
      *,
      user:users(id, name)
    `)
    .eq('meeting_id', meetingId)
    .order('start_time');

  // Get curriculum info and responses
  const { data: curriculumHistory } = await supabase
    .from('chapter_curriculum_history')
    .select(`
      *,
      module:curriculum_modules(id, title, principle)
    `)
    .eq('meeting_id', meetingId)
    .maybeSingle();

  const { data: curriculumResponses } = await supabase
    .from('curriculum_responses')
    .select(`
      *,
      user:users(id, name)
    `)
    .eq('meeting_id', meetingId);

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
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/validation" className="text-blue-600 hover:underline">
          ← Back to Validation Queue
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Review Meeting</h1>
        <p className="text-gray-600">
          {meeting.chapter?.name} • {new Date(meeting.scheduled_start).toLocaleDateString()}
        </p>
      </div>

      <AdminValidationClient
        meeting={meeting}
        attendance={attendance || []}
        rsvpCount={rsvps?.length || 0}
        timeLogs={timeLogs || []}
        curriculumHistory={curriculumHistory}
        curriculumResponses={curriculumResponses || []}
        feedback={feedback || []}
        recording={recording}
        adminUserId={user.id}
      />
    </div>
  );
}
