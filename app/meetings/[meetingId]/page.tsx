import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
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

  // Get user's chapter memberships for sidebar
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

  const firstChapter = memberships && memberships.length > 0 ? memberships[0].chapters : null;
  const userName = userData?.username || userData?.name || 'Member';

  // Check user is member of this specific chapter
  const membership = memberships?.find(m => m.chapter_id === meeting.chapter_id);

  if (!membership) {
    return (
      <div className="flex min-h-screen bg-warm-cream">
        <Sidebar
          userName={userName}
          chapterId={firstChapter?.id}
          chapterName={firstChapter?.name}
        />
        <main className="flex-1 py-8 px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-earth-brown mb-4">Access denied</h1>
            <p className="text-stone-gray mb-4">You are not a member of this chapter.</p>
            <Link href="/" className="text-burnt-orange hover:underline">
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isLeader = membership.role === 'leader' || membership.role === 'backup_leader';

  // Check if current user is the Scribe
  const isScribe = meeting.scribe_id === user.id;

  // Check if meeting is within 3 days
  const now = new Date();
  const scheduledDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
  const minutesUntilMeeting = Math.round((scheduledDateTime.getTime() - now.getTime()) / 60000);
  const isWithinThreeDays = minutesUntilMeeting <= (3 * 24 * 60) && minutesUntilMeeting > 0;

  // Get RSVP data if within 3 days
  let rsvpData: any[] = [];
  if (isWithinThreeDays) {
    const { data: attendanceList } = await supabase
      .from('attendance')
      .select(`
        id,
        user_id,
        rsvp_status,
        rsvp_reason,
        users!attendance_user_id_fkey (
          id,
          name,
          username
        )
      `)
      .eq('meeting_id', meetingId);

    // Get all chapter members
    const { data: allMembers } = await supabase
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

    // Combine members with their RSVP status
    rsvpData = allMembers?.map(m => {
      const attendance = attendanceList?.find(a => a.user_id === m.user_id);
      return {
        user_id: m.user_id,
        name: m.users.username || m.users.name,
        role: m.role,
        rsvp_status: attendance?.rsvp_status || 'no_response',
        rsvp_reason: attendance?.rsvp_reason,
      };
    }) || [];
  }

  // Get housekeeping (agenda items)
  const { data: housekeepingItems } = await supabase
    .from('meeting_agenda_items')
    .select('id, item_type, title, notes, related_user_id, users:related_user_id(name, username)')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true });

  // Only load attendance if meeting is in_progress
  let checkedInAttendance: any[] = [];
  let notCheckedInMembers: any[] = [];

  if (meeting.status === 'in_progress') {
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
    checkedInAttendance = attendanceList?.filter(a => a.checked_in_at) || [];
    const checkedInUserIds = new Set(checkedInAttendance.map(a => a.user_id));
    notCheckedInMembers = members?.filter(m => !checkedInUserIds.has(m.user_id)) || [];
  }

  // Combine date and time to avoid timezone issues
  const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
  const meetingDate = meetingDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="flex min-h-screen bg-warm-cream">
      <Sidebar
        userName={userName}
        chapterId={meeting.chapter_id}
        chapterName={meeting.chapters.name}
      />
      <div className="flex-1">
        <MeetingView
          meeting={meeting}
          meetingDate={meetingDate}
          checkedInAttendance={checkedInAttendance}
          notCheckedInMembers={notCheckedInMembers}
          housekeepingItems={housekeepingItems || []}
          rsvpData={rsvpData}
          isWithinThreeDays={isWithinThreeDays}
          isLeader={isLeader}
          isScribe={isScribe}
          currentUserId={user.id}
          currentUserName={userName}
        />
      </div>
    </div>
  );
}
