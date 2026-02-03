'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ChangeScribeForm from './ChangeScribeForm';

interface MeetingViewProps {
  meeting: any;
  meetingDate: string;
  checkedInAttendance: any[];
  notCheckedInMembers: any[];
  isLeader: boolean;
  isScribe: boolean;
  currentUserId: string;
  currentUserName: string;
}

export default function MeetingView({
  meeting: initialMeeting,
  meetingDate,
  checkedInAttendance: initialCheckedIn,
  notCheckedInMembers: initialNotCheckedIn,
  isLeader,
  isScribe,
  currentUserId,
  currentUserName,
}: MeetingViewProps) {
  const [meeting, setMeeting] = useState(initialMeeting);
  const [checkedInAttendance, setCheckedInAttendance] = useState(initialCheckedIn);
  const [notCheckedInMembers, setNotCheckedInMembers] = useState(initialNotCheckedIn);
  const router = useRouter();
  const supabase = createClient();

  console.log('MeetingView rendered, meeting.id:', meeting.id);

  // Real-time subscription for attendance updates
  useEffect(() => {
    const fetchAttendanceData = async () => {
      // Fetch updated attendance list
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
        .eq('meeting_id', meeting.id)
        .order('checked_in_at', { ascending: true, nullsFirst: false });

      if (attendanceList) {
        const checkedIn = attendanceList.filter(a => a.checked_in_at) || [];
        const checkedInUserIds = new Set(checkedIn.map(a => a.user_id));

        // Fetch all chapter members
        const { data: members } = await supabase
          .from('chapter_memberships')
          .select(`
            user_id,
            users!inner (
              id,
              name,
              username
            )
          `)
          .eq('chapter_id', meeting.chapter_id)
          .eq('is_active', true);

        const notCheckedIn = members?.filter(m => !checkedInUserIds.has(m.user_id)) || [];

        setCheckedInAttendance(checkedIn);
        setNotCheckedInMembers(notCheckedIn);
      }
    };

    const fetchMeetingData = async () => {
      // Fetch updated meeting data
      const { data: updatedMeeting } = await supabase
        .from('meetings')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          location,
          status,
          actual_start_time,
          scribe_id,
          chapter_id,
          chapters!inner (
            id,
            name
          ),
          scribe:users!meetings_scribe_id_fkey (
            id,
            name,
            username
          )
        `)
        .eq('id', meeting.id)
        .single();

      if (updatedMeeting) {
        setMeeting(updatedMeeting);
      }
    };

    const channel = supabase
      .channel(`meeting-${meeting.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `meeting_id=eq.${meeting.id}`,
        },
        (payload) => {
          console.log('🔔 Attendance change detected!', payload);
          console.log('Event type:', payload.eventType);
          console.log('New data:', payload.new);
          fetchAttendanceData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meetings',
          filter: `id=eq.${meeting.id}`,
        },
        (payload) => {
          console.log('🔔 Meeting change detected!', payload);
          fetchMeetingData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for meeting:', meeting.id);
        } else {
          console.log('⚠️ Subscription status changed to:', status);
        }
      });

    return () => {
      console.log('Cleaning up subscription for meeting:', meeting.id);
      supabase.removeChannel(channel);
    };
  }, [meeting.id, meeting.chapter_id]);

  const statusColor = {
    scheduled: 'text-orange-600',
    in_progress: 'text-green-600',
    completed: 'text-blue-600',
    cancelled: 'text-red-600',
  }[meeting.status] || 'text-stone-gray';

  const statusText = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }[meeting.status] || meeting.status;

  const scribeName = meeting.scribe?.username || meeting.scribe?.name || 'Not assigned';

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
              <p className="text-warm-cream/80">{currentUserName}</p>
              <a href="/auth/logout" className="text-warm-cream/60 hover:text-warm-cream">
                Sign Out
              </a>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">{meeting.chapters.name} Meeting</h1>
          <p className="text-warm-cream/80">{meetingDate} at {meeting.scheduled_time}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-6 space-y-6">
        {/* Meeting Status */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Meeting Status</h2>
          <div className="space-y-2">
            <p>
              <strong className="text-earth-brown">Status:</strong>{' '}
              <span className={`font-semibold ${statusColor}`}>{statusText}</span>
            </p>
            <p><strong className="text-earth-brown">Date:</strong> {meetingDate}</p>
            <p><strong className="text-earth-brown">Time:</strong> {meeting.scheduled_time}</p>
            <p><strong className="text-earth-brown">Location:</strong> {meeting.location}</p>
            {meeting.status === 'in_progress' && meeting.actual_start_time && (
              <p>
                <strong className="text-earth-brown">Started:</strong>{' '}
                {new Date(meeting.actual_start_time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            )}
            {meeting.status === 'in_progress' && (
              <p>
                <strong className="text-earth-brown">Scribe:</strong> {scribeName}
              </p>
            )}
          </div>
        </div>

        {/* Leader Controls */}
        {isLeader && meeting.status === 'scheduled' && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Leader Controls</h3>
            <Link
              href={`/tasks/meeting-cycle/start-meeting?meeting=${meeting.id}`}
              className="inline-block bg-burnt-orange text-white py-3 px-6 rounded-lg font-semibold hover:bg-burnt-orange/90 transition-colors"
            >
              Start Meeting
            </Link>
          </div>
        )}

        {/* Change Scribe (Leader only, during meeting) */}
        {isLeader && meeting.status === 'in_progress' && (
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-earth-brown mb-3">Change Scribe</h3>
            <ChangeScribeForm
              meetingId={meeting.id}
              currentScribeId={meeting.scribe_id}
              checkedInMembers={checkedInAttendance.map(a => ({
                id: a.user_id,
                name: a.users.username || a.users.name,
              }))}
            />
          </div>
        )}

        {/* Start Meeting (Scribe only, during meeting) */}
        {isScribe && meeting.status === 'in_progress' && (
          <div className="bg-sage-green/10 border-2 border-sage-green rounded-lg p-6">
            <h3 className="text-lg font-semibold text-earth-brown mb-3">Scribe Controls</h3>
            <p className="text-stone-gray mb-4">
              Control the meeting flow through Opening, Lightning Round, and Full Check-ins.
            </p>
            <Link
              href={`/meetings/${meeting.id}/run`}
              className="inline-block bg-sage-green text-deep-charcoal py-3 px-6 rounded-lg font-semibold hover:bg-sage-green/90 transition-colors"
            >
              Start Meeting
            </Link>
          </div>
        )}

        {/* Attendance */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Attendance</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{checkedInAttendance.length}</div>
              <div className="text-sm text-green-800">Checked In</div>
            </div>
            <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">{notCheckedInMembers.length}</div>
              <div className="text-sm text-orange-800">Not Yet</div>
            </div>
          </div>

          {/* Checked In List */}
          {checkedInAttendance.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-green-700 mb-3">Checked In:</h3>
              <div className="space-y-2">
                {checkedInAttendance.map(a => (
                  <div key={a.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="font-medium text-earth-brown">
                        {a.users.username || a.users.name}
                      </span>
                      {a.user_id === currentUserId && (
                        <span className="ml-2 text-xs text-green-700">(You)</span>
                      )}
                    </div>
                    <div className="text-right text-sm text-stone-gray">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          a.attendance_type === 'in_person'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-blue-200 text-blue-800'
                        }`}>
                          {a.attendance_type === 'in_person' ? '🤝 In Person' : '📹 Video'}
                        </span>
                        <span className="text-xs">
                          {new Date(a.checked_in_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not Checked In List */}
          {notCheckedInMembers.length > 0 && (
            <div>
              <h3 className="font-semibold text-orange-700 mb-3">Not Checked In Yet:</h3>
              <div className="space-y-1">
                {notCheckedInMembers.map(m => (
                  <div key={m.user_id} className="text-sm text-stone-gray p-2 bg-orange-50 rounded">
                    • {m.users.username || m.users.name}
                    {m.user_id === currentUserId && (
                      <span className="ml-2 text-xs text-orange-700">(You)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Check-in Link (if not checked in and meeting in progress or scheduled) */}
        {meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-blue-900 mb-3">
              {meeting.status === 'in_progress' ? 'Join the meeting:' : 'Get ready for the meeting:'}
            </p>
            <Link
              href={`/tasks/meeting-cycle/check-in?meeting=${meeting.id}`}
              className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Check In
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
