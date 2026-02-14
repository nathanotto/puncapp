'use client'

import { useState, useTransition } from 'react'

interface SpecialMeetingRunnerProps {
  meeting: any
  isScribe: boolean
  currentUserId: string
  meetingDate: string
  onStartMeeting: () => Promise<void>
  onCompleteMeeting: (notes: string) => Promise<void>
}

export function SpecialMeetingRunner({
  meeting,
  isScribe,
  currentUserId,
  meetingDate,
  onStartMeeting,
  onCompleteMeeting,
}: SpecialMeetingRunnerProps) {
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleStart = () => {
    startTransition(async () => {
      try {
        await onStartMeeting()
        window.location.reload()
      } catch (error) {
        console.error('Error starting meeting:', error)
        alert('Failed to start meeting. Check console for details.')
      }
    })
  }

  const handleComplete = () => {
    if (!notes.trim()) {
      alert('Please enter meeting notes before completing')
      return
    }

    startTransition(async () => {
      try {
        await onCompleteMeeting(notes)
        // Will redirect to summary
      } catch (error) {
        console.error('Error completing meeting:', error)
        alert('Failed to complete meeting. Check console for details.')
      }
    })
  }

  const isCompleted = meeting.status === 'completed'
  const isInProgress = meeting.status === 'in_progress'
  const isScheduled = meeting.status === 'scheduled'

  return (
    <div className="min-h-screen bg-warm-cream p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold text-earth-brown">Special Meeting</h1>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded">
              Special Consideration
            </span>
          </div>

          <div className="space-y-2 text-stone-gray">
            <p><strong>Date:</strong> {meetingDate}</p>
            <p><strong>Time:</strong> {meeting.scheduled_time}</p>
            <p><strong>Location:</strong> {meeting.location || 'TBD'}</p>
            {meeting.topic && <p><strong>Topic:</strong> {meeting.topic}</p>}
          </div>

          {meeting.message_to_members && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">{meeting.message_to_members}</p>
            </div>
          )}
        </div>

        {/* Status */}
        {isScheduled && !isScribe && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800">Waiting for the Scribe to start the meeting...</p>
          </div>
        )}

        {isScheduled && isScribe && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Ready to Start</h2>
            <p className="text-stone-gray mb-6">
              When you're ready, click the button below to start this special meeting.
              You'll be able to add notes during the meeting.
            </p>
            <button
              onClick={handleStart}
              disabled={isPending}
              className="w-full px-6 py-3 bg-burnt-orange text-white rounded-lg font-semibold hover:bg-deep-charcoal disabled:opacity-50"
            >
              {isPending ? 'Starting...' : 'Start Special Meeting'}
            </button>
          </div>
        )}

        {/* Notes Section */}
        {isInProgress && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Meeting Notes</h2>

            {isScribe ? (
              <>
                <p className="text-stone-gray mb-4">
                  Record what happened during this special meeting. These notes will be saved
                  with the meeting record.
                </p>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter meeting notes here..."
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange resize-none mb-4"
                />

                <button
                  onClick={handleComplete}
                  disabled={isPending || !notes.trim()}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? 'Completing...' : 'Complete Meeting & View Summary →'}
                </button>
              </>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-blue-800">The Scribe is recording notes for this meeting...</p>
              </div>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-green-800 mb-2">Meeting Completed</h2>
            <p className="text-green-700 mb-4">This special meeting has been completed.</p>
            <a
              href={`/meetings/${meeting.id}/summary`}
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            >
              View Summary
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
