'use client'

import { useState, useEffect } from 'react'
import { FullCheckinSetup } from './FullCheckinSetup'
import { FullCheckin } from './FullCheckin'

interface FullCheckinSectionProps {
  meetingId: string
  attendees: any[]
  lightningLogs: any[]
  fullCheckinLogs: any[]
  meetingEndTime: Date
  isScribe: boolean
  curriculumDitched: boolean
  stretchGoalsByUser: Record<string, { id: string; description: string } | null>
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
}

export function FullCheckinSection({
  attendees,
  lightningLogs,
  fullCheckinLogs,
  meetingEndTime,
  isScribe,
  curriculumDitched,
  stretchGoalsByUser,
  currentTimerUserId,
  currentTimerStart,
  onStartTimer,
  onStopTimer,
  onPersonComplete,
  onPersonSkip,
  onAddMeetingTime,
  onDitchCurriculum,
  onRoundComplete,
}: FullCheckinSectionProps) {
  const hasExistingLogs = fullCheckinLogs.length > 0
  const [isSetupComplete, setIsSetupComplete] = useState(hasExistingLogs)
  const [queue, setQueue] = useState<any[]>(() => {
    // If there are existing logs, reconstruct the queue from them
    if (hasExistingLogs) {
      // Find logs from lightning round to get priority info
      const priorityMap = new Map<string, number>()
      lightningLogs.forEach(log => {
        if (!log.skipped && log.priority) {
          priorityMap.set(log.user_id, log.priority)
        }
      })

      // Build queue from full checkin logs
      const queueFromLogs = fullCheckinLogs.map(log => {
        const attendee = attendees.find(a => a.user_id === log.user_id)
        return {
          user_id: log.user_id,
          user: attendee?.user || { id: log.user_id, name: 'Unknown', username: null },
          priority: priorityMap.get(log.user_id) || 2,
          skipped: log.skipped
        }
      })

      // Add any attendees not yet in logs
      attendees.forEach(attendee => {
        if (!fullCheckinLogs.find(log => log.user_id === attendee.user_id)) {
          queueFromLogs.push({
            user_id: attendee.user_id,
            user: attendee.user,
            priority: priorityMap.get(attendee.user_id) || 2,
            skipped: false
          })
        }
      })

      return queueFromLogs
    }
    return []
  })

  function handleSetupComplete(initialQueue: any[]) {
    setQueue(initialQueue)
    setIsSetupComplete(true)
  }

  // Sync queue's skipped field with fullCheckinLogs whenever logs update
  useEffect(() => {
    console.log('[FullCheckinSection] fullCheckinLogs updated:', {
      logCount: fullCheckinLogs.length,
      logs: fullCheckinLogs.map(l => ({ user: l.user_id, skipped: l.skipped }))
    })

    if (isSetupComplete && fullCheckinLogs.length > 0) {
      setQueue(prevQueue => {
        const updatedQueue = prevQueue.map(queueItem => {
          const log = fullCheckinLogs.find(l => l.user_id === queueItem.user_id)
          if (log) {
            // Update skipped status from the log
            return { ...queueItem, skipped: log.skipped }
          }
          return queueItem
        })
        console.log('[FullCheckinSection] Queue updated')
        return updatedQueue
      })
    }
  }, [fullCheckinLogs, isSetupComplete])

  if (!isSetupComplete) {
    return (
      <FullCheckinSetup
        attendees={attendees}
        lightningLogs={lightningLogs}
        meetingEndTime={meetingEndTime}
        isScribe={isScribe}
        onStart={handleSetupComplete}
      />
    )
  }

  return (
    <FullCheckin
      queue={queue}
      isScribe={isScribe}
      meetingEndTime={meetingEndTime}
      completedLogs={fullCheckinLogs}
      stretchGoals={stretchGoalsByUser}
      currentTimerUserId={currentTimerUserId}
      currentTimerStart={currentTimerStart}
      onStartTimer={onStartTimer}
      onStopTimer={onStopTimer}
      onPersonComplete={onPersonComplete}
      onPersonSkip={onPersonSkip}
      onAddMeetingTime={onAddMeetingTime}
      onDitchCurriculum={onDitchCurriculum}
      onRoundComplete={onRoundComplete}
      curriculumDitched={curriculumDitched}
    />
  )
}
