import { createClient } from '@/lib/supabase/server'
import { normalizeJoin } from '@/lib/supabase/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MeetingSummaryPage({
  params,
}: {
  params: Promise<{ meetingId: string }>
}) {
  const { meetingId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get meeting with all related data
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      actual_start_time,
      completed_at,
      status,
      location,
      duration_minutes,
      selected_curriculum_id,
      chapter_id,
      meeting_type,
      topic,
      description,
      message_to_members,
      chapters!inner (
        id,
        name
      ),
      scribe:users!meetings_scribe_id_fkey(id, name, username)
    `)
    .eq('id', meetingId)
    .single()

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
    )
  }

  const meetingChapter = normalizeJoin(meeting.chapters);
  const meetingScribe = normalizeJoin(meeting.scribe);

  // Check user is member of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Access denied</h1>
          <Link href="/" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Check meeting is completed
  if (meeting.status !== 'completed' || !meeting.completed_at) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Meeting Not Complete</h1>
          <p className="text-stone-gray mb-4">
            This meeting has not been completed yet. The summary will be available once the meeting is finished.
          </p>
          <Link href={`/meetings/${meetingId}`} className="text-burnt-orange hover:underline">
            Back to Meeting
          </Link>
        </div>
      </div>
    )
  }

  // Special meeting summary (simplified)
  if (meeting.meeting_type === 'special_consideration') {
    const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`)
    const meetingDate = meetingDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })

    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-3xl font-bold text-earth-brown">Special Meeting Summary</h1>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded">
                Special Consideration
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-stone-gray">
              <div>
                <p className="text-sm font-medium text-gray-500">Chapter</p>
                <p className="text-lg">{meetingChapter?.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Date</p>
                <p className="text-lg">{meetingDate}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Time</p>
                <p className="text-lg">{meeting.scheduled_time}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Location</p>
                <p className="text-lg">{meeting.location || 'Not specified'}</p>
              </div>
            </div>

            {meeting.topic && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-500">Topic</p>
                <p className="text-lg text-stone-gray">{meeting.topic}</p>
              </div>
            )}

            {meetingScribe && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-500">Scribe</p>
                <p className="text-lg text-stone-gray">
                  {meetingScribe.username || meetingScribe.name}
                </p>
              </div>
            )}
          </div>

          {/* Meeting Notes */}
          {meeting.description && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-earth-brown mb-4">Meeting Notes</h2>
              <div className="prose max-w-none">
                <p className="text-stone-gray whitespace-pre-wrap">{meeting.description}</p>
              </div>
            </div>
          )}

          {/* Original Message */}
          {meeting.message_to_members && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-semibold text-amber-900 mb-2">Original Message to Members</h3>
              <p className="text-amber-800">{meeting.message_to_members}</p>
            </div>
          )}

          {/* Back Link */}
          <div className="flex justify-center">
            <Link
              href={`/chapters/${meeting.chapter_id}/meetings`}
              className="px-6 py-3 bg-burnt-orange text-white rounded-lg font-semibold hover:bg-deep-charcoal"
            >
              Back to Meetings
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Get attendees
  const { data: attendance } = await supabase
    .from('attendance')
    .select(`
      user_id,
      checked_in_at,
      attendance_type,
      users!attendance_user_id_fkey(id, name, username)
    `)
    .eq('meeting_id', meetingId)
    .not('checked_in_at', 'is', null)
    .order('checked_in_at')

  // Get curriculum module if selected
  let curriculumModule = null
  if (meeting.selected_curriculum_id) {
    const { data: module } = await supabase
      .from('curriculum_modules')
      .select('title, principle')
      .eq('id', meeting.selected_curriculum_id)
      .single()
    curriculumModule = module
  }

  // Get meeting feedback
  const { data: feedback } = await supabase
    .from('meeting_feedback')
    .select(`
      user_id,
      value_rating,
      most_value_user_id,
      skipped_rating,
      skipped_most_value,
      users!meeting_feedback_user_id_fkey(name),
      most_value_user:users!meeting_feedback_most_value_user_id_fkey(name)
    `)
    .eq('meeting_id', meetingId)

  // Calculate average rating
  const ratings = feedback?.filter(f => !f.skipped_rating && f.value_rating).map(f => f.value_rating!) || []
  const averageRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
    : null

  // Count "most value" votes
  const mostValueCounts: Record<string, { name: string; count: number }> = {}
  feedback?.forEach(f => {
    if (!f.skipped_most_value && f.most_value_user_id && f.most_value_user) {
      const mostValueUser = normalizeJoin(f.most_value_user);
      const key = f.most_value_user_id
      if (!mostValueCounts[key]) {
        mostValueCounts[key] = { name: mostValueUser?.name || 'Unknown', count: 0 }
      }
      mostValueCounts[key].count++
    }
  })

  const topMostValue = Object.entries(mostValueCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)

  // Get audio recording
  const { data: audioRecording } = await supabase
    .from('meeting_recordings')
    .select('storage_path, recorded_by, recorded_at')
    .eq('meeting_id', meetingId)
    .maybeSingle()

  // Get next upcoming meeting for this chapter
  const { data: nextMeeting } = await supabase
    .from('meetings')
    .select('id, scheduled_date, scheduled_time')
    .eq('chapter_id', meeting.chapter_id)
    .eq('status', 'scheduled')
    .gt('scheduled_date', meeting.scheduled_date)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })
    .limit(1)
    .maybeSingle();

  // Format dates
  const meetingDate = new Date(meeting.scheduled_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const startTime = meeting.actual_start_time
    ? new Date(meeting.actual_start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : meeting.scheduled_time

  const endTime = meeting.completed_at
    ? new Date(meeting.completed_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : null

  // Calculate duration
  let actualDuration = null
  if (meeting.actual_start_time && meeting.completed_at) {
    const start = new Date(meeting.actual_start_time)
    const end = new Date(meeting.completed_at)
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    actualDuration = minutes
  }

  return (
    <div className="py-8 px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-earth-brown mb-2">Meeting Summary</h1>
          <p className="text-stone-gray">{meetingChapter?.name} • {meetingDate}</p>
        </div>
        {/* Meeting Details */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Meeting Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-stone-gray">Date</p>
              <p className="font-medium text-earth-brown">{meetingDate}</p>
            </div>
            <div>
              <p className="text-sm text-stone-gray">Time</p>
              <p className="font-medium text-earth-brown">
                {startTime} {endTime && `- ${endTime}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-stone-gray">Duration</p>
              <p className="font-medium text-earth-brown">
                {actualDuration ? `${actualDuration} minutes` : `${meeting.duration_minutes} minutes (planned)`}
              </p>
            </div>
            <div>
              <p className="text-sm text-stone-gray">Location</p>
              <p className="font-medium text-earth-brown">{meeting.location}</p>
            </div>
            <div>
              <p className="text-sm text-stone-gray">Scribe</p>
              <p className="font-medium text-earth-brown">{meetingScribe?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-stone-gray">Attendance</p>
              <p className="font-medium text-earth-brown">{attendance?.length || 0} members</p>
            </div>
          </div>
        </div>

        {/* Attendees */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Attendees ({attendance?.length || 0})</h2>
          <div className="grid grid-cols-2 gap-3">
            {attendance?.map((a) => {
              const user = normalizeJoin(a.users);
              return (
              <div key={a.user_id} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-earth-brown">{user?.name}</span>
                <span className="text-xs text-stone-gray">({a.attendance_type === 'in_person' ? 'In Person' : 'Video'})</span>
              </div>
              );
            })}
          </div>
        </div>

        {/* Curriculum */}
        {curriculumModule && (
          <div className="bg-white rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Curriculum</h2>
            <p className="text-lg font-semibold text-earth-brown mb-1">{curriculumModule.title}</p>
            <p className="text-burnt-orange font-medium">{curriculumModule.principle}</p>
          </div>
        )}

        {/* Feedback Summary */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Feedback Summary</h2>

          {/* Average Rating */}
          {averageRating && (
            <div className="mb-6">
              <p className="text-sm text-stone-gray mb-2">Average Meeting Value</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-burnt-orange">{averageRating}</span>
                <span className="text-2xl text-stone-gray">/ 10</span>
              </div>
              <p className="text-sm text-stone-gray mt-1">Based on {ratings.length} responses</p>
            </div>
          )}

          {/* Most Value */}
          {topMostValue.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-earth-brown mb-3">Most Value Provided By:</p>
              <div className="space-y-2">
                {topMostValue.map(([userId, data], index) => (
                  <div key={userId} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      'bg-orange-300 text-orange-900'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-earth-brown">{data.name}</span>
                    <span className="text-sm text-stone-gray">({data.count} {data.count === 1 ? 'vote' : 'votes'})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Audio Recording */}
        {audioRecording && (
          <div className="bg-white rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Audio Recording</h2>
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-burnt-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <div>
                <p className="font-medium text-earth-brown">Recording Available</p>
                <p className="text-sm text-stone-gray">Recorded at {new Date(audioRecording.recorded_at).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-burnt-orange text-white font-semibold rounded-lg text-center hover:bg-deep-charcoal transition-colors"
          >
            Back to Dashboard
          </Link>
          <Link
            href={`/meetings/${meetingId}`}
            className="px-6 py-3 bg-gray-200 text-earth-brown font-semibold rounded-lg text-center hover:bg-gray-300 transition-colors"
          >
            View Meeting Details
          </Link>
          {nextMeeting && (
            <Link
              href={`/meetings/${nextMeeting.id}`}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg text-center hover:bg-green-700 transition-colors"
            >
              View Next Meeting →
            </Link>
          )}
        </div>
    </div>
  )
}
