import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CurriculumSelectionForm from './CurriculumSelectionForm'

interface SelectCurriculumPageProps {
  searchParams: Promise<{ meeting: string }>
}

export default async function SelectCurriculumPage({ searchParams }: SelectCurriculumPageProps) {
  const params = await searchParams
  const { meeting: meetingId } = params

  if (!meetingId) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Meeting not specified</h1>
          <Link href="/" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // Get user's name
  const { data: userData } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', user.id)
    .single()

  // Get meeting with chapter info
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      status,
      selected_curriculum_id,
      chapter_id,
      chapters!inner (
        id,
        name
      )
    `)
    .eq('id', meetingId)
    .single()

  if (meetingError || !meeting) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Meeting not found</h1>
          <Link href="/" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Check user is Leader of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', meeting.chapter_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || membership.role !== 'leader') {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">Access denied</h1>
          <p className="text-stone-gray mb-4">Only the Chapter Leader can select curriculum.</p>
          <Link href="/" className="text-burnt-orange hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Get all available curriculum modules
  const { data: modules, error: modulesError } = await supabase
    .from('curriculum_modules')
    .select(`
      id,
      title,
      principle,
      description,
      reflective_question,
      exercise,
      order_in_sequence,
      sequence_id,
      curriculum_sequences!inner (
        id,
        title,
        description
      )
    `)
    .eq('is_active', true)
    .order('order_in_sequence')

  if (modulesError) {
    console.error('Error fetching modules:', modulesError)
  }

  // Get chapter's curriculum history to show what's been done
  const { data: history } = await supabase
    .from('chapter_curriculum_history')
    .select('module_id, completed_at')
    .eq('chapter_id', meeting.chapter_id)

  const completedModuleIds = new Set(history?.map(h => h.module_id) || [])

  // Format meeting date
  const meetingDate = new Date(meeting.scheduled_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const alreadySelected = meeting.selected_curriculum_id != null

  // Get selected module details if already selected
  let selectedModule = null
  if (alreadySelected && modules) {
    selectedModule = modules.find(m => m.id === meeting.selected_curriculum_id)
  }

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header */}
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <Link href="/" className="text-sm text-warm-cream/80 hover:text-warm-cream">
              ← Back to Dashboard
            </Link>
            <div className="text-right text-sm">
              <p className="text-warm-cream/80">{userData?.username || userData?.name || 'Leader'}</p>
              <a href="/auth/logout" className="text-warm-cream/60 hover:text-warm-cream">
                Sign Out
              </a>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Select Curriculum Module</h1>
          <p className="text-warm-cream/80">{meeting.chapters.name} • {meetingDate}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-6">
        {/* Already Selected */}
        {alreadySelected && selectedModule && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-green-900 mb-2">Curriculum Selected</h2>
            <p className="text-green-800 mb-3">
              You've selected: <strong>{selectedModule.title}</strong>
            </p>
            <p className="text-sm text-green-700">
              You can change your selection below if needed.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-earth-brown mb-4">Choose a Module for Your Meeting</h2>
          <p className="text-stone-gray mb-4">
            Select one curriculum module to guide your chapter's work during the Curriculum section.
            Each module includes a principle, reflective question, and group exercise.
          </p>
          <p className="text-sm text-stone-gray">
            Modules marked as "Previously completed" have been used by your chapter before. You can select them again if desired.
          </p>
        </div>

        {/* Curriculum Selection Form */}
        {modules && modules.length > 0 ? (
          <CurriculumSelectionForm
            meetingId={meetingId}
            modules={modules}
            completedModuleIds={completedModuleIds}
            selectedModuleId={meeting.selected_curriculum_id || null}
          />
        ) : (
          <div className="bg-white rounded-lg p-6">
            <p className="text-stone-gray">No curriculum modules available. Contact support.</p>
          </div>
        )}
      </main>
    </div>
  )
}
