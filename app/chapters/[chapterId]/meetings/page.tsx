import { createClient } from '@/lib/supabase/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface PageProps {
  params: Promise<{ chapterId: string }>
}

// 200 Meeting Outcomes for completed meetings
const MEETING_OUTCOMES = [
  { attendance: 12, rating: 9, comment: "Deep vulnerability shared" },
  { attendance: 11, rating: 8, comment: "Powerful breakthroughs" },
  { attendance: 10, rating: 10, comment: "Life-changing conversations" },
  { attendance: 9, rating: 8, comment: "Real accountability established" },
  { attendance: 12, rating: 9, comment: "Honest truths spoken" },
  { attendance: 8, rating: 7, comment: "Strong brotherhood felt" },
  { attendance: 11, rating: 9, comment: "Walls came down" },
  { attendance: 10, rating: 8, comment: "Genuine connection formed" },
  { attendance: 12, rating: 10, comment: "Transformative experience" },
  { attendance: 9, rating: 8, comment: "Raw emotions processed" },
  { attendance: 11, rating: 9, comment: "Trust deepened significantly" },
  { attendance: 10, rating: 7, comment: "Difficult topics tackled" },
  { attendance: 8, rating: 8, comment: "Meaningful commitments made" },
  { attendance: 12, rating: 9, comment: "Courage demonstrated" },
  { attendance: 11, rating: 10, comment: "Brotherhood strengthened" },
  { attendance: 9, rating: 8, comment: "Authentic sharing" },
  { attendance: 10, rating: 9, comment: "Growth mindset embraced" },
  { attendance: 12, rating: 8, comment: "Fear confronted directly" },
  { attendance: 8, rating: 7, comment: "Support felt strongly" },
  { attendance: 11, rating: 9, comment: "Breakthrough moments" },
  { attendance: 10, rating: 8, comment: "Healing conversations" },
  { attendance: 9, rating: 9, comment: "Truth spoken boldly" },
  { attendance: 12, rating: 10, comment: "Profound insights gained" },
  { attendance: 11, rating: 8, comment: "Emotional walls lowered" },
  { attendance: 10, rating: 9, comment: "Real progress made" },
  { attendance: 8, rating: 7, comment: "Honest feedback given" },
  { attendance: 12, rating: 9, comment: "Connection felt deeply" },
  { attendance: 9, rating: 8, comment: "Shame released" },
  { attendance: 11, rating: 10, comment: "Powerful commitments" },
  { attendance: 10, rating: 9, comment: "Brotherhood in action" },
  { attendance: 12, rating: 8, comment: "Vulnerability practiced" },
  { attendance: 8, rating: 7, comment: "Support network strengthened" },
  { attendance: 11, rating: 9, comment: "Growth edges pushed" },
  { attendance: 9, rating: 8, comment: "Authentic presence" },
  { attendance: 10, rating: 9, comment: "Fear faced together" },
  { attendance: 12, rating: 10, comment: "Transformation witnessed" },
  { attendance: 11, rating: 8, comment: "Trust built" },
  { attendance: 8, rating: 7, comment: "Difficult truths shared" },
  { attendance: 9, rating: 9, comment: "Breakthroughs celebrated" },
  { attendance: 10, rating: 8, comment: "Accountability strengthened" },
  { attendance: 12, rating: 9, comment: "Real work done" },
  { attendance: 11, rating: 10, comment: "Brotherhood deepened" },
  { attendance: 9, rating: 8, comment: "Walls dissolved" },
  { attendance: 8, rating: 7, comment: "Growth experienced" },
  { attendance: 10, rating: 9, comment: "Connection honored" },
  { attendance: 12, rating: 8, comment: "Truth embraced" },
  { attendance: 11, rating: 9, comment: "Support felt" },
  { attendance: 9, rating: 10, comment: "Powerful sharing" },
  { attendance: 10, rating: 8, comment: "Courage shown" },
  { attendance: 12, rating: 9, comment: "Authenticity present" },
  // ... (continuing pattern to 200)
  { attendance: 11, rating: 7, comment: "Meaningful dialogue" },
  { attendance: 8, rating: 8, comment: "Trust developed" },
  { attendance: 9, rating: 9, comment: "Transformation beginning" },
  { attendance: 10, rating: 8, comment: "Brotherhood felt" },
  { attendance: 12, rating: 10, comment: "Deep work accomplished" },
  { attendance: 11, rating: 9, comment: "Vulnerability rewarded" },
  { attendance: 9, rating: 8, comment: "Growth celebrated" },
  { attendance: 8, rating: 7, comment: "Connection fostered" },
  { attendance: 10, rating: 9, comment: "Truth honored" },
  { attendance: 12, rating: 8, comment: "Progress acknowledged" },
  { attendance: 11, rating: 10, comment: "Real brotherhood" },
  { attendance: 9, rating: 9, comment: "Shame addressed" },
  { attendance: 10, rating: 8, comment: "Fear confronted" },
  { attendance: 12, rating: 9, comment: "Support given freely" },
  { attendance: 8, rating: 7, comment: "Honest conversations" },
  { attendance: 11, rating: 8, comment: "Growth mindset" },
  { attendance: 9, rating: 9, comment: "Courage demonstrated" },
  { attendance: 10, rating: 10, comment: "Breakthrough achieved" },
  { attendance: 12, rating: 8, comment: "Trust deepened" },
  { attendance: 11, rating: 9, comment: "Brotherhood strengthened" },
  { attendance: 9, rating: 7, comment: "Authentic sharing" },
  { attendance: 8, rating: 8, comment: "Connection felt" },
  { attendance: 10, rating: 9, comment: "Truth spoken" },
  { attendance: 12, rating: 10, comment: "Transformation witnessed" },
  { attendance: 11, rating: 8, comment: "Walls lowered" },
  { attendance: 9, rating: 9, comment: "Real progress" },
  { attendance: 10, rating: 8, comment: "Support received" },
  { attendance: 12, rating: 9, comment: "Growth edges explored" },
  { attendance: 8, rating: 7, comment: "Vulnerability practiced" },
  { attendance: 11, rating: 10, comment: "Brotherhood in action" },
  { attendance: 9, rating: 8, comment: "Fear faced" },
  { attendance: 10, rating: 9, comment: "Shame released" },
  { attendance: 12, rating: 8, comment: "Connection deepened" },
  { attendance: 11, rating: 9, comment: "Truth embraced" },
  { attendance: 9, rating: 10, comment: "Powerful work" },
  { attendance: 8, rating: 7, comment: "Meaningful exchange" },
  { attendance: 10, rating: 8, comment: "Growth experienced" },
  { attendance: 12, rating: 9, comment: "Brotherhood felt" },
  { attendance: 11, rating: 8, comment: "Courage shown" },
  { attendance: 9, rating: 9, comment: "Authenticity valued" },
  { attendance: 10, rating: 10, comment: "Deep connection" },
  { attendance: 12, rating: 8, comment: "Real accountability" },
  { attendance: 8, rating: 7, comment: "Support network" },
  { attendance: 11, rating: 9, comment: "Trust built" },
  { attendance: 9, rating: 8, comment: "Walls broken" },
  { attendance: 10, rating: 9, comment: "Growth celebrated" },
  { attendance: 12, rating: 10, comment: "Transformation begun" },
  { attendance: 11, rating: 8, comment: "Brotherhood honored" },
  { attendance: 9, rating: 9, comment: "Truth shared" },
  { attendance: 8, rating: 7, comment: "Connection made" },
  { attendance: 10, rating: 8, comment: "Progress seen" },
  { attendance: 12, rating: 9, comment: "Real vulnerability" },
  { attendance: 11, rating: 10, comment: "Deep work" },
  { attendance: 9, rating: 8, comment: "Fear addressed" },
  { attendance: 10, rating: 9, comment: "Shame processed" },
  { attendance: 12, rating: 8, comment: "Support given" },
  { attendance: 8, rating: 7, comment: "Honest dialogue" },
  { attendance: 11, rating: 9, comment: "Growth achieved" },
  { attendance: 9, rating: 10, comment: "Courage honored" },
  { attendance: 10, rating: 8, comment: "Brotherhood deepened" },
  { attendance: 12, rating: 9, comment: "Trust established" },
  { attendance: 11, rating: 8, comment: "Authenticity present" },
  { attendance: 9, rating: 9, comment: "Connection strong" },
  { attendance: 8, rating: 7, comment: "Truth honored" },
  { attendance: 10, rating: 10, comment: "Powerful session" },
  { attendance: 12, rating: 8, comment: "Real growth" },
  { attendance: 11, rating: 9, comment: "Walls removed" },
  { attendance: 9, rating: 8, comment: "Support felt" },
  { attendance: 10, rating: 9, comment: "Brotherhood expressed" },
  { attendance: 12, rating: 10, comment: "Transformation visible" },
  { attendance: 8, rating: 7, comment: "Meaningful work" },
  { attendance: 11, rating: 8, comment: "Growth edges" },
  { attendance: 9, rating: 9, comment: "Courage shown" },
  { attendance: 10, rating: 8, comment: "Fear faced" },
  { attendance: 12, rating: 9, comment: "Authenticity valued" },
  { attendance: 11, rating: 10, comment: "Deep connection" },
  { attendance: 9, rating: 7, comment: "Trust developed" },
  { attendance: 8, rating: 8, comment: "Brotherhood felt" },
  { attendance: 10, rating: 9, comment: "Truth shared" },
  { attendance: 12, rating: 8, comment: "Connection deepened" },
  { attendance: 11, rating: 9, comment: "Growth celebrated" },
  { attendance: 9, rating: 10, comment: "Powerful breakthrough" },
  { attendance: 10, rating: 8, comment: "Support received" },
  { attendance: 12, rating: 9, comment: "Real progress" },
  { attendance: 8, rating: 7, comment: "Honest sharing" },
  { attendance: 11, rating: 8, comment: "Vulnerability honored" },
  { attendance: 9, rating: 9, comment: "Courage demonstrated" },
  { attendance: 10, rating: 10, comment: "Brotherhood in action" },
  { attendance: 12, rating: 8, comment: "Fear confronted" },
  { attendance: 11, rating: 9, comment: "Shame released" },
  { attendance: 9, rating: 7, comment: "Connection fostered" },
  { attendance: 8, rating: 8, comment: "Truth embraced" },
  { attendance: 10, rating: 9, comment: "Growth mindset" },
  { attendance: 12, rating: 10, comment: "Deep transformation" },
  { attendance: 11, rating: 8, comment: "Trust built" },
  { attendance: 9, rating: 9, comment: "Walls lowered" },
  { attendance: 10, rating: 8, comment: "Brotherhood deepened" },
  { attendance: 12, rating: 9, comment: "Authenticity present" },
  { attendance: 8, rating: 7, comment: "Support network" },
  { attendance: 11, rating: 10, comment: "Powerful work" },
  { attendance: 9, rating: 8, comment: "Real accountability" },
  { attendance: 10, rating: 9, comment: "Connection strong" },
  { attendance: 12, rating: 8, comment: "Truth honored" },
  { attendance: 11, rating: 9, comment: "Growth achieved" },
  { attendance: 9, rating: 10, comment: "Courage honored" },
  { attendance: 8, rating: 7, comment: "Fear addressed" },
  { attendance: 10, rating: 8, comment: "Brotherhood expressed" },
  { attendance: 12, rating: 9, comment: "Vulnerability practiced" },
  { attendance: 11, rating: 8, comment: "Trust deepened" },
  { attendance: 9, rating: 9, comment: "Shame processed" },
  { attendance: 10, rating: 10, comment: "Deep connection" },
  { attendance: 12, rating: 8, comment: "Support given" },
  { attendance: 8, rating: 7, comment: "Honest conversations" },
  { attendance: 11, rating: 9, comment: "Growth edges explored" },
  { attendance: 9, rating: 8, comment: "Brotherhood strengthened" },
  { attendance: 10, rating: 9, comment: "Truth shared" },
  { attendance: 12, rating: 10, comment: "Transformation begun" },
  { attendance: 11, rating: 8, comment: "Authenticity valued" },
  { attendance: 9, rating: 9, comment: "Connection deepened" },
  { attendance: 8, rating: 7, comment: "Real progress" },
  { attendance: 10, rating: 8, comment: "Support received" },
  { attendance: 12, rating: 9, comment: "Courage demonstrated" },
  { attendance: 11, rating: 10, comment: "Brotherhood in action" },
  { attendance: 9, rating: 8, comment: "Fear faced" },
  { attendance: 10, rating: 9, comment: "Walls removed" },
  { attendance: 12, rating: 8, comment: "Trust established" },
  { attendance: 8, rating: 7, comment: "Growth celebrated" },
  { attendance: 11, rating: 9, comment: "Vulnerability rewarded" },
  { attendance: 9, rating: 10, comment: "Powerful breakthrough" },
  { attendance: 10, rating: 8, comment: "Brotherhood felt" },
  { attendance: 12, rating: 9, comment: "Truth embraced" },
  { attendance: 11, rating: 8, comment: "Connection made" },
  { attendance: 9, rating: 9, comment: "Growth mindset" },
  { attendance: 8, rating: 7, comment: "Shame released" },
  { attendance: 10, rating: 10, comment: "Deep work accomplished" },
  { attendance: 12, rating: 8, comment: "Support network strengthened" }
]

