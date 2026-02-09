'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { normalizeJoin } from '@/lib/supabase/utils';
import ChangeScribeForm from './ChangeScribeForm';

interface MeetingViewProps {
  meeting: any;
  meetingDate: string;
  checkedInAttendance: any[];
  notCheckedInMembers: any[];
  housekeepingItems: any[];
  rsvpData: any[];
  isWithinThreeDays: boolean;
  isLeader: boolean;
  isScribe: boolean;
  currentUserId: string;
  currentUserName: string;
}

// Helper function to format minutes into natural units
function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return 'now';

  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  if (days > 0) {
    if (hours > 0) {
      return `${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    if (mins > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${mins} minute${mins > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${mins} minute${mins > 1 ? 's' : ''}`;
  }
}

export default function MeetingView({
  meeting: initialMeeting,
  meetingDate,
  checkedInAttendance: initialCheckedIn,
  notCheckedInMembers: initialNotCheckedIn,
  housekeepingItems,
  rsvpData,
  isWithinThreeDays,
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

  // Normalize meeting joins
  const meetingChapter = normalizeJoin(meeting.chapters);

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

  const statusColors = {
    scheduled: 'text-orange-600',
    in_progress: 'text-green-600',
    completed: 'text-blue-600',
    cancelled: 'text-red-600',
  } as const;
  const statusColor = statusColors[meeting.status as keyof typeof statusColors] || 'text-stone-gray';

  const statusTexts = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  } as const;
  const statusText = statusTexts[meeting.status as keyof typeof statusTexts] || meeting.status;

  const scribeName = meeting.scribe?.username || meeting.scribe?.name || 'Not assigned';

  // Check if it's too early to start/check-in to the meeting (must be within 15 minutes)
  const now = new Date();
  const scheduledDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
  const minutesUntilMeeting = Math.round((scheduledDateTime.getTime() - now.getTime()) / 60000);
  const canStartMeeting = minutesUntilMeeting <= 15;
  const canCheckIn = minutesUntilMeeting <= 15;

  // Calculate check-in start time (15 minutes before scheduled time)
  const checkInStartTime = new Date(scheduledDateTime.getTime() - 15 * 60 * 1000);
  const checkInStartTimeStr = checkInStartTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="min-h-screen bg-warm-cream">
      <main className="max-w-5xl mx-auto py-8 px-8 space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-earth-brown mb-2">{meetingChapter?.name} Meeting</h1>
          <p className="text-stone-gray">{meetingDate} at {meeting.scheduled_time}</p>
        </div>
        {/* Meeting Status */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Meeting Status</h2>
          <div className="space-y-2 mb-4">
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

          {/* Check In Button */}
          {meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
            <div className="pt-4 border-t border-gray-200">
              {canCheckIn ? (
                <Link
                  href={`/tasks/meeting-cycle/check-in?meeting=${meeting.id}`}
                  className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Check In to Meeting
                </Link>
              ) : (
                <div>
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 py-2 px-6 rounded-lg font-semibold cursor-not-allowed"
                  >
                    Check In to Meeting
                  </button>
                  <p className="text-xs text-stone-gray mt-2">
                    Check-in starts at {checkInStartTimeStr}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RSVP Status (only if within 3 days) */}
        {isWithinThreeDays && meeting.status === 'scheduled' && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">RSVP Status</h2>

            {/* Summary counts */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {rsvpData.filter(m => m.rsvp_status === 'no_response').length}
                </div>
                <div className="text-xs text-gray-800">No Response</div>
              </div>
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {rsvpData.filter(m => m.rsvp_status === 'yes').length}
                </div>
                <div className="text-xs text-green-800">Yes</div>
              </div>
              <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {rsvpData.filter(m => m.rsvp_status === 'no').length}
                </div>
                <div className="text-xs text-red-800">No</div>
              </div>
            </div>

            {/* Member lists by RSVP status - Order: No Response, Yes, No */}
            <div className="space-y-3">
              {/* No Response */}
              {rsvpData.filter(m => m.rsvp_status === 'no_response').length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">No Response:</h3>
                  <p className="text-sm text-stone-gray">
                    {rsvpData.filter(m => m.rsvp_status === 'no_response').map((m, index, arr) => (
                      <span key={m.user_id}>
                        {m.name}
                        {m.role !== 'member' && <span className="text-xs"> ({m.role.replace('_', ' ')})</span>}
                        {index < arr.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              )}

              {/* Yes */}
              {rsvpData.filter(m => m.rsvp_status === 'yes').length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-700 mb-1">Yes:</h3>
                  <p className="text-sm text-stone-gray">
                    {rsvpData.filter(m => m.rsvp_status === 'yes').map((m, index, arr) => (
                      <span key={m.user_id}>
                        {m.name}
                        {m.role !== 'member' && <span className="text-xs"> ({m.role.replace('_', ' ')})</span>}
                        {index < arr.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              )}

              {/* No */}
              {rsvpData.filter(m => m.rsvp_status === 'no').length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-700 mb-1">No:</h3>
                  <p className="text-sm text-stone-gray">
                    {rsvpData.filter(m => m.rsvp_status === 'no').map((m, index, arr) => (
                      <span key={m.user_id}>
                        {m.name}
                        {m.rsvp_reason && <span className="text-xs italic"> ({m.rsvp_reason})</span>}
                        {index < arr.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leader Controls */}
        {isLeader && meeting.status === 'scheduled' && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Leader Controls</h3>
            {canStartMeeting ? (
              <Link
                href={`/tasks/meeting-cycle/start-meeting?meeting=${meeting.id}`}
                className="inline-block bg-burnt-orange text-white py-3 px-6 rounded-lg font-semibold hover:bg-burnt-orange/90 transition-colors"
              >
                Start Meeting
              </Link>
            ) : (
              <div>
                <button
                  disabled
                  className="bg-gray-300 text-gray-500 py-3 px-6 rounded-lg font-semibold cursor-not-allowed"
                >
                  Start Meeting
                </button>
                <p className="text-sm text-blue-800 mt-3">
                  Meeting can be started 15 minutes before scheduled time ({formatTimeRemaining(minutesUntilMeeting)} remaining)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Change Scribe (Leader only, during meeting) */}
        {isLeader && meeting.status === 'in_progress' && (
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold text-earth-brown mb-3">Change Scribe</h3>
            <ChangeScribeForm
              meetingId={meeting.id}
              currentScribeId={meeting.scribe_id}
              checkedInMembers={checkedInAttendance.map(a => {
                const user = normalizeJoin(a.users);
                return {
                  id: a.user_id,
                  name: user?.username || user?.name || '',
                };
              })}
            />
          </div>
        )}

        {/* Run Meeting (All members during meeting) */}
        {meeting.status === 'in_progress' && (
          <div className={`border-2 rounded-lg p-6 ${
            isScribe
              ? 'bg-sage-green/10 border-sage-green'
              : 'bg-blue-50 border-blue-300'
          }`}>
            <h3 className="text-lg font-semibold text-earth-brown mb-3">
              {isScribe ? '🎯 Scribe Controls' : '👀 Follow Meeting'}
            </h3>
            <p className="text-stone-gray mb-4">
              {isScribe
                ? 'You are the Scribe for this meeting. Control the meeting flow through Opening, Lightning Round, and Full Check-ins.'
                : 'Follow along with the meeting progress in real-time.'
              }
            </p>
            <Link
              href={`/meetings/${meeting.id}/run`}
              className={`inline-block py-3 px-6 rounded-lg font-semibold transition-colors ${
                isScribe
                  ? 'bg-sage-green text-deep-charcoal hover:bg-sage-green/90'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isScribe ? '→ Run Meeting' : '→ View Meeting'}
            </Link>
          </div>
        )}

        {/* Housekeeping */}
        {housekeepingItems.length > 0 && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Housekeeping</h2>
            <div className="space-y-4">
              {housekeepingItems.map((item) => {
                const itemUser = item.users ? normalizeJoin(item.users) : null;
                return (
                <div key={item.id} className="p-4 bg-warm-cream/50 rounded-lg border-l-4 border-burnt-orange">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-earth-brown">{item.title}</h3>
                    <span className="text-xs px-2 py-1 bg-burnt-orange/20 text-burnt-orange rounded">
                      {item.item_type}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-sm text-stone-gray whitespace-pre-wrap">{item.notes}</p>
                  )}
                  {itemUser && (
                    <p className="text-xs text-stone-gray mt-2">
                      Related to: {itemUser.username || itemUser.name}
                    </p>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
