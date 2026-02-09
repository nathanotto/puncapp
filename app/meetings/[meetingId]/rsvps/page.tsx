import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LogOutreachForm from '@/components/rsvp/LogOutreachForm';

interface RSVPSummaryPageProps {
  params: Promise<{ meetingId: string }>;
}

export default async function RSVPSummaryPage({ params }: RSVPSummaryPageProps) {
  const { meetingId } = await params;
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

  // Fetch meeting with chapter info
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      location,
      rsvp_deadline,
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
          <Link href="/dashboard" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const meetingChapter = normalizeJoin(meeting.chapters);

  // Check if user is a member of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('id, role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!membership) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Access denied</h1>
          <p className="text-stone-gray mb-4">You are not a member of this chapter.</p>
          <Link href="/dashboard" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isLeader = membership.role === 'leader' || membership.role === 'backup_leader';

  // Fetch all chapter members with their attendance/RSVP status
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select(`
      user_id,
      role,
      users!inner (
        id,
        name,
        username,
        email,
        phone
      )
    `)
    .eq('chapter_id', meeting.chapter_id)
    .eq('is_active', true);

  // Fetch all attendance records for this meeting with outreach info
  const { data: attendanceRecords } = await supabase
    .from('attendance')
    .select(`
      *,
      leader_outreach_user:users!attendance_leader_outreach_by_fkey (
        name,
        username
      )
    `)
    .eq('meeting_id', meetingId);

  // Create a map of user_id -> attendance
  const attendanceMap = new Map(
    attendanceRecords?.map(a => [a.user_id, a]) || []
  );

  // Combine members with their RSVP status
  const membersWithRsvp = members?.map(m => {
    const user = normalizeJoin(m.users);
    return {
      ...user,
      role: m.role,
      attendance: attendanceMap.get(m.user_id) || { rsvp_status: 'no_response' }
    };
  }) || [];

  // Sort: No Response first, then by name
  membersWithRsvp.sort((a, b) => {
    if (a.attendance.rsvp_status === 'no_response' && b.attendance.rsvp_status !== 'no_response') {
      return -1;
    }
    if (a.attendance.rsvp_status !== 'no_response' && b.attendance.rsvp_status === 'no_response') {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

  // Count responses
  const yesCount = membersWithRsvp.filter(m => m.attendance.rsvp_status === 'yes').length;
  const noCount = membersWithRsvp.filter(m => m.attendance.rsvp_status === 'no').length;
  const noResponseCount = membersWithRsvp.filter(m => m.attendance.rsvp_status === 'no_response').length;

  // Combine date and time to avoid timezone issues
  const meetingDate = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
  const rsvpDeadline = meeting.rsvp_deadline ? new Date(meeting.rsvp_deadline) : null;
  const isPastDeadline = rsvpDeadline && new Date() > rsvpDeadline;

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header */}
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <Link href="/dashboard" className="text-sm text-warm-cream/80 hover:text-warm-cream">
              ← Back to Dashboard
            </Link>
            <div className="text-right text-sm">
              <p className="text-warm-cream/80">{userData?.username || userData?.name || 'Member'}</p>
              <a href="/auth/logout" className="text-warm-cream/60 hover:text-warm-cream">
                Sign Out
              </a>
            </div>
          </div>
          <h1 className="text-3xl font-bold">Meeting RSVPs</h1>
          <p className="text-warm-cream/80">{meetingChapter?.name}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-6">
        {/* Meeting Details */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Meeting Details</h2>
          <div className="space-y-2 text-stone-gray">
            <p>
              <strong>Date:</strong> {meetingDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            <p><strong>Time:</strong> {meeting.scheduled_time}</p>
            <p><strong>Location:</strong> {meeting.location}</p>
            {rsvpDeadline && (
              <p>
                <strong>RSVP Deadline:</strong> {rsvpDeadline.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric'
                })}
                {isPastDeadline && (
                  <span className="ml-2 text-red-600 font-semibold">(Past)</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* RSVP Summary Stats */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Response Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{yesCount}</div>
              <div className="text-sm text-stone-gray">Attending</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{noCount}</div>
              <div className="text-sm text-stone-gray">Not Attending</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{noResponseCount}</div>
              <div className="text-sm text-stone-gray">No Response</div>
            </div>
          </div>
        </div>

        {/* Member RSVPs */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Member Responses</h2>
          <div className="space-y-3">
            {membersWithRsvp.map((member) => {
              const status = member.attendance.rsvp_status;
              const isNoResponse = status === 'no_response';
              const reminderSent = member.attendance.reminder_sent_at;
              const outreachLogged = member.attendance.leader_outreach_logged_at;
              const outreachNotes = member.attendance.leader_outreach_notes;
              const outreachBy = member.attendance.leader_outreach_user;

              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-lg border-2 ${
                    isNoResponse
                      ? 'border-orange-300 bg-orange-50'
                      : status === 'yes'
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-earth-brown">
                        {member.name}
                        {member.role !== 'member' && (
                          <span className="ml-2 text-xs text-stone-gray">
                            ({member.role.replace('_', ' ')})
                          </span>
                        )}
                      </h3>

                      {/* Show phone number to leaders for non-responders */}
                      {isLeader && isNoResponse && member.phone && (
                        <p className="text-sm text-stone-gray mt-1">
                          Phone: <a href={`tel:${member.phone}`} className="text-burnt-orange hover:underline">{member.phone}</a>
                        </p>
                      )}

                      {/* Show reason for "No" responses */}
                      {status === 'no' && member.attendance.rsvp_reason && (
                        <p className="text-sm text-stone-gray mt-1">
                          Reason: {member.attendance.rsvp_reason}
                        </p>
                      )}

                      {/* Show escalation status */}
                      {isNoResponse && reminderSent && !outreachLogged && (
                        <p className="text-sm text-orange-700 mt-2">
                          <span className="font-medium">Texted & emailed</span> on {new Date(reminderSent).toLocaleDateString()}, leader reaching out
                        </p>
                      )}

                      {/* Show outreach notes if logged */}
                      {outreachLogged && outreachNotes && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-900">
                            <strong>Leader spoke with {member.username || member.name.split(' ')[0]}:</strong> {outreachNotes}
                          </p>
                          {outreachBy && (
                            <p className="text-xs text-blue-700 mt-1">
                              — {outreachBy.username || outreachBy.name}, {new Date(outreachLogged).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Show responded date */}
                      {member.attendance.rsvp_at && (
                        <p className="text-xs text-stone-gray mt-1">
                          Responded {new Date(member.attendance.rsvp_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isNoResponse
                            ? 'bg-orange-200 text-orange-800'
                            : status === 'yes'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                        }`}
                      >
                        {status === 'no_response' ? 'No Response' : status === 'yes' ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  {/* Log Outreach Form (leaders only, for no response without outreach) */}
                  {isLeader && isNoResponse && !outreachLogged && member.attendance.id && (
                    <div className="mt-4 pt-4 border-t border-orange-200">
                      <LogOutreachForm
                        attendanceId={member.attendance.id}
                        memberName={member.username || member.name}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
