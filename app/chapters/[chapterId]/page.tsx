import { createClient } from '@/lib/supabase/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import SideNav from '@/components/layout/SideNav'
import { postChapterUpdate } from '@/lib/chapters/actions'

interface PageProps {
  params: Promise<{ chapterId: string }>
}

export default async function ChapterDashboardPage({ params }: PageProps) {
  const { chapterId } = await params
  const profile = await requireAuthWithProfile()
  const supabase = await createClient()

  // Check if user is member of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('*')
    .eq('chapter_id', chapterId)
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    notFound()
  }

  // Fetch chapter details
  const { data: chapter } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', chapterId)
    .single()

  if (!chapter) {
    notFound()
  }

  // Fetch members with roles
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select(`
      *,
      users(id, name, username, display_preference, email, phone),
      chapter_roles(role_type)
    `)
    .eq('chapter_id', chapterId)
    .eq('is_active', true)
    .order('joined_at')

  // Fetch next meeting
  const { data: nextMeeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('chapter_id', chapterId)
    .gte('scheduled_datetime', new Date().toISOString())
    .order('scheduled_datetime')
    .limit(1)
    .maybeSingle()

  // Fetch recent commitments
  const { data: recentCommitments } = await supabase
    .from('commitments')
    .select(`
      *,
      maker:made_by(id, name, username, display_preference),
      recipient:recipient_id(id, name, username, display_preference)
    `)
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch chapter updates (message board)
  const { data: updates } = await supabase
    .from('chapter_updates')
    .select(`
      *,
      users(id, name, username, display_preference)
    `)
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Calculate chapter stats
  const { count: totalMeetings } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })
    .eq('chapter_id', chapterId)
    .eq('status', 'completed')

  const { count: totalCommitments } = await supabase
    .from('commitments')
    .select('*', { count: 'exact', head: true })
    .eq('chapter_id', chapterId)

  const chapterAge = Math.floor(
    (new Date().getTime() - new Date(chapter.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
  )

  function getDisplayName(user: any) {
    if (!user) return 'Unknown'
    return user.display_preference === 'real_name' ? user.name : user.username
  }

  // Get emails for mailto link
  const memberEmails = members?.map((m: any) => m.users?.email).filter(Boolean).join(',')

  async function handlePostUpdate(formData: FormData) {
    'use server'
    const message = formData.get('message') as string
    await postChapterUpdate(chapterId, message)
  }

  return (
    <div className="min-h-screen bg-warm-cream flex">
      <SideNav profile={profile} currentPage="chapters" isAdmin={profile.is_admin} />

      <main className="flex-1 overflow-auto">
        <header className="bg-deep-charcoal text-warm-cream py-6 px-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold">{chapter.name}</h1>
            <p className="text-warm-cream/80 text-sm mt-1">Chapter Dashboard</p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <Card className="text-center py-4">
              <div className="text-3xl font-bold text-earth-brown">{members?.length || 0}</div>
              <div className="text-sm text-stone-gray mt-1">Members</div>
            </Card>
            <Card className="text-center py-4">
              <div className="text-3xl font-bold text-earth-brown">{chapterAge}</div>
              <div className="text-sm text-stone-gray mt-1">Months Old</div>
            </Card>
            <Card className="text-center py-4">
              <div className="text-3xl font-bold text-earth-brown">{totalMeetings || 0}</div>
              <div className="text-sm text-stone-gray mt-1">Meetings</div>
            </Card>
            <Card className="text-center py-4">
              <div className="text-3xl font-bold text-earth-brown">{totalCommitments || 0}</div>
              <div className="text-sm text-stone-gray mt-1">Commitments</div>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Next Meeting */}
              {nextMeeting && (
                <Card>
                  <h2 className="text-lg font-bold text-earth-brown mb-3">Next Meeting</h2>
                  <div className="text-sm space-y-2">
                    <p className="font-semibold">{nextMeeting.topic || 'Chapter Meeting'}</p>
                    <p className="text-stone-gray">
                      {new Date(nextMeeting.scheduled_datetime).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                    {nextMeeting.location && (
                      <p className="text-stone-gray text-xs">
                        📍 {nextMeeting.location.street}, {nextMeeting.location.city}
                      </p>
                    )}
                  </div>
                  <Link href={`/chapters/${chapterId}/meetings/${nextMeeting.id}`} className="mt-3 inline-block">
                    <Button variant="secondary" size="small">View Details</Button>
                  </Link>
                </Card>
              )}

              {/* Members */}
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-earth-brown">Members</h2>
                  <a
                    href={`mailto:?bcc=${memberEmails}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    📧 Email Group
                  </a>
                </div>
                <div className="space-y-3">
                  {members?.map((member: any) => {
                    const role: any = Array.isArray(member.chapter_roles) && member.chapter_roles.length > 0
                      ? member.chapter_roles[0]
                      : null
                    return (
                      <div key={member.id} className="flex justify-between items-start text-sm border-b border-border-light pb-2 last:border-0">
                        <div className="flex-1">
                          <div className="font-semibold">{getDisplayName(member.users)}</div>
                          {role && (
                            <div className="text-xs text-burnt-orange mt-1">{role.role_type}</div>
                          )}
                        </div>
                        <div className="text-xs text-stone-gray text-right">
                          <div>{member.users?.email}</div>
                          <div>{member.users?.phone}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Post Update */}
              <Card>
                <h2 className="text-lg font-bold text-earth-brown mb-3">Post Update</h2>
                <form action={handlePostUpdate} className="space-y-3">
                  <textarea
                    name="message"
                    rows={3}
                    className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange text-sm"
                    placeholder="Share something with your chapter..."
                    required
                  />
                  <Button type="submit" variant="primary" size="small">
                    Post
                  </Button>
                </form>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Recent Commitments */}
              <Card>
                <h2 className="text-lg font-bold text-earth-brown mb-4">Recent Commitments</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentCommitments && recentCommitments.length > 0 ? (
                    recentCommitments.map((commitment: any) => (
                      <div key={commitment.id} className="text-sm border-b border-border-light pb-3 last:border-0">
                        <div className="flex items-start gap-2 mb-1">
                          <Badge variant={
                            commitment.status === 'completed' ? 'success' :
                            commitment.status === 'abandoned' ? 'error' :
                            'neutral'
                          }>
                            {commitment.status}
                          </Badge>
                          <Badge variant="neutral">{commitment.commitment_type.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-stone-gray mb-1">{commitment.description}</p>
                        <div className="text-xs text-stone-gray">
                          <span className="font-semibold">{getDisplayName(commitment.maker)}</span>
                          {commitment.recipient && (
                            <span> → {getDisplayName(commitment.recipient)}</span>
                          )}
                          <span className="ml-2">
                            {new Date(commitment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-stone-gray text-sm">No commitments yet.</p>
                  )}
                </div>
                <Link href={`/chapters/${chapterId}/commitments`} className="mt-3 inline-block">
                  <Button variant="secondary" size="small">View All</Button>
                </Link>
              </Card>

              {/* Message Board */}
              <Card>
                <h2 className="text-lg font-bold text-earth-brown mb-4">Chapter Feed</h2>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {updates && updates.length > 0 ? (
                    updates.map((update: any) => (
                      <div key={update.id} className="text-sm border-b border-border-light pb-3 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-earth-brown">
                            {getDisplayName(update.users)}
                          </span>
                          <span className="text-xs text-stone-gray">
                            {new Date(update.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-stone-gray whitespace-pre-wrap">{update.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-stone-gray text-sm">No updates yet. Be the first to post!</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
