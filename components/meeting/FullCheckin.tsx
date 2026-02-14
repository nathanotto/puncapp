'use client'

import { useState, useEffect, useMemo } from 'react'
import { TimerWidget } from './TimerWidget'

interface CheckinQueueItem {
  user_id: string
  user: { id: string; name: string; username: string | null }
  priority: number
  skipped: boolean
}

interface StretchGoal {
  id: string
  description: string
}

interface CheckinLog {
  user_id: string
  duration_seconds: number
  overtime_seconds: number
  skipped: boolean
  stretch_goal_action: string | null
  requested_support: boolean
}

interface FullCheckinProps {
  queue: CheckinQueueItem[]
  isScribe: boolean
  meetingEndTime: Date
  completedLogs: CheckinLog[]
  stretchGoals: Record<string, StretchGoal | null>
  currentTimerUserId: string | null
  currentTimerStart: string | null
  onStartTimer: (userId: string) => Promise<void>
  onStopTimer: () => Promise<void>
  onPersonComplete: (
    userId: string,
    durationSeconds: number,
    overtimeSeconds: number,
    stretchGoalAction: 'kept' | 'completed' | 'new' | 'none',
    requestedSupport: boolean,
    newStretchGoalText?: string
  ) => Promise<void>
  onPersonSkip: (userId: string) => Promise<void>
  onAddMeetingTime: (minutes: number) => Promise<void>
  onDitchCurriculum: () => Promise<void>
  onRoundComplete: () => Promise<void>
  curriculumDitched: boolean
}

