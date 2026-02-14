'use client'

import { useState, useTransition } from 'react'

interface ScheduleMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  chapterId: string
  chapterName: string
  defaultLocation: string
}

export function ScheduleMeetingModal({
  isOpen,
  onClose,
  chapterId,
  chapterName,
  defaultLocation,
}: ScheduleMeetingModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Get current date/time for defaults
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentTime = now.toTimeString().slice(0, 5)

  // Form state
  const [scheduledDate, setScheduledDate] = useState(today)
  const [scheduledTime, setScheduledTime] = useState(currentTime)
  const [location, setLocation] = useState(defaultLocation)
  const [topic, setTopic] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(120)
  const [messageToMembers, setMessageToMembers] = useState('Special consideration')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation
    if (!scheduledDate || !scheduledTime) {
      setError('Date and time are required')
      return
    }

    if (!topic.trim()) {
      setError('Topic is required')
      return
    }

    if (!location.trim()) {
      setError('Location is required')
      return
    }

    // Check not in past
    const meetingDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
    if (meetingDateTime < now) {
      setError('Cannot schedule meeting in the past')
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/meetings/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapterId,
            scheduledDate,
            scheduledTime,
            location,
            topic,
            durationMinutes,
            messageToMembers,
            isSpecialMeeting: true,
          }),
        })

        const data = await response.json()

        if (!data.success) {
          setError(data.error || 'Failed to schedule meeting')
          return
        }

        // Success - close modal and reload page
        window.location.reload()
      } catch (error) {
        console.error('Error scheduling meeting:', error)
        setError('Failed to schedule meeting. Please try again.')
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-earth-brown">Schedule A Meeting</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              disabled={isPending}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {error}
              </div>
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={today}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes) *
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic/Purpose *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Celebration, Man in Need, Chapter Activity"
                required
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Meeting location"
                required
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
              />
            </div>

            {/* Message to Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to Members
              </label>
              <textarea
                value={messageToMembers}
                onChange={(e) => setMessageToMembers(e.target.value)}
                placeholder="Message about this special meeting"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be sent to all chapter members
              </p>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Special Consideration Meeting:</strong> This bypasses the normal meeting structure.
                The Scribe can start it, add notes during the meeting, and complete it with final notes.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2 bg-burnt-orange text-white rounded-lg hover:bg-deep-charcoal disabled:opacity-50"
              >
                {isPending ? 'Scheduling...' : 'Schedule Meeting'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
