import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ChapterCommitmentsPage({
  params,
}: {
  params: Promise<{ chapterId: string }>
}) {
  const { chapterId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get chapter info
  const { data: chapter } = await supabase
    .from('chapters')
    .select('name')
    .eq('id', chapterId)
    .single()

  // Get user's commitments
  const { data: commitments } = await supabase
    .from('commitments')
    .select(`
      id,
      commitment_type,
      description,
      status,
      created_at,
      completed_at,
      created_at_meeting:meetings!commitments_created_at_meeting_id_fkey(scheduled_date, scheduled_time),
      completed_at_meeting:meetings!commitments_completed_at_meeting_id_fkey(scheduled_date, scheduled_time)
    `)
    .eq('committer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-earth-brown mb-6">
        {chapter?.name} - Commitments
      </h1>

      {/* Make a Commitment Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-earth-brown mb-4">
          Make a New Commitment
        </h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-800 font-medium">
            📌 Form coming soon
          </p>
          <p className="text-sm text-blue-600 mt-2">
            For now, commitments are made during meetings. Stand-alone commitment creation will be added soon.
          </p>
        </div>
      </div>

      {/* Commitment History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-earth-brown mb-4">
          Your Commitment History
        </h2>

        {!commitments || commitments.length === 0 ? (
          <p className="text-stone-gray">No commitments yet.</p>
        ) : (
          <div className="space-y-4">
            {commitments.map((commitment) => (
              <div
                key={commitment.id}
                className="p-4 bg-warm-cream/50 rounded-lg border-l-4 border-sage-green"
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      commitment.commitment_type === 'stretch_goal'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {commitment.commitment_type === 'stretch_goal'
                      ? 'Stretch Goal'
                      : commitment.commitment_type}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      commitment.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : commitment.status === 'active'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {commitment.status}
                  </span>
                </div>
                <p className="text-earth-brown font-medium mb-2">
                  {commitment.description}
                </p>
                <div className="text-sm text-stone-gray">
                  <p>
                    Created:{' '}
                    {new Date(commitment.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {commitment.completed_at && (
                    <p>
                      Completed:{' '}
                      {new Date(commitment.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
