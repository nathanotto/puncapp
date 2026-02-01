import { requireAdmin, getAdminClient } from '@/lib/auth/admin'
import AdminLayout from '@/components/layout/AdminLayout'

export default async function AdminDashboard() {
  const admin = await requireAdmin()
  // Use admin client that bypasses RLS to see ALL data
  const supabase = await getAdminClient()

  // Fetch KPIs
  // 1. Total chapters by status
  const { data: allChapters } = await supabase
    .from('chapters')
    .select('id, status')

  const chapterStats = {
    total: allChapters?.length || 0,
    open: allChapters?.filter(c => c.status === 'open').length || 0,
    forming: allChapters?.filter(c => c.status === 'forming').length || 0,
    closed: allChapters?.filter(c => c.status === 'closed').length || 0,
  }

  // 2. Total active members
  const { count: activeMembersCount } = await supabase
    .from('chapter_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // 3. Meetings held this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: meetingsThisMonth } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })
    .gte('scheduled_datetime', startOfMonth.toISOString())
    .eq('status', 'completed')

  // 4. Average attendance rate
  const { data: completedMeetings } = await supabase
    .from('meetings')
    .select('id')
    .eq('status', 'completed')

  let attendanceRate = 0
  if (completedMeetings && completedMeetings.length > 0) {
    const meetingIds = completedMeetings.map(m => m.id)

    const { count: totalAttendance } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .in('meeting_id', meetingIds)

    const { count: actualAttendance } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .in('meeting_id', meetingIds)
      .neq('attendance_type', 'absent')

    if (totalAttendance && totalAttendance > 0) {
      attendanceRate = Math.round((actualAttendance || 0) / totalAttendance * 100)
    }
  }

  return (
    <AdminLayout admin={admin} currentPage="dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Chapters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Chapters</h3>
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{chapterStats.total}</div>
          <div className="text-sm text-gray-600">
            <span className="text-green-600 font-medium">{chapterStats.open} open</span>
            {' • '}
            <span className="text-amber-600 font-medium">{chapterStats.forming} forming</span>
            {' • '}
            <span className="text-gray-500">{chapterStats.closed} closed</span>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Active Members</h3>
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{activeMembersCount || 0}</div>
          <div className="text-sm text-gray-600">
            Across all chapters
          </div>
        </div>

        {/* Meetings This Month */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Meetings This Month</h3>
            <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{meetingsThisMonth || 0}</div>
          <div className="text-sm text-gray-600">
            Completed meetings
          </div>
        </div>

        {/* Average Attendance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Avg Attendance Rate</h3>
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{attendanceRate}%</div>
          <div className="text-sm text-gray-600">
            In-person and video
          </div>
        </div>
      </div>

      {/* Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Chapters Over Time */}
        <ChapterGrowthGraph supabase={supabase} />

        {/* Revenue Over Time */}
        <RevenueGraph supabase={supabase} />
      </div>
    </AdminLayout>
  )
}

async function ChapterGrowthGraph({ supabase }: { supabase: any }) {
  // Count meetings held each month for the past 6 months (shows actual activity)
  const months = []
  const data = []

  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    const { count } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_datetime', monthStart.toISOString())
      .lte('scheduled_datetime', monthEnd.toISOString())
      .eq('status', 'completed')

    months.push(monthStart.toLocaleDateString('en-US', { month: 'short' }))
    data.push(count || 0)
  }

  const maxValue = Math.max(...data, 1)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Meetings Held (Last 6 Months)</h3>
      <div className="flex items-end justify-between h-48 gap-2">
        {data.map((value, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="text-xs font-semibold text-gray-700 mb-1">{value}</div>
            <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(value / maxValue) * 100}%`, minHeight: value > 0 ? '4px' : '0' }} />
            <div className="text-xs text-gray-600 mt-2">{months[i]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

async function RevenueGraph({ supabase }: { supabase: any }) {
  // Get revenue each month for the past 6 months
  const months = []
  const data = []

  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    const { data: funding } = await supabase
      .from('chapter_funding')
      .select('amount')
      .gte('funding_date', monthStart.toISOString().split('T')[0])
      .lte('funding_date', monthEnd.toISOString().split('T')[0])

    const total = funding?.reduce((sum: number, f: any) => sum + parseFloat(f.amount), 0) || 0

    months.push(monthStart.toLocaleDateString('en-US', { month: 'short' }))
    data.push(total)
  }

  const maxValue = Math.max(...data, 1)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue from Funding (Last 6 Months)</h3>
      <div className="flex items-end justify-between h-48 gap-2">
        {data.map((value, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="text-xs font-semibold text-gray-700 mb-1">${Math.round(value)}</div>
            <div className="w-full bg-green-500 rounded-t" style={{ height: `${(value / maxValue) * 100}%`, minHeight: value > 0 ? '4px' : '0' }} />
            <div className="text-xs text-gray-600 mt-2">{months[i]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
