import { createClient } from '@/lib/supabase/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { resolveDiscrepancy } from '@/lib/commitments/actions'

interface PageProps {
  params: Promise<{ chapterId: string; commitmentId: string }>
}

export default async function CommitmentDetailPage({ params }: PageProps) {
  const { chapterId, commitmentId } = await params
  const profile = await requireAuthWithProfile()
  const supabase = await createClient()

  // Check if user is a leader of this chapter
  const { data: role } = await supabase
    .from('chapter_roles')
    .select('role_type, chapters(name)')
    .eq('chapter_id', chapterId)
    .eq('user_id', profile.id)
    .in('role_type', ['Chapter Leader', 'Backup Leader'])
    .single()

  if (!role) {
    notFound()
  }

  // Fetch commitment details
  const { data: commitment } = await supabase
    .from('commitments')
    .select(`
      *,
      maker:made_by(id, name, username, display_preference, email),
      recipient:recipient_id(id, name, username, display_preference, email),
      meeting:made_at_meeting(id, scheduled_datetime, topic)
    `)
    .eq('id', commitmentId)
    .eq('chapter_id', chapterId)
    .single()

  if (!commitment) {
    notFound()
  }

  function getDisplayName(user: any) {
    if (!user) return 'Unknown'
    return user.display_preference === 'real_name' ? user.name : user.username
  }

  async function handleResolve(formData: FormData) {
    'use server'
    const status = formData.get('status') as 'completed' | 'pending' | 'abandoned'
    const result = await resolveDiscrepancy(commitmentId, status)
    if (result.success) {
      redirect(`/chapters/${chapterId}/commitments`)
    }
  }

  return (
    <div className="min-h-screen bg-warm-cream">
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-4xl mx-auto">
          <Link href={`/chapters/${chapterId}/commitments`} className="text-sm text-warm-cream/80 hover:text-warm-cream mb-2 inline-block">
            ← Back to Commitments
          </Link>
          <h1 className="text-3xl font-bold">Commitment Details</h1>
          <p className="text-warm-cream/80 text-sm mt-1">{role.chapters?.name}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="grid gap-6">
          {/* Commitment Details */}
          <Card>
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="neutral">{commitment.commitment_type.replace('_', ' ')}</Badge>
                  <Badge variant={
                    commitment.status === 'completed' ? 'success' :
                    commitment.status === 'abandoned' ? 'error' :
                    'info'
                  }>
                    {commitment.status}
                  </Badge>
                  {commitment.discrepancy_flagged && (
                    <Badge variant="error">Discrepancy</Badge>
                  )}
                </div>
                <h2 className="text-2xl font-semibold mb-4">{commitment.description}</h2>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-sm text-earth-brown mb-2">Made By</h3>
                <p className="text-stone-gray">{getDisplayName(commitment.maker)}</p>
                <p className="text-xs text-stone-gray">{commitment.maker?.email}</p>
              </div>

              {commitment.recipient && (
                <div>
                  <h3 className="font-semibold text-sm text-earth-brown mb-2">To Member</h3>
                  <p className="text-stone-gray">{getDisplayName(commitment.recipient)}</p>
                  <p className="text-xs text-stone-gray">{commitment.recipient?.email}</p>
                </div>
              )}

              {commitment.deadline && (
                <div>
                  <h3 className="font-semibold text-sm text-earth-brown mb-2">Deadline</h3>
                  <p className="text-stone-gray">
                    {new Date(commitment.deadline).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}

              {commitment.meeting && (
                <div>
                  <h3 className="font-semibold text-sm text-earth-brown mb-2">Made At Meeting</h3>
                  <p className="text-stone-gray">
                    {commitment.meeting.topic || 'Chapter Meeting'}
                  </p>
                  <p className="text-xs text-stone-gray">
                    {new Date(commitment.meeting.scheduled_datetime).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-border-light pt-6">
              <h3 className="font-semibold text-sm text-earth-brown mb-2">Created</h3>
              <p className="text-stone-gray text-sm">
                {new Date(commitment.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </Card>

          {/* Status Tracking */}
          <Card>
            <h3 className="text-xl font-semibold mb-4">Status Tracking</h3>

            <div className="space-y-4">
              <div className="p-4 bg-warm-cream rounded-md">
                <h4 className="font-semibold text-sm mb-2">Self-Reported Status</h4>
                <Badge variant={
                  commitment.self_reported_status === 'completed' ? 'success' :
                  commitment.self_reported_status === 'abandoned' ? 'error' :
                  'info'
                }>
                  {commitment.self_reported_status}
                </Badge>
                <p className="text-xs text-stone-gray mt-2">
                  What {getDisplayName(commitment.maker)} reported
                </p>
              </div>

              {commitment.recipient_id && (
                <div className="p-4 bg-warm-cream rounded-md">
                  <h4 className="font-semibold text-sm mb-2">Recipient-Reported Status</h4>
                  {commitment.recipient_reported_status ? (
                    <>
                      <Badge variant={
                        commitment.recipient_reported_status === 'completed' ? 'success' :
                        commitment.recipient_reported_status === 'abandoned' ? 'error' :
                        'warning'
                      }>
                        {commitment.recipient_reported_status}
                      </Badge>
                      <p className="text-xs text-stone-gray mt-2">
                        What {getDisplayName(commitment.recipient)} reported
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-stone-gray">No response from recipient yet</p>
                  )}
                </div>
              )}

              <div className="p-4 bg-warm-cream rounded-md">
                <h4 className="font-semibold text-sm mb-2">Overall Status</h4>
                <Badge variant={
                  commitment.status === 'completed' ? 'success' :
                  commitment.status === 'abandoned' ? 'error' :
                  'info'
                }>
                  {commitment.status}
                </Badge>
                <p className="text-xs text-stone-gray mt-2">
                  Current official status of this commitment
                </p>
              </div>
            </div>
          </Card>

          {/* Discrepancy Resolution */}
          {commitment.discrepancy_flagged && (
            <Card className="border-l-4 border-burnt-orange">
              <h3 className="text-xl font-semibold mb-4 text-burnt-orange">Resolve Discrepancy</h3>

              <div className="mb-6 p-4 bg-warm-cream rounded-md">
                <p className="text-sm text-stone-gray mb-2">
                  <strong className="text-earth-brown">The Issue:</strong> {getDisplayName(commitment.maker)} says this commitment is completed,
                  but {getDisplayName(commitment.recipient)} disagrees.
                </p>
                <p className="text-sm text-stone-gray">
                  As chapter leader, you can make a final decision on the status of this commitment.
                  Consider discussing this with both members at the next meeting if more context is needed.
                </p>
              </div>

              <form action={handleResolve} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-earth-brown mb-3">
                    What should the final status be?
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border border-border-light rounded-md hover:bg-warm-cream cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="completed"
                        className="mr-3"
                        required
                      />
                      <div>
                        <p className="font-semibold">Completed</p>
                        <p className="text-xs text-stone-gray">The commitment was fulfilled</p>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border border-border-light rounded-md hover:bg-warm-cream cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="pending"
                        className="mr-3"
                      />
                      <div>
                        <p className="font-semibold">Still Pending</p>
                        <p className="text-xs text-stone-gray">More work needed to complete this</p>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border border-border-light rounded-md hover:bg-warm-cream cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="abandoned"
                        className="mr-3"
                      />
                      <div>
                        <p className="font-semibold">Abandoned</p>
                        <p className="text-xs text-stone-gray">This commitment won't be completed</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="primary" size="large">
                    Resolve & Update Status
                  </Button>
                  <Link href={`/chapters/${chapterId}/commitments`}>
                    <Button type="button" variant="secondary" size="large">
                      Back to Commitments
                    </Button>
                  </Link>
                </div>
              </form>
            </Card>
          )}

          {/* No Discrepancy - Just Info */}
          {!commitment.discrepancy_flagged && (
            <Card>
              <p className="text-stone-gray text-sm">
                There is no discrepancy with this commitment. Status tracking is aligned.
              </p>
              <Link href={`/chapters/${chapterId}/commitments`} className="inline-block mt-4">
                <Button variant="secondary">
                  Back to Commitments
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
