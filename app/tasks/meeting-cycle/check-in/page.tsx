import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CheckInForm from './CheckInForm';

interface CheckInPageProps {
  searchParams: Promise<{ meeting: string }>;
}

function combineDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

function isCheckInWindowOpen(meeting: any): { open: boolean; reason?: string } {
  const now = new Date();
  const meetingDateTime = combineDateAndTime(meeting.scheduled_date, meeting.scheduled_time);
  const windowStart = new Date(meetingDateTime.getTime() - 15 * 60 * 1000); // 15 min before

  if (now < windowStart) {
    const openTime = windowStart.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return {
      open: false,
      reason: `Check-in opens at ${openTime}`
    };
  }

  if (meeting.status === 'completed' || meeting.status === 'cancelled') {
    return {
      open: false,
      reason: 'This meeting has ended'
    };
  }

  return { open: true };
}

export default async function CheckInPage({ searchParams }: CheckInPageProps) {
  const params = await searchParams;
  const { meeting: meetingId } = params;

  if (!meetingId) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-2xl mx-auto">
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
      actual_start_time,
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
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Meeting not found</h1>
          <Link href="/" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Check user is member of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!membership) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Access denied</h1>
          <p className="text-stone-gray mb-4">You are not a member of this chapter.</p>
          <Link href="/" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Get user's current attendance record
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('meeting_id', meetingId)
    .eq('user_id', user.id)
    .single();

  const alreadyCheckedIn = attendance?.checked_in_at != null;
  const window = isCheckInWindowOpen(meeting);

  // Combine date and time to avoid timezone issues
  const meetingDateTime = combineDateAndTime(meeting.scheduled_date, meeting.scheduled_time);
  const meetingDate = meetingDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const meetingInProgress = meeting.status === 'in_progress';

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header */}
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-2xl mx-auto">
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
          <h1 className="text-3xl font-bold mb-2">Check In to Meeting</h1>
          <p className="text-warm-cream/80">{meeting.chapters.name} • {meetingDate} at {meeting.scheduled_time}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-8 px-6">
        {/* Meeting Status */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Meeting Details</h2>
          <div className="space-y-2 text-stone-gray">
            <p>
              <strong className="text-earth-brown">Status:</strong>{' '}
              <span className={`font-medium ${meetingInProgress ? 'text-green-600' : 'text-orange-600'}`}>
                {meetingInProgress ? 'In Progress' : 'Scheduled'}
              </span>
            </p>
            <p><strong className="text-earth-brown">Date:</strong> {meetingDate}</p>
            <p><strong className="text-earth-brown">Time:</strong> {meeting.scheduled_time}</p>
            <p><strong className="text-earth-brown">Location:</strong> {meeting.location}</p>
          </div>
        </div>

        {/* Already Checked In */}
        {alreadyCheckedIn && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-green-900 mb-2">You're checked in</h2>
            <p className="text-green-800 mb-3">
              You checked in at {new Date(attendance.checked_in_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </p>
            <p className="text-green-700">
              <strong>Type:</strong> {attendance.attendance_type === 'in_person' ? 'In Person' : 'Video'}
            </p>
          </div>
        )}

        {/* Check-in Form */}
        {!alreadyCheckedIn && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Check In</h2>

            {!window.open ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                <p className="text-orange-800 font-medium">{window.reason}</p>
              </div>
            ) : (
              <>
                <p className="text-stone-gray mb-6">
                  {meetingInProgress
                    ? 'Welcome, brother. The meeting is in progress.'
                    : 'Let us know you\'re here. The Leader will start the meeting shortly.'}
                </p>

                <CheckInForm meetingId={meetingId} />
              </>
            )}
          </div>
        )}

        {/* Already checked in - option to change type */}
        {alreadyCheckedIn && window.open && (
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-earth-brown mb-3">Change Check-in Type</h3>
            <p className="text-sm text-stone-gray mb-4">
              Need to update how you're attending?
            </p>
            <CheckInForm meetingId={meetingId} isUpdate={true} />
          </div>
        )}
      </main>
    </div>
  );
}
