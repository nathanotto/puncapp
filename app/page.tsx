import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import PendingTasksList from '@/components/task/PendingTasksList';
import { DeleteMeetingButton } from '@/components/meeting/DeleteMeetingButton';
import { RescheduleMeetingButton } from '@/components/meeting/RescheduleMeetingButton';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function HomePage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Get user's name, admin status, and leader certification
  const { data: userData } = await supabase
    .from('users')
    .select('name, username, is_punc_admin, is_leader_certified')
    .eq('id', user.id)
    .single();

  // Get user's chapter memberships with roles and chapter info
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select(`
      chapter_id,
      role,
      chapters!inner (
        id,
        name,
        status
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true);

  const userChapterIds = memberships?.map(m => m.chapter_id) || [];

  // Create a map of chapter_id -> role for easy lookup
  const userChapterRoles = new Map(memberships?.map(m => [m.chapter_id, m.role]) || []);

  const userName = userData?.name || userData?.username || 'Member'
  const isAdmin = userData?.is_punc_admin || false
  const isLeaderCertified = userData?.is_leader_certified || false

  // Select primary chapter - prioritize open chapters, then leader roles
  const firstMembership = memberships && memberships.length > 0
    ? memberships.sort((a, b) => {
        const aChapter = normalizeJoin(a.chapters)
        const bChapter = normalizeJoin(b.chapters)

        // Prioritize open chapters over closed
        if (aChapter?.status === 'open' && bChapter?.status !== 'open') return -1
        if (bChapter?.status === 'open' && aChapter?.status !== 'open') return 1

        // Then prioritize leader/backup_leader roles
        const leaderRoles = ['leader', 'backup_leader']
        const aIsLeader = leaderRoles.includes(a.role)
        const bIsLeader = leaderRoles.includes(b.role)
        if (aIsLeader && !bIsLeader) return -1
        if (bIsLeader && !aIsLeader) return 1

        return 0
      })[0]
    : null
  const firstChapter = firstMembership ? normalizeJoin(firstMembership.chapters) : null

  // Helper function to format role display
  const formatRole = (role: string) => {
    if (role === 'leader') return 'Leader'
    if (role === 'backup_leader') return 'Backup Leader'
    return 'Member'
  }

  // Get in-progress meetings (actually started and not completed)
  const { data: inProgressMeetings } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      location,
      actual_start_time,
      completed_at,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('status', 'in_progress')
    .in('chapter_id', userChapterIds)
    .is('completed_at', null);

  // Get upcoming meetings (next 7 days)
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: allScheduledMeetings } = await supabase
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
    .eq('status', 'scheduled')
    .in('chapter_id', userChapterIds)
    .is('actual_start_time', null)
    .gte('scheduled_date', today)
    .lte('scheduled_date', sevenDaysFromNow)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  // Get user's attendance for these meetings
  const scheduledMeetingIds = allScheduledMeetings?.map(m => m.id) || [];
  const { data: userAttendance } = await supabase
    .from('attendance')
    .select('meeting_id, checked_in_at')
    .eq('user_id', user.id)
    .in('meeting_id', scheduledMeetingIds);

  // Create a map of meeting_id -> checked_in_at
  const attendanceMap = new Map(userAttendance?.map(a => [a.meeting_id, a.checked_in_at]) || []);

  // Separate meetings into "In Progress" (time has started) and "Upcoming" (time hasn't started)
  const now = new Date();
  const meetingsStartedNotInProgress: any[] = [];
  const upcomingMeetings: any[] = [];

  allScheduledMeetings?.forEach(meeting => {
    const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
    if (now >= meetingDateTime) {
      meetingsStartedNotInProgress.push(meeting);
    } else {
      upcomingMeetings.push(meeting);
    }
  });

  // Get all past meetings (completed, incomplete, never_started, timed_out)
  const { data: pastMeetings } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      completed_at,
      status,
      chapters!inner (
        id,
        name
      )
    `)
    .in('status', ['completed', 'incomplete', 'never_started', 'timed_out'])
    .in('chapter_id', userChapterIds)
    .order('scheduled_date', { ascending: false })
    .order('scheduled_time', { ascending: false });

  // Get pending opt-ins for this user
  const { data: pendingOptIns } = await supabase
    .from('member_opt_ins')
    .select(`
      id,
      opt_in_type,
      proposed_assignment,
      notified_at,
      request:chapter_lifecycle_requests!inner (
        id,
        request_type,
        request_data,
        chapter_id,
        chapters (id, name)
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('notified_at', { ascending: false });

  return (
    <div className="flex min-h-screen bg-warm-cream">
      <Sidebar
        userName={userName}
        chapterId={firstChapter?.id}
        chapterName={firstChapter?.name}
        isAdmin={isAdmin}
        isLeaderCertified={isLeaderCertified}
      />

      {/* Main content */}
      <main className="flex-1 py-8 px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-earth-brown mb-2">Dashboard</h1>
          <p className="text-stone-gray mb-8">Welcome back, {userData?.name || 'Member'}</p>

        {/* Pending Opt-Ins / Invitations */}
        {pendingOptIns && pendingOptIns.length > 0 && (
          <div className="mb-8">
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔔</span>
                <h2 className="text-xl font-bold text-blue-900">
                  You have {pendingOptIns.length} pending chapter {pendingOptIns.length === 1 ? 'invitation' : 'invitations'}
                </h2>
              </div>
              <div className="space-y-3">
                {pendingOptIns.map((optIn) => {
                  const request = normalizeJoin(optIn.request);
                  const requestData = request?.request_data || {};
                  const chapter = request?.chapters ? normalizeJoin(request.chapters) : null;

                  let title = '';
                  let description = '';

                  if (optIn.opt_in_type === 'formation') {
                    title = requestData.proposed_name || 'New Chapter';
                    description = 'You\'ve been invited as a founding member';
                  } else if (optIn.opt_in_type === 'split_existing') {
                    title = chapter?.name || 'Chapter Split';
                    description = `Your chapter is splitting. Proposed assignment: ${optIn.proposed_assignment || 'unspecified'}`;
                  } else if (optIn.opt_in_type === 'split_new') {
                    title = optIn.proposed_assignment === 'original'
                      ? (chapter?.name || 'Chapter')
                      : (requestData.new_chapter_name || 'New Chapter');
                    description = 'You\'ve been invited to join this chapter';
                  }

                  return (
                    <div key={optIn.id} className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-earth-brown">{title}</h3>
                          <p className="text-sm text-stone-gray mt-1">{description}</p>
                          <p className="text-xs text-stone-gray mt-1">
                            Invited {new Date(optIn.notified_at || '').toLocaleDateString()}
                          </p>
                        </div>
                        <a
                          href={`/requests/opt-in/${optIn.id}`}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          Respond →
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Pending Tasks */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-earth-brown mb-4">
            Your Tasks
          </h2>
          <PendingTasksList userId={user.id} />
        </div>

        {/* In-Progress Meetings Banner */}
        {inProgressMeetings && inProgressMeetings.length > 0 && (
          <div className="mb-8">
            {inProgressMeetings.map(meeting => {
              const meetingChapter = normalizeJoin(meeting.chapters);
              const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
              const startedAt = meeting.actual_start_time
                ? new Date(meeting.actual_start_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })
                : null;
              const userRole = userChapterRoles.get(meetingChapter?.id);

              return (
                <div key={meeting.id} className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                        <h2 className="text-xl font-bold text-green-900">Meeting In Progress</h2>
                      </div>
                      <p className="text-green-800 font-semibold mb-1">
                        {meetingChapter?.name}
                        {userRole && <span className="text-sm font-normal text-green-700 ml-2">({formatRole(userRole)})</span>}
                      </p>
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

        {/* Meetings In Progress (scheduled time has started but not formally started) */}
        {meetingsStartedNotInProgress && meetingsStartedNotInProgress.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-earth-brown mb-4">Meetings In Progress</h2>
            <div className="space-y-4">
              {meetingsStartedNotInProgress.map(meeting => {
                const meetingChapter = normalizeJoin(meeting.chapters);
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

                const userRole = userChapterRoles.get(meetingChapter?.id);
                const isLeaderOrBackup = userRole === 'leader' || userRole === 'backup_leader';
                const hasCheckedIn = attendanceMap.has(meeting.id) && attendanceMap.get(meeting.id) !== null;

                return (
                  <div key={meeting.id} className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-earth-brown">
                          {meetingChapter?.name}
                          {userRole && <span className="text-sm font-normal text-stone-gray ml-2">({formatRole(userRole)})</span>}
                        </h3>
                        <p className="text-sm text-orange-800">
                          {dateStr} at {timeStr}
                        </p>
                        <p className="text-sm text-stone-gray">{meeting.location}</p>
                      </div>
                      <div className="flex gap-2">
                        {hasCheckedIn ? (
                          <div className="bg-green-100 text-green-800 py-2 px-4 rounded-lg text-sm font-semibold border-2 border-green-300">
                            ✓ Checked In
                          </div>
                        ) : (
                          <a
                            href={`/tasks/meeting-cycle/check-in?meeting=${meeting.id}`}
                            className="bg-burnt-orange text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-burnt-orange/90 transition-colors"
                          >
                            Check In
                          </a>
                        )}
                        {isLeaderOrBackup && (
                          <a
                            href={`/tasks/meeting-cycle/start-meeting?meeting=${meeting.id}`}
                            className="bg-burnt-orange text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-burnt-orange/90 transition-colors"
                          >
                            Start Meeting
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

        {/* Upcoming Meetings */}
        {upcomingMeetings && upcomingMeetings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-earth-brown mb-4">Upcoming Meetings</h2>
            <div className="space-y-4">
              {upcomingMeetings.map(meeting => {
                const meetingChapter = normalizeJoin(meeting.chapters);
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

                // Check if can delete (more than 2 days before meeting)
                const twoDaysBeforeMeeting = new Date(meetingDateTime.getTime() - 2 * 24 * 60 * 60 * 1000);
                const canDeleteUpcoming = now < twoDaysBeforeMeeting;

                const userRole = userChapterRoles.get(meetingChapter?.id);
                const isLeaderOrBackup = userRole === 'leader' || userRole === 'backup_leader';
                const hasCheckedIn = attendanceMap.has(meeting.id) && attendanceMap.get(meeting.id) !== null;

                return (
                  <div key={meeting.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-earth-brown">
                          {meetingChapter?.name}
                          {userRole && <span className="text-sm font-normal text-stone-gray ml-2">({formatRole(userRole)})</span>}
                        </h3>
                        <p className="text-sm text-stone-gray">
                          {dateStr} at {timeStr}
                        </p>
                        <p className="text-sm text-stone-gray">{meeting.location}</p>
                      </div>
                      <div className="flex gap-2">
                        {canCheckIn && (
                          hasCheckedIn ? (
                            <div className="bg-green-100 text-green-800 py-2 px-4 rounded-lg text-sm font-semibold border-2 border-green-300">
                              ✓ Checked In
                            </div>
                          ) : (
                            <a
                              href={`/tasks/meeting-cycle/check-in?meeting=${meeting.id}`}
                              className="bg-burnt-orange text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-burnt-orange/90 transition-colors"
                            >
                              Check In
                            </a>
                          )
                        )}
                        <a
                          href={`/meetings/${meeting.id}`}
                          className="bg-gray-100 text-earth-brown py-2 px-4 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                          View
                        </a>
                        {isLeaderOrBackup && (
                          <>
                            <RescheduleMeetingButton
                              meetingId={meeting.id}
                              meetingName={meetingChapter?.name || ''}
                              currentDate={meeting.scheduled_date}
                              currentTime={meeting.scheduled_time}
                            />
                            {canDeleteUpcoming ? (
                              <DeleteMeetingButton
                                meetingId={meeting.id}
                                meetingName={meetingChapter?.name || ''}
                              />
                            ) : (
                              <button
                                className="bg-gray-300 text-gray-600 py-2 px-4 rounded-lg text-sm font-semibold cursor-not-allowed"
                                disabled
                                title="Cannot delete meetings within 2 days of scheduled time"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Past Meetings */}
        {pastMeetings && pastMeetings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-earth-brown mb-4">Past Meetings</h2>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {pastMeetings.map(meeting => {
                const meetingChapter = normalizeJoin(meeting.chapters);
                const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
                const dateStr = meetingDateTime.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });

                const statusDisplayMap = {
                  completed: 'Completed',
                  incomplete: 'Incomplete',
                  never_started: 'Never Started',
                  timed_out: 'Timed Out'
                } as const;
                const statusDisplay = statusDisplayMap[meeting.status as keyof typeof statusDisplayMap] || meeting.status;

                const statusColorMap = {
                  completed: 'text-green-700',
                  incomplete: 'text-orange-600',
                  never_started: 'text-gray-500',
                  timed_out: 'text-red-600'
                } as const;
                const statusColor = statusColorMap[meeting.status as keyof typeof statusColorMap] || 'text-gray-600';

                const isComplete = meeting.status === 'completed';
                const userRole = userChapterRoles.get(meetingChapter?.id);
                const canDelete = userRole === 'leader' || userRole === 'backup_leader';

                return (
                  <div key={meeting.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-earth-brown">
                            {meetingChapter?.name}
                            {userRole && <span className="text-sm font-normal text-stone-gray ml-2">({formatRole(userRole)})</span>}
                          </h3>
                          <span className={`text-xs font-semibold ${statusColor}`}>
                            {statusDisplay}
                          </span>
                        </div>
                        <p className="text-sm text-stone-gray">
                          {dateStr}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {isComplete ? (
                          <a
                            href={`/meetings/${meeting.id}/summary`}
                            className="bg-burnt-orange text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-burnt-orange/90 transition-colors"
                          >
                            View Summary
                          </a>
                        ) : (
                          <>
                            {canDelete && (
                              <DeleteMeetingButton
                                meetingId={meeting.id}
                                meetingName={meetingChapter?.name || ''}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
