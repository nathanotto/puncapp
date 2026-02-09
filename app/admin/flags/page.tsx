import { createClient } from '@/lib/supabase/server'
import { normalizeJoin } from '@/lib/supabase/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminFlagsPage() {
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

  // Get flagged chapters
  const { data: flaggedChapters } = await supabase
    .from('chapters')
    .select('id, name, attention_reason, updated_at')
    .eq('needs_attention', true)
    .order('updated_at', { ascending: false })

  // Get unresolved leadership log entries grouped by chapter
  const { data: unresolvedIssues } = await supabase
    .from('leadership_log')
    .select(`
      id,
      log_type,
      description,
      created_at,
      chapter_id,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })

  const normalizedIssues = unresolvedIssues?.map(issue => ({
    ...issue,
    chapters: normalizeJoin(issue.chapters)!
  }))

  // Group issues by chapter
  const issuesByChapter = new Map<string, typeof normalizedIssues>()
  normalizedIssues?.forEach(issue => {
    const chapterId = issue.chapter_id
    const existing = issuesByChapter.get(chapterId) || []
    issuesByChapter.set(chapterId, [...existing, issue])
  })

  const typeColors = {
    meeting_started_late: 'bg-yellow-100 text-yellow-800',
    member_checked_in_late: 'bg-orange-100 text-orange-800',
    member_not_contacted: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-earth-brown mb-2">Chapter Flags</h1>
        <p className="text-stone-gray">Review chapters needing attention and unresolved issues</p>
      </div>

      {/* Flagged Chapters Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-earth-brown mb-4">🚩 Flagged Chapters</h2>
        <div className="bg-white rounded-lg p-6">
          {flaggedChapters && flaggedChapters.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 text-sm font-semibold text-stone-700">Chapter</th>
                  <th className="text-left py-3 text-sm font-semibold text-stone-700">Reason</th>
                  <th className="text-left py-3 text-sm font-semibold text-stone-700">Flagged</th>
                  <th className="text-right py-3 text-sm font-semibold text-stone-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {flaggedChapters.map(chapter => (
                  <tr key={chapter.id} className="border-b border-stone-100">
                    <td className="py-3">
                      <Link
                        href={`/admin/chapters/${chapter.id}`}
                        className="font-medium text-burnt-orange hover:underline"
                      >
                        {chapter.name}
                      </Link>
                    </td>
                    <td className="py-3 text-sm text-stone-700">{chapter.attention_reason}</td>
                    <td className="py-3 text-sm text-stone-600">
                      {new Date(chapter.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/chapters/${chapter.id}`}
                        className="text-burnt-orange hover:underline text-sm"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <p className="text-green-600 font-medium">✓ No chapters flagged</p>
            </div>
          )}
        </div>
      </div>

      {/* Unresolved Issues by Chapter */}
      <div>
        <h2 className="text-2xl font-bold text-earth-brown mb-4">Unresolved Issues by Chapter</h2>
        {issuesByChapter.size > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {Array.from(issuesByChapter.entries()).map(([chapterId, issues]) => {
              if (!issues || issues.length === 0) return null
              const chapter = issues[0].chapters
              return (
                <div key={chapterId} className="bg-white rounded-lg p-6 border-2 border-orange-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Link
                        href={`/admin/chapters/${chapter.id}`}
                        className="text-xl font-bold text-earth-brown hover:underline"
                      >
                        {chapter.name}
                      </Link>
                      <p className="text-sm text-stone-600 mt-1">
                        {issues.length} unresolved issue{issues.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Link
                      href={`/admin/chapters/${chapter.id}`}
                      className="text-burnt-orange hover:underline text-sm"
                    >
                      View Chapter →
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {issues.map(issue => {
                      const typeColor = typeColors[issue.log_type as keyof typeof typeColors] || 'bg-stone-100 text-stone-700'
                      return (
                        <div key={issue.id} className="flex items-start gap-3 pb-3 border-b border-stone-100 last:border-0">
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${typeColor}`}>
                            {issue.log_type.replace(/_/g, ' ')}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-stone-700">{issue.description}</p>
                            <p className="text-xs text-stone-500 mt-1">
                              {new Date(issue.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6">
            <div className="text-center py-8">
              <p className="text-green-600 font-medium">✓ No unresolved issues</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
