import { createClient } from '@/lib/supabase/server'
import { normalizeJoin } from '@/lib/supabase/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateChapterForm from '@/components/admin/CreateChapterForm'

export default async function CreateChapterPage() {
  const supabase = await createClient()

  // Verify admin access
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  const { data: adminUser } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single()

  if (!adminUser?.is_punc_admin) {
    redirect('/dashboard')
  }

  // Get certified leaders for the leader dropdown
  const { data: certifiedLeaders } = await supabase
    .from('users')
    .select('id, name, username, email')
    .eq('is_leader_certified', true)
    .order('name')

  // Get all users to find unassigned ones
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, name, username, email, address')
    .order('name')

  // Get active memberships to determine who's unassigned
  const { data: activeMemberships } = await supabase
    .from('chapter_memberships')
    .select('user_id')
    .eq('is_active', true)

  const assignedUserIds = new Set(activeMemberships?.map(m => m.user_id) || [])
  const unassignedUsers = allUsers?.filter(u => !assignedUserIds.has(u.id)) || []

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/work" className="text-burnt-orange hover:underline mb-2 inline-block">
          ← Back to Admin Work
        </Link>
        <h1 className="text-3xl font-bold text-earth-brown mb-2">Create New Chapter</h1>
        <p className="text-stone-gray">Set up a new chapter with leaders and initial members</p>
      </div>

      {/* Warning if no certified leaders */}
      {(!certifiedLeaders || certifiedLeaders.length === 0) && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-yellow-900 mb-2">⚠️ No Certified Leaders Available</h3>
          <p className="text-yellow-800 mb-2">
            You need at least one certified leader to create a chapter.
          </p>
          <Link
            href="/admin/members"
            className="text-yellow-900 underline hover:text-yellow-950"
          >
            Go to Members → Certify a leader
          </Link>
        </div>
      )}

      {/* Form */}
      <CreateChapterForm
        certifiedLeaders={certifiedLeaders || []}
        unassignedUsers={unassignedUsers}
      />
    </div>
  )
}