export function FullCheckin({
  queue,
  isScribe,
  meetingEndTime,
  completedLogs,
  stretchGoals,
  currentTimerUserId,
  currentTimerStart,
  onStartTimer,
  onStopTimer,
  onPersonComplete,
  onPersonSkip,
  onAddMeetingTime,
  onDitchCurriculum,
  onRoundComplete,
  curriculumDitched,
}: FullCheckinProps) {
  // Use queue prop directly instead of local state
  const localQueue = queue

  // Convert shared timer to Date object
  const startTime = currentTimerStart ? new Date(currentTimerStart) : null

  // Stretch goal UI state
  const [stretchAction, setStretchAction] = useState<'kept' | 'completed' | 'new' | 'none' | null>(null)
  const [newStretchGoalText, setNewStretchGoalText] = useState('')
  const [requestedSupport, setRequestedSupport] = useState(false)
  const [deferStretchGoal, setDeferStretchGoal] = useState(false)

  const completedUserIds = new Set(completedLogs.map(l => l.user_id))
  const activeQueue = localQueue.filter(q => !q.skipped)

  console.log('[FullCheckin] Render:', {
    queueLength: localQueue.length,
    activeQueueLength: activeQueue.length,
    completedCount: completedUserIds.size,
    completedUsers: Array.from(completedUserIds),
    activeUsers: activeQueue.map(q => q.user.name || q.user.username)
  })

  async function handleRoundComplete() {
    console.log('[FullCheckin] handleRoundComplete called');
    try {
      await onRoundComplete();
      console.log('[FullCheckin] onRoundComplete succeeded, reloading page...');
      window.location.reload();
    } catch (error) {
      console.error('[FullCheckin] Error completing round:', error);
      alert(`Failed to advance to next section: ${error}`);
    }
  }
  const currentPerson = activeQueue.find(q => !completedUserIds.has(q.user_id))
  const currentStretchGoal = currentPerson ? stretchGoals[currentPerson.user_id] : null

  console.log('[FullCheckin] Current person:', currentPerson ? (currentPerson.user.name || currentPerson.user.username) : 'NONE')

  // Check if round is truly complete: all active queue members have completed
  const allActiveCompleted = activeQueue.length > 0 && activeQueue.every(q => completedUserIds.has(q.user_id))

  // Calculate time per person dynamically
  const timeAllocation = useMemo(() => {
    const now = new Date()
    const timeUntilEnd = Math.max(0, meetingEndTime.getTime() - now.getTime())
    const reservedMinutes = curriculumDitched ? 0 : 30
    const availableMinutes = Math.floor(timeUntilEnd / 60000) - reservedMinutes
    const remainingMembers = activeQueue.filter(q => !completedUserIds.has(q.user_id)).length
    const minutesPerPerson = remainingMembers > 0 ? Math.max(1, Math.floor(availableMinutes / remainingMembers)) : 0

    return {
      availableMinutes,
      remainingMembers,
      minutesPerPerson,
      secondsPerPerson: minutesPerPerson * 60,
    }
  }, [meetingEndTime, activeQueue, completedUserIds, curriculumDitched])

  const outOfTime = timeAllocation.availableMinutes <= 0

  // Reset UI when moving to next person
  useEffect(() => {
    setStretchAction(null)
    setNewStretchGoalText('')
    setRequestedSupport(false)
    setDeferStretchGoal(false)
  }, [currentPerson?.user_id])

  async function handleStart() {
    if (!currentPerson) return
    await onStartTimer(currentPerson.user_id)
  }

  async function handleSkipP2(userId: string) {
    const person = localQueue.find(q => q.user_id === userId)
    if (person?.priority !== 2) return
    await onPersonSkip(userId)
    // Stop timer if it was running
    if (currentTimerUserId) {
      await onStopTimer()
    }
  }

  async function handleNext(overtimeSeconds: number) {
    console.log('[FullCheckin] handleNext called for:', currentPerson ? (currentPerson.user.name || currentPerson.user.username) : 'NONE')

    if (!currentPerson || !startTime) {
      console.log('[FullCheckin] Missing currentPerson or startTime, returning')
      return
    }

    const endTime = new Date()
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

    console.log('[FullCheckin] Completing check-in:', {
      user: currentPerson.user.name || currentPerson.user.username,
      duration: durationSeconds,
      overtime: overtimeSeconds
    })

    let finalStretchAction: 'kept' | 'completed' | 'new' | 'none' = 'none'
    let finalNewStretchGoalText: string | undefined

    if (currentStretchGoal) {
      finalStretchAction = stretchAction || 'kept'
    } else {
      if (stretchAction === 'new') {
        finalStretchAction = 'new'
      } else {
        finalStretchAction = 'none'
      }
    }

    if (finalStretchAction === 'new') {
      if (deferStretchGoal || !newStretchGoalText.trim()) {
        finalNewStretchGoalText = undefined
      } else {
        finalNewStretchGoalText = newStretchGoalText.trim()
      }
    }

    try {
      await onPersonComplete(
        currentPerson.user_id,
        durationSeconds,
        overtimeSeconds,
        finalStretchAction,
        requestedSupport,
        finalNewStretchGoalText
      )

      console.log('[FullCheckin] onPersonComplete succeeded')

      // Stop the timer
      await onStopTimer()

      console.log('[FullCheckin] Timer stopped. Reloading page to update queue...')
      // Force reload to ensure UI updates
      window.location.reload()
    } catch (error) {
      console.error('[FullCheckin] Error in handleNext:', error)
      alert(`Failed to advance: ${error}`)
    }
  }

  function handleAddTime(seconds: number) {
    console.log(`Added ${seconds} seconds to timer`)
  }

  function getDisplayName(item: CheckinQueueItem): string {
    return item.user.username || item.user.name
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Only complete if we have a queue AND all active members have completed
  const isComplete = allActiveCompleted

  if (isComplete) {
    const completedCount = completedLogs.filter(l => !l.skipped).length
    const supportRequests = completedLogs.filter(l => l.requested_support).length

    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-bold text-green-600 mb-4">Full Check-ins Complete!</h3>
        <p className="text-gray-600 mb-2">
          {completedCount} members checked in.
        </p>
        {supportRequests > 0 && (
          <p className="text-orange-600 mb-4">
            {supportRequests} member{supportRequests > 1 ? 's' : ''} requested support.
          </p>
        )}
        {isScribe && (
          <button
            onClick={handleRoundComplete}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            {curriculumDitched ? 'Proceed to Closing →' : 'Proceed to Curriculum →'}
          </button>
        )}
      </div>
    )
  }

  if (outOfTime && !currentPerson) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-xl font-bold text-red-600 mb-2">⚠️ Out of Time</h3>
          <p className="text-gray-600 mb-4">
            No time remaining for check-ins. Choose an option:
          </p>

          {isScribe && (
            <div className="space-y-3">
              <button
                onClick={() => onAddMeetingTime(5)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Add 5 Minutes to Meeting
              </button>

              {!curriculumDitched && (
                <button
                  onClick={onDitchCurriculum}
                  className="w-full py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700"
                >
                  Ditch Curriculum (+30 min for Check-ins)
                </button>
              )}

              <p className="text-sm text-gray-500 mt-4">
                Or skip P2 members below to free up time.
              </p>
            </div>
          )}
        </div>

        <RemainingQueue
          queue={localQueue}
          completedUserIds={completedUserIds}
          isScribe={isScribe}
          onSkip={handleSkipP2}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time allocation header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
        <div>
          <span className="text-sm text-blue-600">Time per person: </span>
          <span className="font-bold text-blue-800">{timeAllocation.minutesPerPerson} min</span>
        </div>
        <div className="text-sm text-blue-600">
          {timeAllocation.remainingMembers} remaining
        </div>
      </div>

      {/* Scribe time controls */}
      {isScribe && (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => onAddMeetingTime(5)}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Add 5 to Meeting
          </button>
          {!curriculumDitched && (
            <button
              onClick={onDitchCurriculum}
              className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
            >
              Ditch Curriculum
            </button>
          )}
        </div>
      )}

      {/* Timer Widget */}
      {currentPerson && (
        <TimerWidget
          currentPerson={{
            id: currentPerson.user_id,
            name: getDisplayName(currentPerson),
          }}
          allottedSeconds={timeAllocation.secondsPerPerson}
          isScribe={isScribe}
          section="full_checkins"
          onNext={handleNext}
          onSkip={async () => {}}
          onAddTime={handleAddTime}
          onStart={handleStart}
        />
      )}

      {/* Stretch Goal section */}
      {isScribe && currentPerson && startTime && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-800 mb-3">Stretch Goal</h4>

          {currentStretchGoal ? (
            <div className="mb-3 p-2 bg-white rounded border">
              <p className="text-sm text-gray-500">Current goal:</p>
              <p className="font-medium">{currentStretchGoal.description}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-3">No current stretch goal</p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {currentStretchGoal && (
              <>
                <button
                  onClick={() => setStretchAction('kept')}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    stretchAction === 'kept'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Keep
                </button>
                <button
                  onClick={() => setStretchAction('completed')}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    stretchAction === 'completed'
                      ? 'bg-green-600 text-white'
                      : 'bg-white border border-green-300 text-green-700 hover:bg-green-100'
                  }`}
                >
                  Complete
                </button>
              </>
            )}
            <button
              onClick={() => setStretchAction('new')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                stretchAction === 'new'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-100'
              }`}
            >
              New Goal
            </button>
          </div>

          {stretchAction === 'new' && (
            <div className="space-y-2">
              <textarea
                value={newStretchGoalText}
                onChange={(e) => setNewStretchGoalText(e.target.value)}
                placeholder="Enter new stretch goal..."
                className="w-full p-2 border rounded text-sm"
                rows={2}
                disabled={deferStretchGoal}
              />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={deferStretchGoal}
                  onChange={(e) => setDeferStretchGoal(e.target.checked)}
                />
                He'll enter it later (creates task)
              </label>
            </div>
          )}
        </div>
      )}

      {/* Support request toggle */}
      {isScribe && currentPerson && startTime && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={requestedSupport}
              onChange={(e) => setRequestedSupport(e.target.checked)}
              className="w-5 h-5 text-purple-600"
            />
            <span className="font-medium text-purple-800">Requested Support</span>
          </label>
          {requestedSupport && (
            <p className="text-sm text-purple-600 mt-2">
              Support commitments will be formalized in Closing.
            </p>
          )}
        </div>
      )}

      {/* Queue display */}
      <RemainingQueue
        queue={localQueue}
        completedUserIds={completedUserIds}
        completedLogs={completedLogs}
        currentUserId={currentPerson?.user_id}
        isScribe={isScribe}
        onSkip={handleSkipP2}
      />
    </div>
  )
}

