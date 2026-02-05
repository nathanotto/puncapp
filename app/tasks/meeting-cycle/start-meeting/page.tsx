import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StartMeetingSection from './StartMeetingSection';

interface StartMeetingPageProps {
  searchParams: Promise<{ meeting: string }>;
}

function combineDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

export default async function StartMeetingPage({ searchParams }: StartMeetingPageProps) {
  const params = await searchParams;
  const { meeting: meetingId } = params;

  if (!meetingId) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Meeting not specified</h1>
          <Link href="/" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Get user's name
  const { data: userData } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', user.id)
    .single();

  // Get meeting with chapter info
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      location,
      status,
      chapter_id,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('id', meetingId)
    .single();

  if (meetingError || !meeting) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Meeting not found</h1>
          <Link href="/" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Check user is leader or backup leader
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!membership || !['leader', 'backup_leader'].includes(membership.role)) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Access denied</h1>
          <p className="text-stone-gray mb-4">Only the Leader or Backup Leader can start the meeting.</p>
          <Link href="/" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Check meeting isn't already started
  if (meeting.status !== 'scheduled') {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Meeting already {meeting.status}</h1>
          <p className="text-stone-gray mb-4">This meeting has already been started.</p>
          <Link href={`/meetings/${meetingId}`} className="text-burnt-orange hover:underline">
            View Meeting
          </Link>
        </div>
      </div>
    );
  }

  // Get all attendance records (who's already checked in)
  const { data: attendanceList } = await supabase
    .from('attendance')
    .select(`
      id,
      user_id,
      checked_in_at,
      attendance_type,
      rsvp_status,
      users!attendance_user_id_fkey (
        id,
        name,
        username
      )
    `)
    .eq('meeting_id', meetingId);

  // Get chapter members for context
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select(`
      user_id,
      role,
      users!inner (
        id,
        name,
        username
      )
    `)
    .eq('chapter_id', meeting.chapter_id)
    .eq('is_active', true);

  // Identify who's checked in vs not
  const checkedInUserIds = new Set(
    attendanceList?.filter(a => a.checked_in_at).map(a => a.user_id) || []
  );

  const checkedInMembers = members?.filter(m => checkedInUserIds.has(m.user_id)) || [];
  const notCheckedInMembers = members?.filter(m => !checkedInUserIds.has(m.user_id)) || [];

  // Get RSVP info for not checked in members
  const notCheckedInWithRsvp = notCheckedInMembers.map(m => {
    const attendance = attendanceList?.find(a => a.user_id === m.user_id);
    return {
      ...m,
      rsvp_status: attendance?.rsvp_status || 'no_response',
      rsvp_reason: attendance?.rsvp_reason,
    };
  });

  // Categorize not checked in members by RSVP status
  const rsvpYesNotCheckedIn = notCheckedInWithRsvp.filter(m => m.rsvp_status === 'yes');
  const rsvpNoMembers = notCheckedInWithRsvp.filter(m => m.rsvp_status === 'no');
  const noResponseMembers = notCheckedInWithRsvp.filter(m => m.rsvp_status === 'no_response');

  // Calculate timing
  const now = new Date();
  const scheduledDateTime = combineDateAndTime(meeting.scheduled_date, meeting.scheduled_time);
  const minutesDiff = Math.round((now.getTime() - scheduledDateTime.getTime()) / 60000);
  const isLate = minutesDiff > 10;
  const minutesUntilMeeting = -minutesDiff; // Positive means in the future
  const isTooEarly = minutesUntilMeeting > 15;

  // Format how far in the future the meeting is
  let timeUntilText = '';
  if (isTooEarly) {
    const daysUntil = Math.floor(minutesUntilMeeting / (24 * 60));
    const hoursUntil = Math.floor(minutesUntilMeeting / 60);

    if (daysUntil >= 1) {
      timeUntilText = daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
    } else if (hoursUntil >= 1) {
      timeUntilText = `in ${hoursUntil} hour${hoursUntil > 1 ? 's' : ''}`;
    } else {
      timeUntilText = `in ${minutesUntilMeeting} minutes`;
    }
  }

  // Use the combined scheduledDateTime to avoid timezone issues
  const meetingDate = scheduledDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header */}
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <Link href="/" className="text-sm text-warm-cream/80 hover:text-warm-cream">
              ← Back to Dashboard
            </Link>
            <div className="text-right text-sm">
              <p className="text-warm-cream/80">{userData?.username || userData?.name || 'Member'}</p>
              <a href="/auth/logout" className="text-warm-cream/60 hover:text-warm-cream">
                Sign Out
              </a>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Start Meeting</h1>
          <p className="text-warm-cream/80">{meeting.chapters.name} • {meetingDate} at {meeting.scheduled_time}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-6">
        {/* Too early warning */}
        {isTooEarly && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-red-900 mb-3">⏰ Too Early to Start</h2>
            <p className="text-red-800 mb-2">
              This meeting is scheduled for <strong>{timeUntilText}</strong>.
            </p>
            <p className="text-red-700">
              Meetings can't start until <strong>15 minutes before</strong> the scheduled time.
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href={`/meetings/${meetingId}`}
                className="inline-block bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                View Meeting Details
              </Link>
              <Link
                href="/"
                className="inline-block bg-white text-red-600 border-2 border-red-600 py-2 px-4 rounded-lg font-semibold hover:bg-red-50 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Late warning */}
        {!isTooEarly && isLate && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-6">
            <p className="text-orange-900 font-medium">
              ⚠️ Meeting is starting {minutesDiff} minutes late. This will be noted.
            </p>
          </div>
        )}

        {/* Attendance and Start Meeting Section */}
        {!isTooEarly && (
          <StartMeetingSection
            meetingId={meetingId}
            initialAttendance={attendanceList || []}
            allMembers={members || []}
            currentUserId={user.id}
            isLate={isLate}
            minutesLate={minutesDiff}
          />
        )}
      </main>
    </div>
  );
}
