import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ContactForm from './ContactForm';

interface ContactUnresponsiveMemberPageProps {
  searchParams: Promise<{ attendance: string; task: string }>;
}

export default async function ContactUnresponsiveMemberPage({ searchParams }: ContactUnresponsiveMemberPageProps) {
  const params = await searchParams;
  const { attendance: attendanceId, task: taskId } = params;

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

  // Get the task
  const { data: task, error: taskError } = await supabase
    .from('pending_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Task not found</h1>
          <Link href="/dashboard" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Verify user is assigned to this task
  if (task.assigned_to !== user.id) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Access denied</h1>
          <p className="text-stone-gray mb-4">This task is not assigned to you.</p>
          <Link href="/dashboard" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Get attendance record with member and meeting info
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select(`
      id,
      user_id,
      rsvp_status,
      reminder_sent_at,
      users!inner (
        id,
        name,
        username,
        phone
      ),
      meetings!inner (
        id,
        scheduled_date,
        scheduled_time,
        location,
        chapters!inner (
          id,
          name
        )
      )
    `)
    .eq('id', attendanceId)
    .single();

  if (attendanceError || !attendance) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Attendance record not found</h1>
          <Link href="/dashboard" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const memberName = attendance.users.username || attendance.users.name;
  const memberPhone = attendance.users.phone;
  const meeting = attendance.meetings;
  const chapterName = meeting.chapters.name;
  // Combine date and time to avoid timezone issues
  const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
  const meetingDate = meetingDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const reminderSentDate = attendance.reminder_sent_at
    ? new Date(attendance.reminder_sent_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header */}
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-2xl mx-auto">
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
          <h1 className="text-3xl font-bold mb-2">Contact {memberName} About RSVP</h1>
          <p className="text-warm-cream/80">{chapterName} meeting on {meetingDate}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-8 px-6">
        {/* Context */}
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-orange-900 mb-3">Situation</h2>
          <ul className="space-y-2 text-orange-800">
            <li>• <strong>{memberName}</strong> hasn't responded to the RSVP for the upcoming meeting</li>
            {reminderSentDate && (
              <li>• They were texted and emailed on <strong>{reminderSentDate}</strong> with no response</li>
            )}
            <li>• As a leader, please reach out to check in with them</li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Contact Information</h2>
          <div className="space-y-2">
            <p className="text-stone-gray">
              <strong className="text-earth-brown">Name:</strong> {attendance.users.name}
            </p>
            {memberPhone && (
              <p className="text-stone-gray">
                <strong className="text-earth-brown">Phone:</strong>{' '}
                <a href={`tel:${memberPhone}`} className="text-burnt-orange hover:underline font-medium">
                  {memberPhone}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Meeting Details */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Meeting Details</h2>
          <div className="space-y-2 text-stone-gray">
            <p><strong className="text-earth-brown">Chapter:</strong> {chapterName}</p>
            <p><strong className="text-earth-brown">Date:</strong> {meetingDate}</p>
            <p><strong className="text-earth-brown">Time:</strong> {meeting.scheduled_time}</p>
            <p><strong className="text-earth-brown">Location:</strong> {meeting.location}</p>
          </div>
        </div>

        {/* Action Form */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Log Your Outreach</h2>
          <p className="text-stone-gray mb-6">
            After you've reached out to {memberName}, please log what happened below.
            This will complete both your task and their RSVP task, and create a note
            for discussion at the meeting.
          </p>

          <ContactForm
            attendanceId={attendanceId}
            taskId={taskId}
            memberName={memberName}
          />
        </div>
      </main>
    </div>
  );
}
