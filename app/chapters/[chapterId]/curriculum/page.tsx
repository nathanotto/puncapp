import { createClient } from '@/lib/supabase/server'
import { normalizeJoin } from '@/lib/supabase/utils'
import { redirect } from 'next/navigation'

export default async function ChapterCurriculumPage({
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

  // Get completed curriculum modules for this chapter
  const { data: history } = await supabase
    .from('chapter_curriculum_history')
    .select(`
      id,
      completed_at,
      module:curriculum_modules!inner(
        id,
        sequence,
        title,
        description
      ),
      meeting:meetings(
        scheduled_date,
        scheduled_time
      )
    `)
    .eq('chapter_id', chapterId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-earth-brown mb-6">
        {chapter?.name} - Curriculum
      </h1>

      {/* Completed Modules */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-earth-brown mb-4">
          Completed Modules
        </h2>

        {!history || history.length === 0 ? (
          <p className="text-stone-gray">No curriculum modules completed yet.</p>
        ) : (
          <div className="space-y-4">
            {history.map((item) => {
              const module = normalizeJoin(item.module);
              const meeting = normalizeJoin(item.meeting);

              return (
              <div
                key={item.id}
                className="p-4 bg-warm-cream/50 rounded-lg border-l-4 border-burnt-orange"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2 py-1 bg-burnt-orange text-white rounded text-xs font-medium">
                    Module {module?.sequence}
                  </span>
                  {item.completed_at && (
                    <span className="text-xs text-stone-gray">
                      Completed:{' '}
                      {new Date(item.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-earth-brown mb-1">
                  {module?.title}
                </h3>
                <p className="text-sm text-stone-gray mb-2">
                  {module?.description}
                </p>
                {meeting && (
                  <p className="text-xs text-stone-gray">
                    Meeting:{' '}
                    {new Date(
                      `${meeting.scheduled_date}T${meeting.scheduled_time}`
                    ).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Explore Curriculum - Coming Soon */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">
          📚 Explore Curriculum
        </h2>
        <p className="text-blue-600">
          Coming soon: Browse all available curriculum modules, view previews, and see what's next for your chapter.
        </p>
      </div>
    </div>
  )
}
