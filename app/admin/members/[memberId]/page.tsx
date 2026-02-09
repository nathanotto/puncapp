import { createClient } from '@/lib/supabase/server'
import { normalizeJoin } from '@/lib/supabase/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MemberEditForm from '@/components/admin/MemberEditForm'
import LeaderCertificationCard from '@/components/admin/LeaderCertificationCard'
import MemberChaptersCard from '@/components/admin/MemberChaptersCard'

interface MemberDetailPageProps {
  params: Promise<{ memberId: string }>
}

export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { memberId } = await params
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

  // Get member details
  const { data: member } = await supabase
    .from('users')
    .select('*')
    .eq('id', memberId)
    .single()

  if (!member) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-earth-brown mb-4">Member not found</h1>
        <Link href="/admin/members" className="text-burnt-orange hover:underline">
          ← Back to Members
        </Link>
      </div>
    )
  }

  // Get member's chapter memberships
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select(`
      id,
      role,
      chapters!inner (
        id,
        name,
        status
      )
    `)
    .eq('user_id', memberId)
    .eq('is_active', true)

  const normalizedMemberships = memberships?.map(m => ({
    ...m,
    chapters: normalizeJoin(m.chapters)!
  }))

  // Get all chapters for the add dropdown
  const { data: allChapters } = await supabase
    .from('chapters')
    .select('id, name, status')
    .eq('status', 'open')
    .order('name')

  // Get member's attendance count
  const { count: attendanceCount } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', memberId)
    .not('checked_in_at', 'is', null)

  // Get recent attendance
  const { data: recentAttendance } = await supabase
    .from('attendance')
    .select(`
      checked_in_at,
      meetings!inner (
        id,
        scheduled_date,
        chapters!inner (
          id,
          name
        )
      )
    `)
    .eq('user_id', memberId)
    .not('checked_in_at', 'is', null)
    .order('checked_in_at', { ascending: false })
    .limit(5)

  const normalizedAttendance = recentAttendance?.map(a => ({
    ...a,
    meetings: normalizeJoin(a.meetings)!
  })).map(a => ({
    ...a,
    meetings: {
      ...a.meetings,
      chapters: normalizeJoin(a.meetings.chapters)!
    }
  }))

  // Get member's commitments count
  const { count: commitmentsCount } = await supabase
    .from('commitments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', memberId)

  // Get recent commitments
  const { data: recentCommitments } = await supabase
    .from('commitments')
    .select(`
      id,
      commitment_text,
      created_at,
      status,
      meetings!inner (
        id,
        scheduled_date,
        chapters!inner (
          id,
          name
        )
      )
    `)
    .eq('user_id', memberId)
    .order('created_at', { ascending: false })
    .limit(5)

  const normalizedCommitments = recentCommitments?.map(c => ({
    ...c,
    meetings: normalizeJoin(c.meetings)!
  })).map(c => ({
    ...c,
    meetings: {
      ...c.meetings,
      chapters: normalizeJoin(c.meetings.chapters)!
    }
  }))

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/members" className="text-burnt-orange hover:underline mb-2 inline-block">
          ← Back to Members
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-earth-brown mb-2">
              {member.name}
              {member.username && <span className="text-stone-500 ml-2">@{member.username}</span>}
            </h1>
            <p className="text-stone-gray">{member.email}</p>
          </div>
          {member.is_leader_certified && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              ✓ Certified Leader
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Basic Information Form */}
          <MemberEditForm member={member} />

          {/* Leader Certification */}
          <LeaderCertificationCard
            memberId={memberId}
            isCertified={member.is_leader_certified || false}
            certifiedAt={member.leader_certified_at}
            expiresAt={member.leader_certification_expires_at}
          />

          {/* Chapter Memberships */}
          <MemberChaptersCard
            memberId={memberId}
            memberships={normalizedMemberships || []}
            availableChapters={allChapters || []}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold text-earth-brown mb-4">Stats</h3>
            <div className="space-y-3">
              <div>
                <span className="text-stone-500 text-sm">Participation Score</span>
                <p className="text-2xl font-bold text-earth-brown">{member.participation_score || 0}</p>
              </div>
              <div>
                <span className="text-stone-500 text-sm">Meetings Attended</span>
                <p className="text-2xl font-bold text-earth-brown">{attendanceCount || 0}</p>
              </div>
              <div>
                <span className="text-stone-500 text-sm">Commitments Made</span>
                <p className="text-2xl font-bold text-earth-brown">{commitmentsCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold text-earth-brown mb-4">Recent Attendance</h3>
            {normalizedAttendance && normalizedAttendance.length > 0 ? (
              <div className="space-y-2">
                {normalizedAttendance.map((attendance, idx) => (
                  <div key={idx} className="pb-2 border-b border-stone-100 last:border-0">
                    <p className="text-sm font-medium text-earth-brown">
                      {attendance.meetings.chapters.name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {new Date(attendance.checked_in_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-gray">No attendance records</p>
            )}
          </div>

          {/* Recent Commitments */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold text-earth-brown mb-4">Recent Commitments</h3>
            {normalizedCommitments && normalizedCommitments.length > 0 ? (
              <div className="space-y-3">
                {normalizedCommitments.map((commitment) => {
                  const statusColors = {
                    pending: 'bg-yellow-100 text-yellow-800',
                    completed: 'bg-green-100 text-green-800',
                    abandoned: 'bg-gray-100 text-gray-800',
                  }
                  const statusColor = statusColors[commitment.status as keyof typeof statusColors] || statusColors.pending

                  return (
                    <div key={commitment.id} className="pb-3 border-b border-stone-100 last:border-0">
                      <div className="flex items-start gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>
                          {commitment.status}
                        </span>
                      </div>
                      <p className="text-sm text-stone-700 mb-1">{commitment.commitment_text}</p>
                      <p className="text-xs text-stone-500">
                        {commitment.meetings.chapters.name} • {new Date(commitment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-stone-gray">No commitments yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
