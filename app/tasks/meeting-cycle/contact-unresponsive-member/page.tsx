import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import ContactActionsClient from './ContactActionsClient';

export default async function ContactUnresponsiveMemberPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Get user's name and chapter info
  const { data: userData } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', user.id)
    .single();

  // Get user's chapter memberships
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select(`
      chapter_id,
      role,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true);

  const firstMembership = memberships && memberships.length > 0 ? memberships[0] : null;
  const firstChapter = firstMembership ? normalizeJoin(firstMembership.chapters) : null;
  const userName = userData?.username || userData?.name || 'Member';

  // Get all contact_unresponsive_member tasks for this user
  const { data: tasks } = await supabase
    .from('pending_tasks')
    .select('*')
    .eq('assigned_to', user.id)
    .eq('task_type', 'contact_unresponsive_member')
    .is('completed_at', null);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex min-h-screen bg-warm-cream">
        <Sidebar
          userName={userName}
          chapterId={firstChapter?.id}
          chapterName={firstChapter?.name}
        />
        <main className="flex-1 py-8 px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-earth-brown mb-4">No Contact Tasks</h1>
            <p className="text-stone-gray mb-4">All members have responded to their RSVPs.</p>
            <Link href="/" className="text-burnt-orange hover:underline">
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Load attendance and member data for each task
  const holdoutsData = await Promise.all(
    tasks.map(async (task) => {
      const attendanceId = task.related_entity_id;

      // Get attendance record
      const { data: attendance } = await supabase
        .from('attendance')
        .select('id, user_id, meeting_id, rsvp_status, reminder_sent_at')
        .eq('id', attendanceId)
        .single();

      if (!attendance) return null;

      // Get member info
      const { data: member } = await supabase
        .from('users')
        .select('id, name, username, phone')
        .eq('id', attendance.user_id)
        .single();

      // Get meeting info
      const { data: meeting } = await supabase
        .from('meetings')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          location,
          chapters (
            id,
            name
          )
        `)
        .eq('id', attendance.meeting_id)
        .single();

      return {
        taskId: task.id,
        attendanceId: attendance.id,
        member,
        meeting,
        reminderSentAt: attendance.reminder_sent_at,
      };
    })
  );

  // Filter out any null results and ensure member and meeting are not null
  const holdouts = holdoutsData.filter(h => h !== null && h.member !== null && h.meeting !== null) as any;

  if (holdouts.length === 0) {
    return (
      <div className="flex min-h-screen bg-warm-cream">
        <Sidebar
          userName={userName}
          chapterId={firstChapter?.id}
          chapterName={firstChapter?.name}
        />
        <main className="flex-1 py-8 px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-earth-brown mb-4">Contact Tasks</h1>
            <p className="text-stone-gray mb-4">Unable to load member data.</p>
            <Link href="/" className="text-burnt-orange hover:underline">
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const meeting = holdouts[0]?.meeting;
  if (!meeting) {
    return (
      <div className="flex min-h-screen bg-warm-cream">
        <Sidebar
          userName={userName}
          chapterId={firstChapter?.id}
          chapterName={firstChapter?.name}
        />
        <main className="flex-1 py-8 px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-earth-brown mb-4">Contact Tasks</h1>
            <p className="text-stone-gray mb-4">Unable to load meeting data.</p>
            <Link href="/" className="text-burnt-orange hover:underline">
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const meetingChapter = normalizeJoin(meeting.chapters);
  const chapterName = meetingChapter?.name || 'Chapter';
  const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
  const meetingDate = meetingDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex min-h-screen bg-warm-cream">
      <Sidebar
        userName={userName}
        chapterId={firstChapter?.id}
        chapterName={firstChapter?.name}
      />

      <main className="flex-1 py-8 px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="text-burnt-orange hover:underline text-sm mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-earth-brown mb-2">Contact RSVP Holdouts</h1>
            <p className="text-stone-gray">{chapterName} meeting on {meetingDate}</p>
          </div>

          {/* Context Banner */}
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-orange-900 mb-3">Situation</h2>
            <ul className="space-y-2 text-orange-800">
              <li>• {holdouts.length} member{holdouts.length > 1 ? 's' : ''} haven't responded to the RSVP for the upcoming meeting</li>
              <li>• As a leader, please reach out to check in with them</li>
            </ul>
          </div>

          {/* Meeting Details */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Meeting Details</h2>
            <div className="space-y-2 text-stone-gray">
              <p><strong className="text-earth-brown">Chapter:</strong> {chapterName}</p>
              <p><strong className="text-earth-brown">Date:</strong> {meetingDate}</p>
              <p><strong className="text-earth-brown">Time:</strong> {meeting.scheduled_time}</p>
              <p><strong className="text-earth-brown">Location:</strong> {meeting.location}</p>
            </div>
          </div>

          {/* Holdouts List */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-earth-brown mb-6">Members to Contact</h2>

            <ContactActionsClient holdouts={holdouts} />
          </div>
        </div>
      </main>
    </div>
  );
}
