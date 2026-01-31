import { requireAuthWithProfile } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SideNav from '@/components/layout/SideNav'

export default async function MeetingsPage() {
  const profile = await requireAuthWithProfile()
  const supabase = await createClient()

  // Fetch user's chapters
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select('chapter_id, chapters(id, name)')
    .eq('user_id', profile.id)
    .eq('is_active', true)

  const chapters = memberships?.map(m => m.chapters).filter(Boolean) || []
  const chapterIds = chapters.map(c => c.id)

  // Fetch all meetings for user's chapters
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

  return (
    <div className="min-h-screen bg-warm-cream md:flex">
      <SideNav />

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
            {upcomingMeetings && upcomingMeetings.length > 0 ? (
              <div className="grid gap-4">
                {upcomingMeetings.map((meeting: any) => {
                  const chapter = chapters.find((c: any) => c.id === meeting.chapter_id)
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
            {pastMeetings && pastMeetings.length > 0 ? (
              <div className="grid gap-4">
                {pastMeetings.map((meeting: any) => {
                  const chapter = chapters.find((c: any) => c.id === meeting.chapter_id)
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
