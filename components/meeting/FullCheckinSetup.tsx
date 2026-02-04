'use client'

import { useState, useEffect } from 'react'

interface Attendee {
  user_id: string
  user: {
    id: string
    name: string
    username: string | null
  }
}

interface LightningLog {
  user_id: string
  priority: number | null
  skipped: boolean
}

interface FullCheckinSetupProps {
  attendees: Attendee[]
  lightningLogs: LightningLog[]
  meetingEndTime: Date
  isScribe: boolean
  onStart: (queue: CheckinQueueItem[]) => void
}

interface CheckinQueueItem {
  user_id: string
  user: { id: string; name: string; username: string | null }
  priority: number
  skipped: boolean
}

export function FullCheckinSetup({
  attendees,
  lightningLogs,
  meetingEndTime,
  isScribe,
  onStart,
}: FullCheckinSetupProps) {
  const [queue, setQueue] = useState<CheckinQueueItem[]>([])

  useEffect(() => {
    // Match attendees with their lightning round data
    const queueItems: CheckinQueueItem[] = attendees.map(a => {
      const log = lightningLogs.find(l => l.user_id === a.user_id)
      return {
        user_id: a.user_id,
        user: a.user,
        priority: log?.priority ?? 2,
        skipped: false,
      }
    })

    // Sort: P1s first, then P2s
    queueItems.sort((a, b) => a.priority - b.priority)

    setQueue(queueItems)
  }, [attendees, lightningLogs])

  // Calculate time allocation
  const now = new Date()
  const timeUntilEnd = Math.max(0, meetingEndTime.getTime() - now.getTime())
  const availableMinutes = Math.floor(timeUntilEnd / 60000) - 30 // Reserve 30 min for closing
  const activeMembers = queue.filter(q => !q.skipped).length
  const minutesPerPerson = activeMembers > 0 ? Math.floor(availableMinutes / activeMembers) : 0
  const secondsPerPerson = minutesPerPerson * 60

  function toggleSkip(userId: string) {
    setQueue(prev => prev.map(q =>
      q.user_id === userId ? { ...q, skipped: !q.skipped } : q
    ))
  }

  function getDisplayName(item: CheckinQueueItem): string {
    return item.user.username || item.user.name
  }

  // Separate P1s and P2s for display
  const p1Members = queue.filter(q => q.priority === 1)
  const p2Members = queue.filter(q => q.priority === 2)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Full Check-ins</h2>
        <p className="text-gray-600">Review the queue before starting</p>
      </div>

      {/* Time allocation display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-sm text-blue-600 mb-1">Time per person</p>
        <p className="text-3xl font-bold text-blue-800">
          {minutesPerPerson} min
        </p>
        <p className="text-sm text-blue-600 mt-1">
          {availableMinutes} min available • {activeMembers} members
        </p>
        {availableMinutes <= 0 && (
          <p className="text-red-600 mt-2 font-medium">
            ⚠️ No time remaining! Add time or skip members.
          </p>
        )}
      </div>

      {/* P1 Queue */}
      <div className="bg-orange-50 rounded-lg p-4">
        <h3 className="font-medium text-orange-800 mb-3">
          Priority 1 ({p1Members.filter(m => !m.skipped).length} members)
        </h3>
        <div className="space-y-2">
          {p1Members.map((item, index) => (
            <div
              key={item.user_id}
              className={`flex items-center justify-between p-2 rounded ${
                item.skipped ? 'bg-gray-100 opacity-50' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-400 w-6">{index + 1}.</span>
                <span className={item.skipped ? 'line-through text-gray-400' : 'font-medium'}>
                  {getDisplayName(item)}
                </span>
              </div>
            </div>
          ))}
          {p1Members.length === 0 && (
            <p className="text-gray-500 text-sm">No P1 members</p>
          )}
        </div>
      </div>

      {/* P2 Queue */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-3">
          Priority 2 ({p2Members.filter(m => !m.skipped).length} members)
        </h3>
        <div className="space-y-2">
          {p2Members.map((item, index) => (
            <div
              key={item.user_id}
              className={`flex items-center justify-between p-2 rounded ${
                item.skipped ? 'bg-gray-100 opacity-50' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-400 w-6">{p1Members.length + index + 1}.</span>
                <span className={item.skipped ? 'line-through text-gray-400' : 'font-medium'}>
                  {getDisplayName(item)}
                </span>
              </div>
              {isScribe && (
                <button
                  onClick={() => toggleSkip(item.user_id)}
                  className={`text-sm px-3 py-1 rounded ${
                    item.skipped
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {item.skipped ? 'Restore' : 'Skip'}
                </button>
              )}
            </div>
          ))}
          {p2Members.length === 0 && (
            <p className="text-gray-500 text-sm">No P2 members</p>
          )}
        </div>
      </div>

      {/* Start button */}
      {isScribe && (
        <button
          onClick={() => onStart(queue)}
          disabled={activeMembers === 0 || minutesPerPerson <= 0}
          className={`w-full py-3 rounded-lg font-medium ${
            activeMembers > 0 && minutesPerPerson > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Start Full Check-ins →
        </button>
      )}
    </div>
  )
}
