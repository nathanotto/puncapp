import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadMeetingRunnerContext } from '@/lib/meeting-runner-context'
import { OpeningSection } from '@/components/meeting/OpeningSection'
import { LightningRound } from '@/components/meeting/LightningRound'
import { advanceSection, logLightningRound, skipLightningRound } from './actions'
import { TimeLeft } from './TimeLeft'

export default async function MeetingRunnerPage({
  params,
}: {
  params: Promise<{ meetingId: string }>
}) {
  const { meetingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Load context
  const context = await loadMeetingRunnerContext(meetingId, user.id)

  if (!context.authorized) {
    return <div className="p-8 text-center text-red-600">{context.reason}</div>
  }

  const { meeting, attendees, timeLogs, isScribe, meetingEndTime } = context

  // Get lightning round logs
  const lightningLogs = timeLogs
    ?.filter(l => l.section === 'lightning_round' && l.user_id)
    .map(l => ({
      user_id: l.user_id!,
      duration_seconds: l.duration_seconds || 0,
      overtime_seconds: l.overtime_seconds || 0,
      priority: l.priority,
      skipped: l.skipped || false,
    })) || []

  // Create async wrapper functions for server actions
  const handleMeditationComplete = async () => {
    'use server'
    console.log('handleMeditationComplete called')
    await advanceSection(meetingId, 'opening_ethos')
  }

  const handleEthosComplete = async () => {
    'use server'
    console.log('handleEthosComplete called')
    await advanceSection(meetingId, 'lightning_round')
  }

  const handleLightningComplete = async () => {
    'use server'
    console.log('handleLightningComplete called')
    await advanceSection(meetingId, 'full_checkins')
  }

  const handlePersonComplete = async (
    userId: string,
    durationSeconds: number,
    overtimeSeconds: number,
    priority: number
  ) => {
    'use server'
    await logLightningRound(meetingId, userId, durationSeconds, overtimeSeconds, priority)
  }

  const handlePersonSkip = async (userId: string) => {
    'use server'
    await skipLightningRound(meetingId, userId)
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">Meeting in Progress</h1>
          <p className="text-lg font-semibold">Current Phase: {formatPhase(meeting.current_section)}</p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-gray-500">Time Left</p>
            <p className="text-xl font-mono font-bold text-orange-600">
              <TimeLeft endTime={meetingEndTime} />
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">End Time</p>
            <p className="text-xl font-mono font-bold">{formatTime(meetingEndTime)}</p>
          </div>
        </div>
      </div>

      {/* Meeting Phase Progress */}
      <div className="mb-8 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Phases</h3>
        <div className="space-y-2">
          {[
            { key: 'opening_meditation', label: 'Opening' },
            { key: 'opening_ethos', label: 'Ethos' },
            { key: 'lightning_round', label: 'Lightning Round' },
            { key: 'full_checkins', label: 'Check-ins' },
            { key: 'curriculum', label: 'Curriculum' },
            { key: 'closing', label: 'Close' },
          ].map((section) => {
            const sectionIndex = ['not_started', 'opening_meditation', 'opening_ethos', 'lightning_round', 'full_checkins', 'curriculum', 'closing', 'ended'].indexOf(section.key)
            const currentIndex = ['not_started', 'opening_meditation', 'opening_ethos', 'lightning_round', 'full_checkins', 'curriculum', 'closing', 'ended'].indexOf(meeting.current_section)

            const isComplete = currentIndex > sectionIndex
            const isCurrent = meeting.current_section === section.key ||
              (section.key === 'opening_meditation' && ['not_started', 'opening_meditation'].includes(meeting.current_section))
            const isPending = currentIndex < sectionIndex

            return (
              <div
                key={section.key}
                className={`flex items-center gap-3 p-3 rounded ${
                  isCurrent ? 'bg-blue-100 border-2 border-blue-400' :
                  isComplete ? 'bg-green-50' :
                  'bg-white'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isComplete ? 'border-green-500 bg-green-500' :
                  isCurrent ? 'border-blue-500 bg-blue-500' :
                  'border-gray-300'
                }`}>
                  {isComplete ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  ) : null}
                </div>
                <span className={`font-medium ${
                  isCurrent ? 'text-blue-900' :
                  isComplete ? 'text-green-700' :
                  'text-gray-500'
                }`}>
                  {section.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section content */}
      {(meeting.current_section === 'opening_meditation' ||
        meeting.current_section === 'opening_ethos' ||
        meeting.current_section === 'not_started') && (
        <OpeningSection
          isScribe={isScribe}
          currentSection={meeting.current_section}
          onMeditationComplete={handleMeditationComplete}
          onEthosComplete={handleEthosComplete}
        />
      )}

      {meeting.current_section === 'lightning_round' && (
        <LightningRound
          attendees={attendees}
          isScribe={isScribe}
          completedLogs={lightningLogs}
          onPersonComplete={handlePersonComplete}
          onPersonSkip={handlePersonSkip}
          onRoundComplete={handleLightningComplete}
        />
      )}

      {meeting.current_section === 'full_checkins' && (
        <div className="text-center py-8 text-gray-500">
          Full Check-ins coming in Session 6...
        </div>
      )}

      {meeting.current_section === 'curriculum' && (
        <div className="text-center py-8 text-gray-500">
          Curriculum coming in Session 7...
        </div>
      )}

      {meeting.current_section === 'closing' && (
        <div className="text-center py-8 text-gray-500">
          Closing coming in Session 7...
        </div>
      )}
    </div>
  )
}

function formatPhase(section: string): string {
  if (section === 'not_started' || section === 'opening_meditation') return 'Opening'
  if (section === 'opening_ethos') return 'Ethos'
  if (section === 'lightning_round') return 'Lightning Round'
  if (section === 'full_checkins') return 'Check-ins'
  if (section === 'curriculum') return 'Curriculum'
  if (section === 'closing') return 'Close'
  if (section === 'ended') return 'Ended'
  return section
}

function formatSection(section: string): string {
  const names: Record<string, string> = {
    'not_started': 'Not Started',
    'opening_meditation': 'Opening – Meditation',
    'opening_ethos': 'Opening – Ethos',
    'lightning_round': 'Lightning Round',
    'full_checkins': 'Full Check-ins',
    'closing': 'Closing',
    'ended': 'Ended',
  }
  return names[section] || section
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}
