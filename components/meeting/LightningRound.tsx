'use client'

import { useState, useEffect, useRef } from 'react'
import { TimerWidget } from './TimerWidget'

interface Attendee {
  id: string
  user_id: string
  user: {
    id: string
    name: string
    username: string | null
  }
}

interface LightningLog {
  user_id: string
  duration_seconds: number
  overtime_seconds: number
  priority: number | null
  skipped: boolean
}

interface LightningRoundProps {
  attendees: Attendee[]
  isScribe: boolean
  completedLogs: LightningLog[]
  currentTimerUserId: string | null
  currentTimerStart: string | null
  onStartTimer: (userId: string) => Promise<void>
  onStopTimer: () => Promise<void>
  onPersonComplete: (userId: string, durationSeconds: number, overtimeSeconds: number, priority: number) => Promise<void>
  onPersonSkip: (userId: string) => Promise<void>
  onRoundComplete: () => Promise<void>
}

export function LightningRound({
  attendees,
  isScribe,
  completedLogs,
  currentTimerUserId,
  currentTimerStart,
  onStartTimer,
  onStopTimer,
  onPersonComplete,
  onPersonSkip,
  onRoundComplete,
}: LightningRoundProps) {
  const [queue, setQueue] = useState<Attendee[]>([])
  const [isCompleting, setIsCompleting] = useState(false)
  const hasInitialized = useRef(false)

  // Convert shared timer to Date object
  const startTime = currentTimerStart ? new Date(currentTimerStart) : null

  // Initialize queue with random order (only once)
  useEffect(() => {
    if (!hasInitialized.current && attendees.length > 0) {
      const shuffled = [...attendees].sort(() => Math.random() - 0.5)
      setQueue(shuffled)
      hasInitialized.current = true
    }
  }, [attendees])

  // Get completed user IDs
  const completedUserIds = new Set(completedLogs.map(l => l.user_id))
  const skippedUserIds = new Set(completedLogs.filter(l => l.skipped).map(l => l.user_id))

  // Calculate current index based on completed logs (persists across re-renders)
  const currentIndex = queue.findIndex(attendee => !completedUserIds.has(attendee.user_id))

  // Current person
  const currentPerson = currentIndex >= 0 ? queue[currentIndex] : null
  const isComplete = currentIndex === -1 || currentIndex >= queue.length

  async function handleStart() {
    if (!currentPerson) return
    await onStartTimer(currentPerson.user_id)
  }

  async function handleNext(overtimeSeconds: number, priority?: number) {
    console.log('[CLIENT] handleNext called')
    console.log('[CLIENT] currentPerson:', currentPerson?.user.name)
    console.log('[CLIENT] startTime:', startTime)

    if (!currentPerson || !startTime) {
      console.log('[CLIENT] Missing currentPerson or startTime, returning')
      return
    }

    const endTime = new Date()
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

    console.log('[CLIENT] About to call onPersonComplete with:', {
      userId: currentPerson.user_id,
      duration: durationSeconds,
      overtime: overtimeSeconds,
      priority: priority ?? 2
    })

    try {
      await onPersonComplete(
        currentPerson.user_id,
        durationSeconds,
        overtimeSeconds,
        priority ?? 2 // Default to P2 if not set
      )

      console.log('[CLIENT] Person complete logged successfully')
      // Stop the timer
      await onStopTimer()
    } catch (error) {
      console.error('[CLIENT] Error completing person:', error)
      alert('Failed to log completion. Check console.')
    }
  }

  async function handleSkip() {
    if (!currentPerson) return

    console.log('handleSkip called for', currentPerson.user.name)

    try {
      await onPersonSkip(currentPerson.user_id)
      console.log('Person skip logged successfully')
      // Stop the timer if it was running
      if (currentTimerUserId) {
        await onStopTimer()
      }
    } catch (error) {
      console.error('Error skipping person:', error)
      alert('Failed to log skip. Check console.')
    }
  }

  function handleAddTime(seconds: number) {
    // Time is managed in TimerWidget, this is for logging if needed
    console.log(`Added ${seconds} seconds`)
  }

  async function handleRoundComplete() {
    if (isCompleting) return

    setIsCompleting(true)
    try {
      await onRoundComplete()
    } catch (error) {
      console.error('Error completing round:', error)
      alert('Failed to advance to next section.')
    } finally {
      setIsCompleting(false)
    }
  }

  // Format duration for display
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function getDisplayName(attendee: Attendee): string {
    return attendee.user.username || attendee.user.name
  }

  if (isComplete) {
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-bold text-green-600 mb-4">Lightning Round Complete!</h3>
        <p className="text-gray-600 mb-6">
          {completedLogs.filter(l => !l.skipped).length} members shared.
          {completedLogs.filter(l => l.priority === 1).length} Priority 1,{' '}
          {completedLogs.filter(l => l.priority === 2).length} Priority 2.
        </p>
        {isScribe && (
          <button
            onClick={handleRoundComplete}
            disabled={isCompleting}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompleting ? 'Advancing...' : 'Proceed to Full Check-ins →'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Timer Widget */}
      <TimerWidget
        currentPerson={currentPerson ? {
          id: currentPerson.user_id,
          name: getDisplayName(currentPerson),
        } : null}
        allottedSeconds={60} // 1 minute for Lightning Round
        isScribe={isScribe}
        section="lightning_round"
        onNext={handleNext}
        onSkip={handleSkip}
        onAddTime={handleAddTime}
        onStart={handleStart}
      />

      {/* Queue display */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Queue</h4>
        <div className="space-y-2">
          {queue.map((attendee, index) => {
            const log = completedLogs.find(l => l.user_id === attendee.user_id)
            const isCompleted = completedUserIds.has(attendee.user_id)
            const isSkipped = skippedUserIds.has(attendee.user_id)
            const isCurrent = index === currentIndex
            const isPending = index > currentIndex

            return (
              <div
                key={attendee.user_id}
                className={`flex items-center justify-between p-2 rounded ${
                  isCurrent ? 'bg-blue-100 border-2 border-blue-400' :
                  isCompleted ? 'bg-green-50' :
                  isSkipped ? 'bg-gray-100 opacity-50' :
                  'bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">
                    {isCompleted ? '✓' : isCurrent ? '▶' : '○'}
                  </span>
                  <span className={`font-medium ${isSkipped ? 'line-through text-gray-400' : ''}`}>
                    {getDisplayName(attendee)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {log && !isSkipped && (
                    <>
                      <span className="text-gray-600">
                        {formatDuration(log.duration_seconds)}
                        {log.overtime_seconds > 0 && (
                          <span className="text-red-500"> (+{formatDuration(log.overtime_seconds)})</span>
                        )}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.priority === 1 ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'
                      }`}>
                        P{log.priority}
                      </span>
                    </>
                  )}
                  {isSkipped && (
                    <span className="text-gray-400 text-xs">Skipped</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
