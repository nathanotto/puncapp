'use client'

import { useState, useTransition } from 'react'
import { rescheduleMeeting } from '@/app/actions/meeting-actions'

interface RescheduleMeetingButtonProps {
  meetingId: string
  meetingName: string
  currentDate: string
  currentTime: string
}

export function RescheduleMeetingButton({
  meetingId,
  meetingName,
  currentDate,
  currentTime
}: RescheduleMeetingButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [showDialog, setShowDialog] = useState(false)
  const [newDate, setNewDate] = useState(currentDate)
  const [newTime, setNewTime] = useState(currentTime)

  const handleReschedule = () => {
    if (!newDate || !newTime) {
      alert('Please select both date and time')
      return
    }

    startTransition(async () => {
      try {
        await rescheduleMeeting(meetingId, newDate, newTime)
        setShowDialog(false)
        alert('Meeting rescheduled successfully! All RSVPs have been cleared and notifications sent.')
      } catch (error) {
        console.error('Error rescheduling meeting:', error)
        alert(error instanceof Error ? error.message : 'Failed to reschedule meeting. Please try again.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDialog(true)}
        className="bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        Reschedule
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-earth-brown mb-4">
              Reschedule {meetingName}
            </h3>
            <p className="text-sm text-stone-gray mb-4">
              All RSVPs will be deleted and members will be notified of the new time.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-earth-brown mb-2">
                  New Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-earth-brown mb-2">
                  New Time
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-gray-200 text-earth-brown rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReschedule}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Rescheduling...' : 'Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
