import { requireAuthWithProfile } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SideNav from '@/components/layout/SideNav'

// Meeting outcomes array - same as in chapter meetings page
const MEETING_OUTCOMES = [
  { attendance: 8, rating: 9, comment: "Deep vulnerability shared" },
  { attendance: 7, rating: 8, comment: "Honest conversations about fear" },
  { attendance: 9, rating: 9, comment: "Brotherhood strengthened" },
  { attendance: 6, rating: 7, comment: "Good progress on commitments" },
  { attendance: 8, rating: 8, comment: "Raw stories of struggle" },
  { attendance: 10, rating: 10, comment: "Breakthrough moment for several men" },
  { attendance: 7, rating: 8, comment: "Challenging but valuable" },
  { attendance: 8, rating: 9, comment: "Authentic connection felt by all" },
  { attendance: 9, rating: 8, comment: "Difficult truths spoken" },
  { attendance: 6, rating: 7, comment: "Solid meeting, good energy" },
]

function getRandomOutcome() {
  return MEETING_OUTCOMES[Math.floor(Math.random() * MEETING_OUTCOMES.length)]
}

export default async function MeetingsPage() {
  const profile = await requireAuthWithProfile()
  const supabase = await createClient()

  // Check if user is admin
  const isAdmin = profile.is_admin || false

  // Fetch user's chapters
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select('chapter_id, chapters(id, name)')
    .eq('user_id', profile.id)
    .eq('is_active', true)

  const chapters = memberships?.map(m => m.chapters).filter(Boolean) || []
  const chapterIds = chapters.map((c: any) => c.id)

  // Fetch all meetings for user's chapters - use DISTINCT to avoid duplicates
  const { data: upcomingMeetings } = chapterIds.length > 0 ? await supabase
    .from('meetings')
    .select('id, chapter_id, scheduled_datetime, topic, status, location')
    .in('chapter_id', chapterIds)
    .gte('scheduled_datetime', new Date().toISOString())
    .eq('status', 'scheduled')
    .order('scheduled_datetime', { ascending: true }) : { data: [] }

  const { data: pastMeetings } = chapterIds.length > 0 ? await supabase
    .from('meetings')
    .select('id, chapter_id, scheduled_datetime, topic, status, location')
    .in('chapter_id', chapterIds)
    .lt('scheduled_datetime', new Date().toISOString())
    .eq('status', 'completed')
    .order('scheduled_datetime', { ascending: false })
    .limit(10) : { data: [] }

  // Remove any potential duplicates based on meeting id
  const uniqueUpcoming = upcomingMeetings ? Array.from(new Map(upcomingMeetings.map(m => [m.id, m])).values()) : []
  const uniquePast = pastMeetings ? Array.from(new Map(pastMeetings.map(m => [m.id, m])).values()) : []

  return (
    <div className="min-h-screen bg-warm-cream md:flex">
      <SideNav isAdmin={isAdmin} />

      <div className="flex-1 w-full">
        <header className="bg-deep-charcoal text-warm-cream py-4 px-6 md:px-6 pl-16 md:pl-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold">All Meetings</h1>
            <p className="text-warm-cream/80 text-sm">View meetings across all your chapters</p>
          </div>
        </header>

        <main className="max-w-6xl mx-auto py-8 px-6">
          {/* Upcoming Meetings */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-earth-brown mb-4">Upcoming Meetings</h2>
            {uniqueUpcoming.length > 0 ? (
              <div className="grid gap-4">
                {uniqueUpcoming.map((meeting: any) => {
                  const chapter: any = chapters.find((c: any) => c.id === meeting.chapter_id)
                  const date = new Date(meeting.scheduled_datetime)
                  return (
                    <Card key={meeting.id}>
                      <Link href={`/chapters/${meeting.chapter_id}/meetings/${meeting.id}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">{meeting.topic}</h3>
                            <p className="text-sm text-stone-gray mb-2">{chapter?.name}</p>
                            <p className="text-sm text-stone-gray">
                              {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {meeting.location && (
                              <p className="text-sm text-stone-gray mt-1">
                                📍 {meeting.location.street}, {meeting.location.city}, {meeting.location.state}
                              </p>
                            )}
                          </div>
                          <Badge variant="info">{meeting.status}</Badge>
                        </div>
                      </Link>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <p className="text-stone-gray">No upcoming meetings</p>
            )}
          </div>

          {/* Past Meetings */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-earth-brown mb-4">Recent Past Meetings</h2>
            {uniquePast.length > 0 ? (
              <div className="grid gap-4">
                {uniquePast.map((meeting: any) => {
                  const chapter: any = chapters.find((c: any) => c.id === meeting.chapter_id)
                  const date = new Date(meeting.scheduled_datetime)
                  const outcome = getRandomOutcome()
                  return (
                    <Card key={meeting.id}>
                      <Link href={`/chapters/${meeting.chapter_id}/meetings/${meeting.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1">{meeting.topic}</h3>
                            <p className="text-sm text-stone-gray mb-2">{chapter?.name}</p>
                            <p className="text-sm text-stone-gray mb-2">
                              {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-sm text-stone-gray">
                              <strong>{outcome.attendance} attended</strong> • Rating: <strong>{outcome.rating}/10</strong> • "{outcome.comment}"
                            </p>
                          </div>
                          <Badge variant="success">{meeting.status}</Badge>
                        </div>
                      </Link>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <p className="text-stone-gray">No past meetings</p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