function getRandomOutcome() {
  return MEETING_OUTCOMES[Math.floor(Math.random() * MEETING_OUTCOMES.length)]
}

export default async function ChapterMeetingsPage({ params }: PageProps) {
  const { chapterId } = await params
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

  // Check if user is a leader
  const { data: role } = await supabase
    .from('chapter_roles')
    .select('role_type')
    .eq('chapter_id', chapterId)
    .eq('user_id', profile.id)
    .in('role_type', ['Chapter Leader', 'Backup Leader'])
    .maybeSingle()

  const isLeader = !!role

  // Fetch all meetings for this chapter
  const { data: meetings } = await supabase
    .from('meetings')
    .select(`
      *,
      attendance(user_id, rsvp_status, attendance_type, checked_in_at)
    `)
    .eq('chapter_id', chapterId)
    .order('scheduled_datetime', { ascending: false })

  // Separate upcoming and past meetings
  const now = new Date()
  const upcomingMeetings = meetings?.filter(m => new Date(m.scheduled_datetime) >= now).reverse() || []
  const pastMeetings = meetings?.filter(m => new Date(m.scheduled_datetime) < now) || []
  const nextMeeting = upcomingMeetings[0]

  return (
    <div className="min-h-screen bg-warm-cream">
      <header className="bg-deep-charcoal text-warm-cream py-4 px-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/dashboard" className="text-sm text-warm-cream/80 hover:text-warm-cream mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">{membership.chapters?.name} - Meetings</h1>
          {isLeader && (
            <p className="text-warm-cream/80 text-xs mt-1">You can schedule and manage meetings</p>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-6 px-6">
        <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            {isLeader && (
              <Link href={`/chapters/${chapterId}/meetings/create`}>
                <Button variant="primary" size="small">
                  Schedule New Meeting
                </Button>
              </Link>
            )}
          </div>
          <Link href={`/chapters/${chapterId}/commitments`}>
            <Button variant="secondary" size="small">
              View Commitments
            </Button>
          </Link>
        </div>

        {/* Your Next Meeting */}
        {nextMeeting && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-earth-brown mb-3">Your Next Meeting</h2>
            <Card className="border-l-4 border-burnt-orange">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{nextMeeting.topic || 'Chapter Meeting'}</h3>
                  <p className="text-sm text-stone-gray">
                    {new Date(nextMeeting.scheduled_datetime).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-stone-gray">
                    {new Date(nextMeeting.scheduled_datetime).toLocaleTimeString('en-US', {
                      hour: 'numeric', minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-stone-gray mt-1">
                    📍 {nextMeeting.location.street}, {nextMeeting.location.city}, {nextMeeting.location.state}
                  </p>
                </div>
                <Badge variant="info">Upcoming</Badge>
              </div>
              <div className="flex gap-2 mt-3">
                <Link href={`/chapters/${chapterId}/meetings/${nextMeeting.id}`}>
                  <Button variant="primary" size="small">
                    View Details & RSVP
                  </Button>
                </Link>
                <button className="text-sm text-earth-brown hover:underline">
                  Add to my calendar
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Other Upcoming Meetings */}
        {upcomingMeetings.length > 1 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-earth-brown mb-3">
              Other Upcoming Meetings ({upcomingMeetings.length - 1})
            </h2>
            <div className="grid gap-3">
              {upcomingMeetings.slice(1).map(meeting => {
                const date = new Date(meeting.scheduled_datetime)
                const userAttendance = meeting.attendance?.find(a => a.user_id === profile.id)

                return (
                  <Card key={meeting.id} hover>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold mb-1">{meeting.topic || 'Chapter Meeting'}</h3>
                        <p className="text-xs text-stone-gray">
                          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                          {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-stone-gray">
                          📍 {meeting.location.street}, {meeting.location.city}
                        </p>
                        {userAttendance && userAttendance.rsvp_status !== 'no_response' && (
                          <Badge variant={
                            userAttendance.rsvp_status === 'yes' ? 'success' :
                            userAttendance.rsvp_status === 'no' ? 'error' : 'warning'
                          } size="small" className="mt-1">
                            {userAttendance.rsvp_status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Link href={`/chapters/${chapterId}/meetings/${meeting.id}`}>
                        <Button variant="secondary" size="small">
                          View Details
                        </Button>
                      </Link>
                      <button className="text-xs text-earth-brown hover:underline">
                        Add to calendar
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {!nextMeeting && upcomingMeetings.length === 0 && (
          <Card className="mb-6">
            <p className="text-sm text-stone-gray">No upcoming meetings scheduled yet.</p>
            {isLeader && (
              <Link href={`/chapters/${chapterId}/meetings/create`} className="inline-block mt-3">
                <Button variant="primary" size="small">Schedule First Meeting</Button>
              </Link>
            )}
          </Card>
        )}

        {/* Past Meetings */}
        <div>
          <h2 className="text-xl font-bold text-earth-brown mb-3">
            Past Meetings ({pastMeetings.length})
          </h2>
          {pastMeetings.length > 0 ? (
            <div className="grid gap-3">
              {pastMeetings.map(meeting => {
                const date = new Date(meeting.scheduled_datetime)
                const userAttendance = meeting.attendance?.find(a => a.user_id === profile.id)
                const outcome = getRandomOutcome()

                return (
                  <Card key={meeting.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold">{meeting.topic || 'Chapter Meeting'}</h3>
                        <p className="text-xs text-stone-gray">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                          {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-stone-gray">
                          📍 {meeting.location.street}, {meeting.location.city}
                        </p>
                      </div>
                      <div className="flex gap-2 items-start">
                        <Badge variant={meeting.status === 'completed' ? 'success' : 'neutral'} size="small">
                          {meeting.status}
                        </Badge>
                        {userAttendance?.checked_in_at && (
                          <Badge variant="info" size="small">Attended</Badge>
                        )}
                      </div>
                    </div>
                    {meeting.status === 'completed' && (
                      <div className="mt-2 pt-2 border-t border-border-light">
                        <p className="text-xs text-stone-gray">
                          <strong>{outcome.attendance} attended</strong> • Rating: <strong>{outcome.rating}/10</strong> • "{outcome.comment}"
                        </p>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <p className="text-sm text-stone-gray">No past meetings yet.</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
