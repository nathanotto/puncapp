import { requireAuthWithProfile } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SideNav from '@/components/layout/SideNav'
import CompleteCommitmentForm from '@/components/commitments/CompleteCommitmentForm'

export default async function CommitmentsPage() {
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
  const chapterIds = chapters.map(c => c.id)

  // Fetch active commitments
  const { data: activeCommitments } = chapterIds.length > 0 ? await supabase
    .from('commitments')
    .select(`
      id,
      chapter_id,
      description,
      commitment_type,
      deadline,
      status,
      self_reported_status,
      chapters(name)
    `)
    .eq('made_by', profile.id)
    .eq('status', 'pending')
    .order('deadline', { ascending: true, nullsFirst: false }) : { data: [] }

  // Fetch completed commitments
  const { data: completedCommitments } = chapterIds.length > 0 ? await supabase
    .from('commitments')
    .select(`
      id,
      chapter_id,
      description,
      commitment_type,
      status,
      chapters(name),
      created_at
    `)
    .eq('made_by', profile.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10) : { data: [] }

  const now = new Date()

  return (
    <div className="min-h-screen bg-warm-cream md:flex">
      <SideNav isAdmin={isAdmin} />

      <div className="flex-1 w-full">
        <header className="bg-deep-charcoal text-warm-cream py-4 px-6 md:px-6 pl-16 md:pl-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold">All Commitments</h1>
            <p className="text-warm-cream/80 text-sm">View and manage your commitments across all chapters</p>
          </div>
        </header>

        <main className="max-w-6xl mx-auto py-8 px-6">
          {/* Active Commitments */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-earth-brown mb-4">Active Commitments</h2>
            {activeCommitments && activeCommitments.length > 0 ? (
              <div className="grid gap-4">
                {activeCommitments.map((commitment: any) => {
                  const deadline = commitment.deadline ? new Date(commitment.deadline) : null
                  const isOverdue = deadline && deadline < now
                  return (
                    <Card key={commitment.id}>
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{commitment.description}</h3>
                        <p className="text-sm text-stone-gray mb-2">{commitment.chapters?.name}</p>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="info">
                            {commitment.commitment_type.replace('_', ' ')}
                          </Badge>
                          {deadline && (
                            <span className={`text-sm ${isOverdue ? 'text-burnt-orange font-semibold' : 'text-stone-gray'}`}>
                              {isOverdue ? 'Overdue: ' : 'Due: '}{deadline.toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Complete commitment form */}
                        <CompleteCommitmentForm commitmentId={commitment.id} />
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <p className="text-stone-gray">No active commitments</p>
            )}
          </div>

          {/* Completed Commitments */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-earth-brown mb-4">Recently Completed</h2>
            {completedCommitments && completedCommitments.length > 0 ? (
              <div className="grid gap-4">
                {completedCommitments.map((commitment: any) => (
                  <Card key={commitment.id}>
                    <Link href={`/chapters/${commitment.chapter_id}/commitments`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1">{commitment.description}</h3>
                          <p className="text-sm text-stone-gray mb-2">{commitment.chapters?.name}</p>
                          <Badge variant="success">Completed</Badge>
                        </div>
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-stone-gray">No completed commitments</p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