function RemainingQueue({
  queue,
  completedUserIds,
  completedLogs = [],
  currentUserId,
  isScribe,
  onSkip,
}: {
  queue: CheckinQueueItem[]
  completedUserIds: Set<string>
  completedLogs?: CheckinLog[]
  currentUserId?: string
  isScribe: boolean
  onSkip: (userId: string) => void
}) {
  function getDisplayName(item: CheckinQueueItem): string {
    return item.user.username || item.user.name
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Queue</h4>
      <div className="space-y-2">
        {queue.map((item) => {
          const log = completedLogs.find(l => l.user_id === item.user_id)
          const isCompleted = completedUserIds.has(item.user_id)
          const isCurrent = item.user_id === currentUserId
          const isSkipped = item.skipped || log?.skipped
          const isPending = !isCompleted && !isCurrent && !isSkipped

          return (
            <div
              key={item.user_id}
              className={`flex items-center justify-between p-2 rounded ${
                isCurrent ? 'bg-blue-100 border-2 border-blue-400' :
                isCompleted ? 'bg-green-50' :
                isSkipped ? 'bg-gray-100 opacity-50' :
                'bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-400">
                  {isCompleted ? '✓' : isCurrent ? '▶' : isSkipped ? '×' : '○'}
                </span>
                <span className={`font-medium ${isSkipped ? 'line-through text-gray-400' : ''}`}>
                  {getDisplayName(item)}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  item.priority === 1 ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'
                }`}>
                  P{item.priority}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {log && !isSkipped && (
                  <span className="text-sm text-gray-600">
                    {formatDuration(log.duration_seconds)}
                    {log.overtime_seconds > 0 && (
                      <span className="text-red-500"> (+{formatDuration(log.overtime_seconds)})</span>
                    )}
                  </span>
                )}
                {log?.requested_support && (
                  <span className="text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">
                    Support
                  </span>
                )}
                {isSkipped && (
                  <span className="text-xs text-gray-400">Skipped</span>
                )}
                {isScribe && isPending && item.priority === 2 && (
                  <button
                    onClick={() => onSkip(item.user_id)}
                    className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                  >
                    Skip
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
