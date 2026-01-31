import { requireAuthWithProfile } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SideNav from '@/components/layout/SideNav'

export default async function DashboardPage() {
  const profile = await requireAuthWithProfile()
  const supabase = await createClient()

  // Check if user is admin
  const isAdmin = profile.is_admin || false

  // Fetch user's chapters
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select('chapter_id, chapters(id, name, status)')
    .eq('user_id', profile.id)
    .eq('is_active', true)

  const chapters = memberships?.map(m => m.chapters).filter(Boolean) || []

  // Fetch user's roles
  const { data: roles } = await supabase
    .from('chapter_roles')
    .select('role_type, chapter_id')
    .eq('user_id', profile.id)

  // Fetch upcoming meetings for user's chapters
  const chapterIds = chapters.map((c: any) => c.id)
  const { data: meetings } = chapterIds.length > 0 ? await supabase
    .from('meetings')
    .select('id, chapter_id, scheduled_datetime, topic, status')
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
    .not('checked_in_at', 'is', null) : { count: 0 }

  // Fetch user's active commitments
  const { data: activeCommitments } = chapterIds.length > 0 ? await supabase
    .from('commitments')
    .select(`
      id,
      chapter_id,
      description,
      commitment_type,
      deadline,
      status,
      chapters(name)
    `)
    .eq('made_by', profile.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5) : { data: [] }

  // Fetch completed commitments count
  const { count: completedCount } = chapterIds.length > 0 ? await supabase
    .from('commitments')
    .select('*', { count: 'exact', head: true })
    .eq('made_by', profile.id)
    .eq('status', 'completed') : { count: 0 }

  const now = new Date()

  return (
    <div className="min-h-screen bg-warm-cream md:flex">
      {/* Side Navigation */}
      <SideNav isAdmin={isAdmin} />

      {/* Main Content Area */}
      <div className="flex-1 w-full">
        {/* Header */}
        <header className="bg-deep-charcoal text-warm-cream py-4 px-6 md:px-6 pl-16 md:pl-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold">
              {profile.display_preference === 'real_name' ? profile.name : profile.username}
            </h1>
            <p className="text-warm-cream/80 text-sm">
              {profile.status === 'unassigned' ? 'Not yet in a chapter' : 'Chapter Member'}
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto py-8 px-6">
        {/* Status Badge */}
        <div className="mb-6">
          {profile.status === 'assigned' && (
            <Badge variant="success">Active Chapter Member</Badge>
          )}
          {profile.leader_certified && (
            <Badge variant="info" className="ml-2">Leader Certified</Badge>
          )}
        </div>

        {/* Your Chapters - Now at top */}
        {chapters.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-earth-brown mb-4">Your Chapters</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {chapters.map((chapter: any) => {
                const userRole = roles?.find(r => r.chapter_id === chapter.id)
                const nextMeeting = meetings?.find((m: any) => m.chapter_id === chapter.id)
                return (
                  <Card key={chapter.id}>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold">{chapter.name}</h3>
                      <Badge variant={chapter.status === 'open' ? 'success' : 'warning'}>
                        {chapter.status}
                      </Badge>
                    </div>
                    {userRole && (
                      <Badge variant="info" className="mb-3">{userRole.role_type}</Badge>
                    )}
                    {nextMeeting ? (
                      <p className="text-sm text-stone-gray mb-3">
                        Next meeting: {new Date(nextMeeting.scheduled_datetime).toLocaleDateString()} at {new Date(nextMeeting.scheduled_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    ) : (
                      <p className="text-sm text-stone-gray mb-3">No meeting scheduled</p>
                    )}
                    <Link href={`/chapters/${chapter.id}/meetings`}>
                      <Button variant="secondary" size="small" fullWidth>
                        View Meetings
                      </Button>
                    </Link>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Feature Cards - More Dense */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <h3 className="text-lg font-semibold mb-3">Upcoming Meetings</h3>
            {meetings && meetings.length > 0 ? (
              <div className="space-y-2">
                {meetings.map((meeting: any) => {
                  const chapter: any = chapters.find((c: any) => c.id === meeting.chapter_id)
                  const date = new Date(meeting.scheduled_datetime)
                  return (
                    <Link
                      key={meeting.id}
                      href={`/chapters/${meeting.chapter_id}/meetings/${meeting.id}`}
                      className="block border-l-4 border-burnt-orange pl-2 hover:bg-warm-cream/50 transition-colors rounded-r py-1"
                    >
                      <p className="font-semibold text-sm">{meeting.topic}</p>
                      <p className="text-xs text-stone-gray">{chapter?.name}</p>
                      <p className="text-xs text-stone-gray">
                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-stone-gray">No upcoming meetings</p>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-3">Your Stats</h3>
            <div className="space-y-2">
              <div>
                <p className="text-2xl font-bold text-earth-brown">{chapters.length}</p>
                <p className="text-xs text-stone-gray">Active Chapters</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-earth-brown">{attendanceCount || 0}</p>
                <p className="text-xs text-stone-gray">Meetings Attended</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-earth-brown">{completedCount || 0}</p>
                <p className="text-xs text-stone-gray">Completed Commitments</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-3">My Commitments</h3>
            {activeCommitments && activeCommitments.length > 0 ? (
              <div className="space-y-2">
                {activeCommitments.map((commitment: any) => {
                  const deadline = commitment.deadline ? new Date(commitment.deadline) : null
                  const isOverdue = deadline && deadline < now
                  return (
                    <Link
                      key={commitment.id}
                      href={`/chapters/${commitment.chapter_id}/commitments`}
                      className="block border-l-4 border-burnt-orange pl-2 hover:bg-warm-cream/50 transition-colors rounded-r py-1"
                    >
                      <p className="font-semibold text-sm line-clamp-2">{commitment.description}</p>
                      <p className="text-xs text-stone-gray">{commitment.chapters?.name}</p>
                      {deadline && (
                        <p className={`text-xs ${isOverdue ? 'text-burnt-orange font-semibold' : 'text-stone-gray'}`}>
                          {isOverdue ? 'Overdue: ' : 'Due: '}{deadline.toLocaleDateString()}
                        </p>
                      )}
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-stone-gray">No active commitments</p>
            )}
          </Card>
        </div>
      </main>
      </div>
    </div>
  )
}
