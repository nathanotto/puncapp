import { createClient } from '@/lib/supabase/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { updateRsvp, checkIn, submitFeedback } from '@/lib/meetings/actions'

interface PageProps {
  params: Promise<{ chapterId: string; meetingId: string }>
}

export default async function MeetingDetailPage({ params }: PageProps) {
  const { chapterId, meetingId } = await params
  const profile = await requireAuthWithProfile()
  const supabase = await createClient()

  // Check if user is member of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('*, chapters(name)')
    .eq('chapter_id', chapterId)
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    notFound()
  }

  // Fetch meeting details
  const { data: meeting } = await supabase
    .from('meetings')
    .select(`
      *,
      curriculum_modules(title, description),
      attendance(
        user_id,
        rsvp_status,
        attendance_type,
        checked_in_at,
        users(name, username, display_preference)
      )
    `)
    .eq('id', meetingId)
    .eq('chapter_id', chapterId)
    .single()

  if (!meeting) {
    notFound()
  }

  // Get user's attendance record
  const userAttendance = meeting.attendance?.find(a => a.user_id === profile.id)

  // Check if user has submitted feedback
  const { data: existingFeedback } = await supabase
    .from('meeting_feedback')
    .select('value_rating')
    .eq('meeting_id', meetingId)
    .eq('user_id', profile.id)
    .maybeSingle()

  const meetingDate = new Date(meeting.scheduled_datetime)
  const now = new Date()
  const isPast = meetingDate < now
  const isToday = meetingDate.toDateString() === now.toDateString()
  const canCheckIn = isToday || (isPast && now.getTime() - meetingDate.getTime() < 24 * 60 * 60 * 1000) // Within 24 hours

  // RSVP actions
  async function handleRsvp(formData: FormData) {
    'use server'
    const status = formData.get('status') as 'yes' | 'no' | 'maybe'
    await updateRsvp(meetingId, status)
  }

  // Check-in actions
  async function handleCheckIn(formData: FormData) {
    'use server'
    const type = formData.get('type') as 'in_person' | 'video'
    await checkIn(meetingId, type)
  }

  // Feedback action
  async function handleFeedback(formData: FormData) {
    'use server'
    const rating = parseInt(formData.get('rating') as string)
    await submitFeedback(meetingId, rating)
  }

  // Count RSVPs
  const rsvpCounts = {
    yes: meeting.attendance?.filter(a => a.rsvp_status === 'yes').length || 0,
    no: meeting.attendance?.filter(a => a.rsvp_status === 'no').length || 0,
    maybe: meeting.attendance?.filter(a => a.rsvp_status === 'maybe').length || 0,
    no_response: meeting.attendance?.filter(a => a.rsvp_status === 'no_response').length || 0,
  }

  const checkedInCount = meeting.attendance?.filter(a => a.checked_in_at).length || 0

  return (
    <div className="min-h-screen bg-warm-cream">
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-4xl mx-auto">
          <Link href={`/chapters/${chapterId}/meetings`} className="text-sm text-warm-cream/80 hover:text-warm-cream mb-2 inline-block">
            ← Back to Meetings
          </Link>
          <h1 className="text-3xl font-bold">{meeting.topic || 'Chapter Meeting'}</h1>
          <p className="text-warm-cream/80 text-sm mt-1">{membership.chapters?.name}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="grid gap-6">
          {/* Meeting Details */}
          <Card>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">{meeting.topic || 'Chapter Meeting'}</h2>
                <div className="space-y-1 text-stone-gray">
                  <p className="text-lg">
                    {meetingDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-lg">
                    {meetingDate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <Badge variant={meeting.status === 'scheduled' ? 'info' : meeting.status === 'completed' ? 'success' : 'neutral'}>
                {meeting.status}
              </Badge>
            </div>

            {meeting.curriculum_modules && (
              <div className="mb-6 p-4 bg-warm-cream rounded-md">
                <h3 className="font-semibold text-sm text-earth-brown mb-1">Curriculum Module</h3>
                <p className="font-semibold">{meeting.curriculum_modules.title}</p>
                {meeting.curriculum_modules.description && (
                  <p className="text-sm text-stone-gray mt-1">{meeting.curriculum_modules.description}</p>
                )}
              </div>
            )}

            <div className="border-t border-border-light pt-4">
              <h3 className="font-semibold text-sm text-earth-brown mb-2">Location</h3>
              <div className="text-stone-gray">
                <p>{meeting.location.street}</p>
                <p>{meeting.location.city}, {meeting.location.state} {meeting.location.zip}</p>
              </div>
            </div>
          </Card>

          {/* User's RSVP Status */}
          {!isPast && userAttendance && (
            <Card>
              <h3 className="text-xl font-semibold mb-4">Your RSVP</h3>
              <div className="mb-4">
                <Badge variant={
                  userAttendance.rsvp_status === 'yes' ? 'success' :
                  userAttendance.rsvp_status === 'no' ? 'error' :
                  userAttendance.rsvp_status === 'maybe' ? 'warning' : 'neutral'
                }>
                  {userAttendance.rsvp_status === 'no_response' ? 'No Response' : userAttendance.rsvp_status.toUpperCase()}
                </Badge>
              </div>
              <form action={handleRsvp} className="flex gap-3">
                <input type="hidden" name="status" value="yes" />
                <Button type="submit" variant="primary" size="small">
                  RSVP Yes
                </Button>
                <button
                  type="submit"
                  formAction={async (formData) => {
                    'use server'
                    formData.set('status', 'maybe')
                    await handleRsvp(formData)
                  }}
                  className="px-4 py-2 text-sm font-medium text-earth-brown bg-warm-cream border border-border-light rounded-md hover:bg-stone-gray/10 transition-colors"
                >
                  Maybe
                </button>
                <button
                  type="submit"
                  formAction={async (formData) => {
                    'use server'
                    formData.set('status', 'no')
                    await handleRsvp(formData)
                  }}
                  className="px-4 py-2 text-sm font-medium text-earth-brown bg-warm-cream border border-border-light rounded-md hover:bg-stone-gray/10 transition-colors"
                >
                  Can't Attend
                </button>
              </form>
            </Card>
          )}

          {/* Check-in (for today's meeting or recent past) */}
          {canCheckIn && !userAttendance?.checked_in_at && (
            <Card>
              <h3 className="text-xl font-semibold mb-4">Check In</h3>
              <p className="text-stone-gray mb-4">Check in to confirm your attendance at this meeting</p>
              <form action={handleCheckIn} className="flex gap-3">
                <input type="hidden" name="type" value="in_person" />
                <Button type="submit" variant="primary" size="small">
                  Check In (In Person)
                </Button>
                <button
                  type="submit"
                  formAction={async (formData) => {
                    'use server'
                    formData.set('type', 'video')
                    await handleCheckIn(formData)
                  }}
                  className="px-4 py-2 text-sm font-medium text-earth-brown bg-warm-cream border border-border-light rounded-md hover:bg-stone-gray/10 transition-colors"
                >
                  Check In (Video)
                </button>
              </form>
            </Card>
          )}

          {/* Already checked in */}
          {userAttendance?.checked_in_at && (
            <Card>
              <div className="flex items-center gap-3">
                <Badge variant="success">Checked In</Badge>
                <p className="text-stone-gray">
                  You checked in {userAttendance.attendance_type === 'in_person' ? 'in person' : 'via video'} on{' '}
                  {new Date(userAttendance.checked_in_at).toLocaleString()}
                </p>
              </div>
            </Card>
          )}

          {/* Feedback (for past meetings) */}
          {isPast && userAttendance?.checked_in_at && !existingFeedback && (
            <Card>
              <h3 className="text-xl font-semibold mb-4">Meeting Feedback</h3>
              <p className="text-stone-gray mb-4">How valuable was this meeting? (1 = Not valuable, 10 = Extremely valuable)</p>
              <form action={handleFeedback}>
                <div className="flex items-center gap-4 mb-4">
                  <input
                    type="range"
                    name="rating"
                    min="1"
                    max="10"
                    defaultValue="5"
                    className="flex-1"
                    id="rating-slider"
                  />
                  <output htmlFor="rating-slider" className="text-2xl font-bold text-earth-brown w-12 text-center">
                    5
                  </output>
                </div>
                <script dangerouslySetInnerHTML={{
                  __html: `
                    document.getElementById('rating-slider')?.addEventListener('input', (e) => {
                      e.target.nextElementSibling.textContent = e.target.value
                    })
                  `
                }} />
                <Button type="submit" variant="primary" size="small">
                  Submit Feedback
                </Button>
              </form>
            </Card>
          )}

          {/* Existing feedback */}
          {existingFeedback && (
            <Card>
              <h3 className="text-xl font-semibold mb-2">Your Feedback</h3>
              <p className="text-stone-gray">
                You rated this meeting <span className="font-bold text-earth-brown">{existingFeedback.value_rating}/10</span>
              </p>
            </Card>
          )}

          {/* Attendance Stats */}
          <Card>
            <h3 className="text-xl font-semibold mb-4">Attendance Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold text-earth-brown">{rsvpCounts.yes}</p>
                <p className="text-sm text-stone-gray">Yes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-earth-brown">{rsvpCounts.maybe}</p>
                <p className="text-sm text-stone-gray">Maybe</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-earth-brown">{rsvpCounts.no}</p>
                <p className="text-sm text-stone-gray">Can't Attend</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-earth-brown">{checkedInCount}</p>
                <p className="text-sm text-stone-gray">Checked In</p>
              </div>
            </div>

            {isPast && (
              <div className="mt-6 pt-4 border-t border-border-light">
                <h4 className="font-semibold mb-3">Who Attended</h4>
                <div className="space-y-2">
                  {meeting.attendance
                    ?.filter(a => a.checked_in_at)
                    .map(a => (
                      <div key={a.user_id} className="flex items-center justify-between">
                        <span className="text-stone-gray">
                          {a.users?.display_preference === 'real_name' ? a.users.name : a.users?.username}
                        </span>
                        <Badge variant="info" size="small">
                          {a.attendance_type === 'in_person' ? 'In Person' : 'Video'}
                        </Badge>
                      </div>
                    ))}
                  {checkedInCount === 0 && (
                    <p className="text-stone-gray text-sm">No one has checked in yet</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
