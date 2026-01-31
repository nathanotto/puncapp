import { createClient } from '@/lib/supabase/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { updateCommitmentStatus, updateRecipientStatus, deleteCommitment } from '@/lib/commitments/actions'

interface PageProps {
  params: Promise<{ chapterId: string }>
}

export default async function ChapterCommitmentsPage({ params }: PageProps) {
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

  // Fetch all commitments for this chapter
  const { data: commitments } = await supabase
    .from('commitments')
    .select(`
      *,
      maker:made_by(id, name, username, display_preference),
      recipient:recipient_id(id, name, username, display_preference),
      meeting:made_at_meeting(id, scheduled_datetime)
    `)
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })

  // Separate commitments by status
  const active = commitments?.filter(c => c.status === 'pending') || []
  const completed = commitments?.filter(c => c.status === 'completed') || []
  const abandoned = commitments?.filter(c => c.status === 'abandoned') || []
  const flagged = commitments?.filter(c => c.discrepancy_flagged) || []

  // User's own commitments
  const myActive = active.filter(c => c.made_by === profile.id)
  const myCompleted = completed.filter(c => c.made_by === profile.id)

  // Commitments made to user
  const toMe = active.filter(c => c.recipient_id === profile.id)

  const now = new Date()

  function getDisplayName(user: any) {
    if (!user) return 'Unknown'
    return user.display_preference === 'real_name' ? user.name : user.username
  }

  function isOverdue(deadline: string | null) {
    if (!deadline) return false
    return new Date(deadline) < now
  }

  async function handleStatusUpdate(formData: FormData) {
    'use server'
    const commitmentId = formData.get('commitmentId') as string
    const status = formData.get('status') as 'pending' | 'completed' | 'abandoned'
    await updateCommitmentStatus(commitmentId, status)
  }

  async function handleRecipientUpdate(formData: FormData) {
    'use server'
    const commitmentId = formData.get('commitmentId') as string
    const status = formData.get('status') as 'pending' | 'completed' | 'abandoned'
    await updateRecipientStatus(commitmentId, status)
  }

  async function handleDelete(formData: FormData) {
    'use server'
    const commitmentId = formData.get('commitmentId') as string
    await deleteCommitment(commitmentId)
  }

  return (
    <div className="min-h-screen bg-warm-cream">
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-6xl mx-auto">
          <Link href={`/chapters/${chapterId}/meetings`} className="text-sm text-warm-cream/80 hover:text-warm-cream mb-2 inline-block">
            ← Back to Chapter
          </Link>
          <h1 className="text-3xl font-bold">{membership.chapters?.name} - Commitments</h1>
          <p className="text-warm-cream/80 text-sm mt-1">Track and manage chapter commitments</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-12 px-6">
        <div className="mb-8">
          <Link href={`/chapters/${chapterId}/commitments/create`}>
            <Button variant="primary" size="large">
              Create New Commitment
            </Button>
          </Link>
        </div>

        {/* Flagged Discrepancies (Leaders only) */}
        {isLeader && flagged.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-earth-brown mb-6">
              Flagged Discrepancies ({flagged.length})
            </h2>
            <div className="grid gap-4">
              {flagged.map(commitment => (
                <Card key={commitment.id} className="border-l-4 border-burnt-orange">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="error">Discrepancy</Badge>
                        <Badge variant="neutral">{commitment.commitment_type.replace('_', ' ')}</Badge>
                      </div>
                      <p className="font-semibold mb-2">{commitment.description}</p>
                      <p className="text-sm text-stone-gray">
                        <strong>Made by:</strong> {getDisplayName(commitment.maker)}
                      </p>
                      {commitment.recipient && (
                        <p className="text-sm text-stone-gray">
                          <strong>To:</strong> {getDisplayName(commitment.recipient)}
                        </p>
                      )}
                      <div className="mt-3 p-3 bg-warm-cream rounded">
                        <p className="text-sm">
                          <strong>Maker says:</strong> {commitment.self_reported_status}
                        </p>
                        <p className="text-sm">
                          <strong>Recipient says:</strong> {commitment.recipient_reported_status || 'No response'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Link href={`/chapters/${chapterId}/commitments/${commitment.id}`}>
                    <Button variant="secondary" size="small">
                      View & Resolve
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* My Active Commitments */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-earth-brown mb-6">
            My Active Commitments ({myActive.length})
          </h2>
          {myActive.length > 0 ? (
            <div className="grid gap-4">
              {myActive.map(commitment => {
                const overdue = isOverdue(commitment.deadline)
                return (
                  <Card key={commitment.id} hover>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="neutral">{commitment.commitment_type.replace('_', ' ')}</Badge>
                          {overdue && <Badge variant="error">Overdue</Badge>}
                        </div>
                        <p className="font-semibold mb-2">{commitment.description}</p>
                        {commitment.recipient && (
                          <p className="text-sm text-stone-gray mb-1">
                            <strong>To:</strong> {getDisplayName(commitment.recipient)}
                          </p>
                        )}
                        {commitment.deadline && (
                          <p className="text-sm text-stone-gray">
                            <strong>Deadline:</strong> {new Date(commitment.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <form action={handleStatusUpdate}>
                        <input type="hidden" name="commitmentId" value={commitment.id} />
                        <input type="hidden" name="status" value="completed" />
                        <Button type="submit" variant="primary" size="small">
                          Mark Complete
                        </Button>
                      </form>
                      <form action={handleDelete}>
                        <input type="hidden" name="commitmentId" value={commitment.id} />
                        <Button type="submit" variant="secondary" size="small">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <p className="text-stone-gray">You have no active commitments.</p>
              <Link href={`/chapters/${chapterId}/commitments/create`} className="inline-block mt-4">
                <Button variant="primary">Create Your First Commitment</Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Commitments Made to Me */}
        {toMe.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-earth-brown mb-6">
              Commitments to Me ({toMe.length})
            </h2>
            <div className="grid gap-4">
              {toMe.map(commitment => (
                <Card key={commitment.id} hover className="border-l-4 border-burnt-orange">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="info">To You</Badge>
                        <Badge variant="neutral">{commitment.commitment_type.replace('_', ' ')}</Badge>
                      </div>
                      <p className="font-semibold mb-2">{commitment.description}</p>
                      <p className="text-sm text-stone-gray mb-1">
                        <strong>Made by:</strong> {getDisplayName(commitment.maker)}
                      </p>
                      {commitment.deadline && (
                        <p className="text-sm text-stone-gray">
                          <strong>Deadline:</strong> {new Date(commitment.deadline).toLocaleDateString()}
                        </p>
                      )}
                      <div className="mt-3">
                        <p className="text-sm text-stone-gray">
                          <strong>Their status:</strong> {commitment.self_reported_status}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <form action={handleRecipientUpdate}>
                      <input type="hidden" name="commitmentId" value={commitment.id} />
                      <input type="hidden" name="status" value="completed" />
                      <Button type="submit" variant="primary" size="small">
                        Confirm Complete
                      </Button>
                    </form>
                    <form action={handleRecipientUpdate}>
                      <input type="hidden" name="commitmentId" value={commitment.id} />
                      <input type="hidden" name="status" value="pending" />
                      <Button type="submit" variant="secondary" size="small">
                        Mark Pending
                      </Button>
                    </form>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* My Completed Commitments */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-earth-brown mb-6">
            My Completed ({myCompleted.length})
          </h2>
          {myCompleted.length > 0 ? (
            <div className="grid gap-4">
              {myCompleted.slice(0, 5).map(commitment => (
                <Card key={commitment.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="success">Completed</Badge>
                        <Badge variant="neutral" size="small">{commitment.commitment_type.replace('_', ' ')}</Badge>
                      </div>
                      <p className="font-semibold text-sm">{commitment.description}</p>
                      {commitment.recipient && (
                        <p className="text-xs text-stone-gray mt-1">
                          To: {getDisplayName(commitment.recipient)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-stone-gray">No completed commitments yet.</p>
            </Card>
          )}
        </div>

        {/* All Chapter Commitments (for visibility/accountability) */}
        <div>
          <h2 className="text-2xl font-bold text-earth-brown mb-6">
            All Chapter Commitments ({active.length} active)
          </h2>
          {active.length > 0 ? (
            <div className="grid gap-4">
              {active.map(commitment => (
                <Card key={commitment.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="neutral">{commitment.commitment_type.replace('_', ' ')}</Badge>
                        {isOverdue(commitment.deadline) && <Badge variant="error">Overdue</Badge>}
                      </div>
                      <p className="text-sm mb-2">{commitment.description}</p>
                      <p className="text-xs text-stone-gray">
                        <strong>Made by:</strong> {getDisplayName(commitment.maker)}
                      </p>
                      {commitment.recipient && (
                        <p className="text-xs text-stone-gray">
                          <strong>To:</strong> {getDisplayName(commitment.recipient)}
                        </p>
                      )}
                      {commitment.deadline && (
                        <p className="text-xs text-stone-gray">
                          <strong>Deadline:</strong> {new Date(commitment.deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-stone-gray">No active chapter commitments.</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
