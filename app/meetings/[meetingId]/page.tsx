import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MeetingView from './MeetingView';

interface MeetingPageProps {
  params: Promise<{ meetingId: string }>;
}

export default async function MeetingPage({ params }: MeetingPageProps) {
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

  // Get meeting with chapter info and scribe
  const { data: meeting, error: meetingError } = await supabase
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Access denied</h1>
          <p className="text-stone-gray mb-4">You are not a member of this chapter.</p>
          <Link href="/" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isLeader = membership.role === 'leader' || membership.role === 'backup_leader';

  // Get all attendance records with user info
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
    .eq('meeting_id', meetingId)
    .order('checked_in_at', { ascending: true, nullsFirst: false });

  // Check if current user is the Scribe
  const isScribe = meeting.scribe_id === user.id;

  // Get all chapter members for context
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

  // Separate checked in vs not
  const checkedInAttendance = attendanceList?.filter(a => a.checked_in_at) || [];
  const checkedInUserIds = new Set(checkedInAttendance.map(a => a.user_id));

  const notCheckedInMembers = members?.filter(m => !checkedInUserIds.has(m.user_id)) || [];

  // Combine date and time to avoid timezone issues
  const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
  const meetingDate = meetingDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <MeetingView
      meeting={meeting}
      meetingDate={meetingDate}
      checkedInAttendance={checkedInAttendance}
      notCheckedInMembers={notCheckedInMembers}
      isLeader={isLeader}
      isScribe={isScribe}
      currentUserId={user.id}
      currentUserName={userData?.username || userData?.name || 'Member'}
    />
  );
}
