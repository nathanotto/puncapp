import { createClient } from '@/lib/supabase/server'
import { normalizeJoin } from '@/lib/supabase/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MembersFilterTabs from '@/components/admin/MembersFilterTabs'
import MembersTable from '@/components/admin/MembersTable'

interface MembersPageProps {
  searchParams: Promise<{ filter?: string; search?: string }>
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams
  const filter = params.filter || 'all'
  const search = params.search || ''

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

  // Get all users
  const { data: allUsers } = await supabase
    .from('users')
    .select('*')
    .order('name')

  if (!allUsers) {
    return <div className="p-8">Error loading members</div>
  }

  // Get all active memberships
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select(`
      user_id,
      role,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('is_active', true)

  const normalizedMemberships = memberships?.map(m => ({
    ...m,
    chapters: normalizeJoin(m.chapters)!
  }))

  // Build map of user_id -> array of memberships
  const userMembershipsMap = new Map<string, typeof normalizedMemberships>()
  normalizedMemberships?.forEach(m => {
    const existing = userMembershipsMap.get(m.user_id) || []
    userMembershipsMap.set(m.user_id, [...existing, m])
  })

  // Get assigned user IDs
  const assignedUserIds = new Set(normalizedMemberships?.map(m => m.user_id) || [])

  // Build user list with membership data
  const usersWithMemberships = allUsers.map(user => ({
    ...user,
    memberships: userMembershipsMap.get(user.id) || [],
    isAssigned: assignedUserIds.has(user.id),
    isLeader: userMembershipsMap.get(user.id)?.some(m => m.role === 'leader' || m.role === 'backup_leader') || false,
  }))

  // Apply filters
  let filteredUsers = usersWithMemberships

  if (filter === 'unassigned') {
    filteredUsers = filteredUsers.filter(u => !u.isAssigned)
  } else if (filter === 'leaders') {
    filteredUsers = filteredUsers.filter(u => u.isLeader)
  } else if (filter === 'certified') {
    filteredUsers = filteredUsers.filter(u => u.is_leader_certified)
  }

  // Apply search
  if (search) {
    const searchLower = search.toLowerCase()
    filteredUsers = filteredUsers.filter(u =>
      u.name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower) ||
      (u.username && u.username.toLowerCase().includes(searchLower))
    )
  }

  // Calculate counts for tabs
  const allCount = usersWithMemberships.length
  const unassignedCount = usersWithMemberships.filter(u => !u.isAssigned).length
  const leadersCount = usersWithMemberships.filter(u => u.isLeader).length
  const certifiedCount = usersWithMemberships.filter(u => u.is_leader_certified).length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-earth-brown mb-2">Members</h1>
        <p className="text-stone-gray">Manage all PUNC members</p>
      </div>

      {/* Filters and Search */}
      <div className="flex justify-between items-center mb-6">
        <MembersFilterTabs
          currentFilter={filter}
          allCount={allCount}
          unassignedCount={unassignedCount}
          leadersCount={leadersCount}
          certifiedCount={certifiedCount}
        />
      </div>

      {/* Members Table */}
      <MembersTable users={filteredUsers} currentSearch={search} />
    </div>
  )
}
