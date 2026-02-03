import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PendingTasksList from '@/components/task/PendingTasksList';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Get user's profile from public.users
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get user's chapter memberships
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select('chapter_id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const userChapterIds = memberships?.map(m => m.chapter_id) || [];

  // Get in-progress meetings
  const { data: inProgressMeetings } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      location,
      actual_start_time,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('status', 'in_progress')
    .in('chapter_id', userChapterIds);

  // Get upcoming meetings (next 7 days)
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: upcomingMeetings } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      location,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('status', 'scheduled')
    .in('chapter_id', userChapterIds)
    .gte('scheduled_date', today)
    .lte('scheduled_date', sevenDaysFromNow)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header */}
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-end mb-4">
            <div className="text-right text-sm">
              <p className="text-warm-cream/80">{profile?.username || profile?.name || 'Member'}</p>
              <a href="/auth/logout" className="text-warm-cream/60 hover:text-warm-cream">
                Sign Out
              </a>
            </div>
          </div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-warm-cream/80">Welcome back, {profile?.name || 'Member'}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-6">
        {/* In-Progress Meetings Banner */}
        {inProgressMeetings && inProgressMeetings.length > 0 && (
          <div className="mb-8">
            {inProgressMeetings.map(meeting => {
              const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
              const startedAt = meeting.actual_start_time
                ? new Date(meeting.actual_start_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })
                : null;

              return (
                <div key={meeting.id} className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                        <h2 className="text-xl font-bold text-green-900">Meeting In Progress</h2>
                      </div>
                      <p className="text-green-800 font-semibold mb-1">{meeting.chapters.name}</p>
                      <p className="text-green-700 text-sm">
                        Started at {startedAt} • {meeting.location}
                      </p>
                    </div>
                    <a
                      href={`/meetings/${meeting.id}`}
                      className="bg-green-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      Join Meeting
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upcoming Meetings */}
        {upcomingMeetings && upcomingMeetings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-earth-brown mb-4">Upcoming Meetings</h2>
            <div className="space-y-4">
              {upcomingMeetings.map(meeting => {
                const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
                const dateStr = meetingDateTime.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                });
                const timeStr = meetingDateTime.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });

                // Check if check-in window is open (15 min before meeting)
                const now = new Date();
                const checkInWindowStart = new Date(meetingDateTime.getTime() - 15 * 60 * 1000);
                const canCheckIn = now >= checkInWindowStart;

                return (
                  <div key={meeting.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-earth-brown">{meeting.chapters.name}</h3>
                        <p className="text-sm text-stone-gray">
                          {dateStr} at {timeStr}
                        </p>
                        <p className="text-sm text-stone-gray">{meeting.location}</p>
                      </div>
                      <div className="flex gap-2">
                        {canCheckIn && (
                          <a
                            href={`/tasks/meeting-cycle/check-in?meeting=${meeting.id}`}
                            className="bg-burnt-orange text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-burnt-orange/90 transition-colors"
                          >
                            Check In
                          </a>
                        )}
                        <a
                          href={`/meetings/${meeting.id}`}
                          className="bg-gray-100 text-earth-brown py-2 px-4 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Tasks */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-earth-brown mb-4">Pending Tasks</h2>
          <PendingTasksList userId={user.id} />
        </div>
      </main>
    </div>
  );
}
