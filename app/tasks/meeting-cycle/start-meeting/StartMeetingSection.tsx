'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import StartMeetingForm from './StartMeetingForm';

interface Member {
  user_id: string;
  role: string;
  users: {
    id: string;
    name: string;
    username: string | null;
  };
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  checked_in_at: string | null;
  attendance_type: string | null;
  rsvp_status: string | null;
  rsvp_reason: string | null;
  users: {
    id: string;
    name: string;
    username: string | null;
  };
}

interface StartMeetingSectionProps {
  meetingId: string;
  initialAttendance: AttendanceRecord[];
  allMembers: Member[];
  currentUserId: string;
  isLate: boolean;
  minutesLate: number;
}

export default function StartMeetingSection({
  meetingId,
  initialAttendance,
  allMembers,
  currentUserId,
  isLate,
  minutesLate,
}: StartMeetingSectionProps) {
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>(initialAttendance);
  const supabase = createClient();

  useEffect(() => {
    console.log('[StartMeeting] Setting up realtime subscription for meeting:', meetingId);

    // Function to reload attendance data
    const reloadAttendance = async () => {
      console.log('[StartMeeting] Reloading attendance data...');
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          user_id,
          checked_in_at,
          attendance_type,
          rsvp_status,
          rsvp_reason,
          users!attendance_user_id_fkey (
            id,
            name,
            username
          )
        `)
        .eq('meeting_id', meetingId);

      if (error) {
        console.error('[StartMeeting] Error reloading attendance:', error);
      } else if (data) {
        console.log('[StartMeeting] Updated attendance data:', data.length, 'records');
        setAttendanceList(data as AttendanceRecord[]);
      }
    };

    // Set up realtime subscription
    const channel = supabase
      .channel(`start-meeting-${meetingId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: meetingId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `meeting_id=eq.${meetingId}`,
        },
        async (payload) => {
          console.log('[StartMeeting] Received attendance change:', payload);
          await reloadAttendance();
        }
      )
      .subscribe((status) => {
        console.log('[StartMeeting] Subscription status:', status);
      });

    // Poll for updates every 3 seconds as backup
    const pollInterval = setInterval(() => {
      console.log('[StartMeeting] Polling for updates...');
      reloadAttendance();
    }, 3000);

    return () => {
      console.log('[StartMeeting] Cleaning up subscription and polling');
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [meetingId, supabase]);

  // Process attendance data
  const checkedInUserIds = new Set(
    attendanceList?.filter(a => a.checked_in_at).map(a => a.user_id) || []
  );

  const checkedInMembers = allMembers?.filter(m => checkedInUserIds.has(m.user_id)) || [];
  const notCheckedInMembers = allMembers?.filter(m => !checkedInUserIds.has(m.user_id)) || [];

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

  return (
    <>
      {/* Attendance Summary */}
      <div className="bg-white rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-earth-brown mb-4">Attendance</h2>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{checkedInMembers.length}</div>
            <div className="text-sm text-green-800">Checked In</div>
          </div>
          <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">{notCheckedInMembers.length}</div>
            <div className="text-sm text-orange-800">Not Yet</div>
          </div>
        </div>

        {/* Checked in members */}
        {checkedInMembers.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-earth-brown mb-2">Checked In:</h3>
            <div className="space-y-1">
              {checkedInMembers.map(m => (
                <div key={m.user_id} className="text-sm text-stone-gray">
                  • {m.users.username || m.users.name}
                  {m.role !== 'member' && <span className="text-xs ml-1">({m.role.replace('_', ' ')})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RSVP'd Yes but not checked in */}
        {rsvpYesNotCheckedIn.length > 0 && (
          <div className="mb-3">
            <h3 className="font-semibold text-orange-700 mb-2">RSVP'd Yes - Not Checked In Yet ({rsvpYesNotCheckedIn.length}):</h3>
            <div className="space-y-1">
              {rsvpYesNotCheckedIn.map(m => (
                <div key={m.user_id} className="text-sm text-stone-gray">
                  • {m.users.username || m.users.name}
                  {m.role !== 'member' && <span className="text-xs ml-1">({m.role.replace('_', ' ')})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RSVP'd No */}
        {rsvpNoMembers.length > 0 && (
          <div className="mb-3">
            <h3 className="font-semibold text-stone-gray mb-2">RSVP'd No ({rsvpNoMembers.length}):</h3>
            <div className="space-y-1">
              {rsvpNoMembers.map(m => (
                <div key={m.user_id} className="text-sm text-stone-gray">
                  • {m.users.username || m.users.name}
                  {m.rsvp_reason && <span className="text-xs ml-2 italic">({m.rsvp_reason})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Response */}
        {noResponseMembers.length > 0 && (
          <div>
            <h3 className="font-semibold text-red-700 mb-2">No RSVP Response ({noResponseMembers.length}):</h3>
            <div className="space-y-1">
              {noResponseMembers.map(m => (
                <div key={m.user_id} className="text-sm text-stone-gray">
                  • {m.users.username || m.users.name}
                  {m.role !== 'member' && <span className="text-xs ml-1">({m.role.replace('_', ' ')})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start Meeting Form */}
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-xl font-bold text-earth-brown mb-4">Ready to Start</h2>

        {checkedInMembers.length === 0 ? (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <p className="text-orange-800">
              No members have checked in yet. You can still start the meeting, but consider waiting
              a few more minutes for members to arrive and check in.
            </p>
          </div>
        ) : null}

        <StartMeetingForm
          meetingId={meetingId}
          checkedInMembers={checkedInMembers.map(m => ({
            id: m.user_id,
            name: m.users.username || m.users.name,
          }))}
          currentUserId={currentUserId}
          isLate={isLate}
          minutesLate={minutesLate}
        />
      </div>
    </>
  );
}
