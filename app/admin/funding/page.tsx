import { requireAdmin, getAdminClient } from '@/lib/auth/admin'
import AdminLayout from '@/components/layout/AdminLayout'
import Card from '@/components/ui/Card'

export default async function AdminFundingPage() {
  const admin = await requireAdmin()
  const supabase = await getAdminClient()

  // Get all chapters with their funding status
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, name, status, monthly_support')
    .eq('status', 'open') // Only active chapters

  const totalChapters = chapters?.length || 0

  // Get funding for current month
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Calculate funding for each chapter
  let fullyFundedCount = 0
  let totalShortfall = 0
  const chapterFundingDetails = []

  for (const chapter of chapters || []) {
    const { data: funding } = await supabase
      .from('chapter_funding')
      .select('amount')
      .eq('chapter_id', chapter.id)
      .gte('funding_date', firstOfMonth.toISOString().split('T')[0])
      .lte('funding_date', lastOfMonth.toISOString().split('T')[0])

    const totalFunding = funding?.reduce((sum: number, f: any) => sum + parseFloat(f.amount), 0) || 0
    const goal = chapter.monthly_support || 55
    const percentage = Math.round((totalFunding / goal) * 100)
    const isFunded = totalFunding >= goal

    if (isFunded) {
      fullyFundedCount++
    } else {
      totalShortfall += (goal - totalFunding)
    }

    chapterFundingDetails.push({
      ...chapter,
      totalFunding,
      goal,
      percentage,
      isFunded
    })
  }

  const partiallyFundedCount = totalChapters - fullyFundedCount
  const fundingPercentage = totalChapters > 0 ? Math.round((fullyFundedCount / totalChapters) * 100) : 0

  return (
    <AdminLayout admin={admin} currentPage="funding">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Funding Overview</h2>
        <p className="text-gray-600 mt-1">Chapter funding status for {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-gray-900 mb-2">{totalChapters}</div>
            <div className="text-sm text-gray-600">Total Chapters</div>
          </div>
        </Card>

        <Card>
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-green-600 mb-2">{fullyFundedCount}</div>
            <div className="text-sm text-gray-600">Fully Funded</div>
            <div className="text-xs text-green-600 mt-1">{fundingPercentage}%</div>
          </div>
        </Card>

        <Card>
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-amber-600 mb-2">{partiallyFundedCount}</div>
            <div className="text-sm text-gray-600">Needs Funding</div>
            <div className="text-xs text-amber-600 mt-1">{100 - fundingPercentage}%</div>
          </div>
        </Card>

        <Card>
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-red-600 mb-2">${Math.round(totalShortfall)}</div>
            <div className="text-sm text-gray-600">Monthly Shortfall</div>
            <div className="text-xs text-gray-600 mt-1">to fully support all chapters</div>
          </div>
        </Card>
      </div>

      {/* Funding Status Details */}
      <Card>
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Chapter Funding Status</h3>

        <div className="space-y-3">
          {chapterFundingDetails.length > 0 ? (
            chapterFundingDetails.map((chapter: any) => (
              <div key={chapter.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold text-gray-900">{chapter.name}</div>
                  <div className={`text-sm font-semibold ${chapter.isFunded ? 'text-green-600' : 'text-amber-600'}`}>
                    ${Math.round(chapter.totalFunding)} / ${chapter.goal}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${chapter.isFunded ? 'bg-green-600' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(chapter.percentage, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {chapter.percentage}% funded
                  {!chapter.isFunded && ` • $${Math.round(chapter.goal - chapter.totalFunding)} needed`}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No active chapters found.</p>
          )}
        </div>
      </Card>
    </AdminLayout>
  )
}
