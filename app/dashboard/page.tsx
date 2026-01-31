import { requireAuthWithProfile } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { signOut } from '@/lib/auth/client'

export default async function DashboardPage() {
  const profile = await requireAuthWithProfile()
  const supabase = await createClient()

  // Fetch user's chapters
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select('chapter_id, chapters(id, name, status, funding_status)')
    .eq('user_id', profile.id)
    .eq('is_active', true)

  const chapters = memberships?.map(m => m.chapters).filter(Boolean) || []

  // Fetch user's roles
  const { data: roles } = await supabase
    .from('chapter_roles')
    .select('role_type, chapter_id')
    .eq('user_id', profile.id)

  // Fetch upcoming meetings for user's chapters
  const chapterIds = chapters.map(c => c.id)
  const { data: meetings } = chapterIds.length > 0 ? await supabase
    .from('meetings')
    .select('id, chapter_id, scheduled_datetime, topic, status, location')
    .in('chapter_id', chapterIds)
    .gte('scheduled_datetime', new Date().toISOString())
    .eq('status', 'scheduled')
    .order('scheduled_datetime', { ascending: true })
    .limit(5) : { data: [] }

  // Fetch user's attendance stats
  const { count: attendanceCount } = chapterIds.length > 0 ? await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('attendance_type', 'in_person') : { count: 0 }

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header */}
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {profile.display_preference === 'real_name' ? profile.name : profile.username}
            </h1>
            <p className="text-warm-cream/80 text-sm">
              {profile.status === 'unassigned' ? 'Not yet in a chapter' : 'Chapter Member'}
            </p>
          </div>
          <form action={async () => {
            'use server'
            const { createClient } = await import('@/lib/supabase/server')
            const supabase = await createClient()
            await supabase.auth.signOut()
            redirect('/auth/signin')
          }}>
            <Button type="submit" variant="secondary" size="small">
              Sign Out
            </Button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-12 px-6">
        {/* Status Badge */}
        <div className="mb-8">
          {profile.status === 'unassigned' && (
            <Badge variant="warning">Unassigned - No Chapter Yet</Badge>
          )}
          {profile.status === 'assigned' && (
            <Badge variant="success">Active Chapter Member</Badge>
          )}
          {profile.leader_certified && (
            <Badge variant="info" className="ml-2">Leader Certified</Badge>
          )}
        </div>

        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-earth-brown mb-4">
            Welcome to PUNC Chapters
          </h2>
          <p className="text-lg text-stone-gray">
            Your chapter management dashboard. This is where you'll see your upcoming meetings, commitments, and chapter information.
          </p>
        </div>

        {/* Profile Card */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <h3 className="text-xl font-semibold mb-4">Your Profile</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Name</dt>
                <dd className="text-base">{profile.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Username</dt>
                <dd className="text-base">@{profile.username}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Email</dt>
                <dd className="text-base">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Phone</dt>
                <dd className="text-base">{profile.phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Address</dt>
                <dd className="text-base">{profile.address}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Display Preference</dt>
                <dd className="text-base capitalize">{profile.display_preference.replace('_', ' ')}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold mb-4">Getting Started</h3>
            <div className="space-y-4">
              {profile.status === 'unassigned' ? (
                <>
                  <p className="text-stone-gray">
                    You're not yet in a chapter. Here's what you can do:
                  </p>
                  <ul className="space-y-2 text-stone-gray">
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>Search for existing chapters near you</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>Join a forming chapter in your area</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>Request a new chapter to be formed</span>
                    </li>
                  </ul>
                  <Button variant="primary" fullWidth disabled>
                    Find Chapters (Coming Soon)
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-stone-gray">
                    You're all set! Features coming soon:
                  </p>
                  <ul className="space-y-2 text-stone-gray">
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>View upcoming meetings</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>RSVP to meetings</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>Track your commitments</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>View chapter members</span>
                    </li>
                  </ul>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Chapters */}
        {chapters.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-earth-brown mb-4">Your Chapters</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {chapters.map((chapter: any) => {
                const userRole = roles?.find(r => r.chapter_id === chapter.id)
                return (
                  <Card key={chapter.id}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold">{chapter.name}</h3>
                      <Badge variant={chapter.status === 'open' ? 'success' : 'warning'}>
                        {chapter.status}
                      </Badge>
                    </div>
                    {userRole && (
                      <Badge variant="info" className="mb-3">{userRole.role_type}</Badge>
                    )}
                    <div className="space-y-2 text-sm text-stone-gray">
                      <p>Funding Status: <span className="font-semibold capitalize">{chapter.funding_status.replace('_', ' ')}</span></p>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <h3 className="text-xl font-semibold mb-4">Upcoming Meetings</h3>
            {meetings && meetings.length > 0 ? (
              <div className="space-y-3">
                {meetings.map((meeting: any) => {
                  const chapter = chapters.find((c: any) => c.id === meeting.chapter_id)
                  const date = new Date(meeting.scheduled_datetime)
                  return (
                    <div key={meeting.id} className="border-l-4 border-burnt-orange pl-3">
                      <p className="font-semibold text-sm">{meeting.topic}</p>
                      <p className="text-xs text-stone-gray">{chapter?.name}</p>
                      <p className="text-xs text-stone-gray">
                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-stone-gray">No upcoming meetings</p>
            )}
          </Card>

          <Card>
            <h3 className="text-xl font-semibold mb-4">Your Stats</h3>
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold text-earth-brown">{chapters.length}</p>
                <p className="text-sm text-stone-gray">Active Chapters</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-earth-brown">{attendanceCount || 0}</p>
                <p className="text-sm text-stone-gray">Meetings Attended</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-earth-brown">{meetings?.length || 0}</p>
                <p className="text-sm text-stone-gray">Upcoming Meetings</p>
              </div>
            </div>
          </Card>

          <Card className="opacity-50">
            <h3 className="text-xl font-semibold mb-2">My Commitments</h3>
            <p className="text-sm text-stone-gray">Coming in Phase 2</p>
          </Card>
        </div>
      </main>
    </div>
  )
}
