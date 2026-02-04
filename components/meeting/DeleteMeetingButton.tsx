'use client'

import { useState, useTransition } from 'react'
import { deleteMeeting } from '@/app/actions/meeting-actions'

interface DeleteMeetingButtonProps {
  meetingId: string
  meetingName: string
}

export function DeleteMeetingButton({ meetingId, meetingName }: DeleteMeetingButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete the ${meetingName} meeting? This action cannot be undone.`)) {
      return
    }

    startTransition(async () => {
      try {
        await deleteMeeting(meetingId)
      } catch (error) {
        console.error('Error deleting meeting:', error)
        alert('Failed to delete meeting. Please try again.')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  )
}
