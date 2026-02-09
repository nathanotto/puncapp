import { createClient } from '@/lib/supabase/server'
import { normalizeJoin } from '@/lib/supabase/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ChapterFlagActions from '@/components/admin/ChapterFlagActions'

interface ChapterDetailPageProps {
  params: Promise<{ chapterId: string }>
}

export default async function ChapterDetailPage({ params }: ChapterDetailPageProps) {
  const { chapterId } = await params
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

  // Get chapter details
  const { data: chapter } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', chapterId)
    .single()

  if (!chapter) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-earth-brown mb-4">Chapter not found</h1>
        <Link href="/admin/chapters" className="text-burnt-orange hover:underline">
          ← Back to Chapters
        </Link>
      </div>
    )
  }

  // Get chapter members
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select(`
      id,
      role,
      user_id,
      users!inner (
        id,
        name,
        username,
        email,
        participation_score,
        is_leader_certified
      )
    `)
    .eq('chapter_id', chapterId)
    .eq('is_active', true)
    .order('role', { ascending: true })

  const normalizedMemberships = memberships?.map(m => ({
    ...m,
    users: normalizeJoin(m.users)!
  }))

  // Get meeting history
  const { data: meetings } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      status,
      actual_start_time
    `)
    .eq('chapter_id', chapterId)
    .order('scheduled_date', { ascending: false })
    .limit(10)

  // Get leadership log
  const { data: leadershipLog } = await supabase
    .from('leadership_log')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get curriculum completed
  const { data: curriculumHistory } = await supabase
    .from('chapter_curriculum_history')
    .select(`
      completed_at,
      module_id,
      curriculum_modules!inner (
        id,
        title
      )
    `)
    .eq('chapter_id', chapterId)
    .order('completed_at', { ascending: false })
    .limit(5)

  const normalizedCurriculum = curriculumHistory?.map(c => ({
    ...c,
    curriculum_modules: normalizeJoin(c.curriculum_modules)!
  }))

  // Format status badge
  const statusColors = {
    open: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  const statusColor = statusColors[chapter.status as keyof typeof statusColors] || statusColors.open

  // Format role badge
  const roleColors = {
    leader: 'bg-burnt-orange text-white',
    backup_leader: 'bg-orange-100 text-orange-800',
    member: 'bg-stone-100 text-stone-700',
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/chapters" className="text-burnt-orange hover:underline mb-2 inline-block">
          ← Back to Chapters
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-earth-brown mb-2">{chapter.name}</h1>
            <p className="text-stone-gray">{chapter.default_location || 'No location set'}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
              {chapter.status}
            </span>
            {chapter.needs_attention && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                🚩 Flagged
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Flag Actions */}
      <ChapterFlagActions
        chapterId={chapterId}
        isFlagged={chapter.needs_attention || false}
        currentReason={chapter.attention_reason || null}
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Members Table */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Members ({normalizedMemberships?.length || 0})</h2>
            {normalizedMemberships && normalizedMemberships.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-2 text-sm font-semibold text-stone-700">Name</th>
                    <th className="text-left py-2 text-sm font-semibold text-stone-700">Email</th>
                    <th className="text-left py-2 text-sm font-semibold text-stone-700">Role</th>
                    <th className="text-center py-2 text-sm font-semibold text-stone-700">Participation</th>
                    <th className="text-center py-2 text-sm font-semibold text-stone-700">Certified</th>
                    <th className="text-right py-2 text-sm font-semibold text-stone-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedMemberships.map(m => {
                    const user = m.users
                    const roleColor = roleColors[m.role as keyof typeof roleColors] || roleColors.member
                    return (
                      <tr key={m.id} className="border-b border-stone-100">
                        <td className="py-3 text-sm">
                          {user.name}
                          {user.username && <span className="text-stone-500 ml-1">@{user.username}</span>}
                        </td>
                        <td className="py-3 text-sm text-stone-600">{user.email}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${roleColor}`}>
                            {m.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-center">{user.participation_score || 0}</td>
                        <td className="py-3 text-center">
                          {user.is_leader_certified ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/admin/members/${user.id}`}
                            className="text-burnt-orange hover:underline text-sm"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-stone-gray">No members</p>
            )}
          </div>

          {/* Meeting History */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Meeting History</h2>
            {meetings && meetings.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-2 text-sm font-semibold text-stone-700">Date</th>
                    <th className="text-left py-2 text-sm font-semibold text-stone-700">Time</th>
                    <th className="text-left py-2 text-sm font-semibold text-stone-700">Status</th>
                    <th className="text-left py-2 text-sm font-semibold text-stone-700">Notes</th>
                    <th className="text-right py-2 text-sm font-semibold text-stone-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.map(meeting => {
                    const meetingDate = new Date(meeting.scheduled_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })

                    // Check if started late
                    let notes = ''
                    if (meeting.actual_start_time && meeting.scheduled_time) {
                      const scheduled = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`)
                      const actual = new Date(meeting.actual_start_time)
                      const diffMinutes = Math.round((actual.getTime() - scheduled.getTime()) / 60000)
                      if (diffMinutes > 10) {
                        notes = `⚠️ Started ${diffMinutes} min late`
                      }
                    }

                    const meetingStatusColors = {
                      scheduled: 'bg-blue-100 text-blue-800',
                      in_progress: 'bg-orange-100 text-orange-800',
                      completed: 'bg-green-100 text-green-800',
                      cancelled: 'bg-gray-100 text-gray-800',
                    }
                    const meetingStatusColor = meetingStatusColors[meeting.status as keyof typeof meetingStatusColors] || meetingStatusColors.scheduled

                    return (
                      <tr key={meeting.id} className="border-b border-stone-100">
                        <td className="py-3 text-sm">{meetingDate}</td>
                        <td className="py-3 text-sm text-stone-600">{meeting.scheduled_time}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${meetingStatusColor}`}>
                            {meeting.status}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-stone-600">{notes}</td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/meetings/${meeting.id}`}
                            className="text-burnt-orange hover:underline text-sm"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-stone-gray">No meetings yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Chapter Info */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold text-earth-brown mb-4">Chapter Info</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-stone-500">Schedule:</span>
                <p className="text-earth-brown font-medium">
                  {chapter.default_meeting_day} at {chapter.default_meeting_time}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Frequency:</span>
                <p className="text-earth-brown font-medium">{chapter.meeting_frequency}</p>
              </div>
              <div>
                <span className="text-stone-500">Created:</span>
                <p className="text-earth-brown font-medium">
                  {new Date(chapter.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Leadership Log */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold text-earth-brown mb-4">Leadership Log</h3>
            {leadershipLog && leadershipLog.length > 0 ? (
              <div className="space-y-3">
                {leadershipLog.map(log => {
                  const typeColors = {
                    meeting_started_late: 'bg-yellow-100 text-yellow-800',
                    member_checked_in_late: 'bg-orange-100 text-orange-800',
                    member_not_contacted: 'bg-red-100 text-red-800',
                  }
                  const typeColor = typeColors[log.log_type as keyof typeof typeColors] || 'bg-stone-100 text-stone-700'

                  return (
                    <div key={log.id} className="pb-3 border-b border-stone-100 last:border-0">
                      <div className="flex items-start gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                          {log.log_type.replace(/_/g, ' ')}
                        </span>
                        {!log.is_resolved && (
                          <span className="text-xs text-red-600">Unresolved</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600">{log.description}</p>
                      <p className="text-xs text-stone-400 mt-1">
                        {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-stone-gray">No log entries</p>
            )}
          </div>

          {/* Curriculum Completed */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold text-earth-brown mb-4">Curriculum Completed</h3>
            {normalizedCurriculum && normalizedCurriculum.length > 0 ? (
              <div className="space-y-2">
                {normalizedCurriculum.map((item, idx) => (
                  <div key={idx} className="pb-2 border-b border-stone-100 last:border-0">
                    <p className="text-sm font-medium text-earth-brown">{item.curriculum_modules.title}</p>
                    <p className="text-xs text-stone-500">
                      {new Date(item.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-gray">No modules completed</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
