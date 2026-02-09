'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ChapterFlagActionsProps {
  chapterId: string
  isFlagged: boolean
  currentReason: string | null
}

export default function ChapterFlagActions({
  chapterId,
  isFlagged,
  currentReason,
}: ChapterFlagActionsProps) {
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason] = useState(currentReason || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFlag = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      setError('Please provide a reason')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/chapters/${chapterId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to flag chapter')
      }

      setShowForm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flag chapter')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearFlag = async () => {
    if (!confirm('Are you sure you want to clear this flag?')) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/chapters/${chapterId}/flag`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear flag')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear flag')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isFlagged) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-red-900 mb-1">🚩 Chapter Flagged for Attention</h3>
            <p className="text-red-800">{currentReason}</p>
          </div>
          <button
            onClick={handleClearFlag}
            disabled={isSubmitting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Clearing...' : 'Clear Flag'}
          </button>
        </div>
        {error && (
          <p className="text-red-700 text-sm mt-2">{error}</p>
        )}
      </div>
    )
  }

  if (showForm) {
    return (
      <form onSubmit={handleFlag} className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-earth-brown mb-3">Flag Chapter for Attention</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for flagging this chapter..."
          className="w-full px-3 py-2 border border-stone-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-burnt-orange"
          rows={3}
        />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-burnt-orange text-white rounded-lg hover:bg-deep-charcoal transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Flagging...' : 'Flag Chapter'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false)
              setReason('')
              setError(null)
            }}
            className="px-4 py-2 bg-stone-200 text-earth-brown rounded-lg hover:bg-stone-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setShowForm(true)}
        className="text-burnt-orange hover:underline text-sm"
      >
        🚩 Flag this chapter for attention
      </button>
    </div>
  )
}
