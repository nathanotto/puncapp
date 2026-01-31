'use client'

import { useState } from 'react'
import { completeCommitmentWithComment } from '@/lib/commitments/actions'
import Button from '@/components/ui/Button'

interface CompleteCommitmentFormProps {
  commitmentId: string
}

export default function CompleteCommitmentForm({ commitmentId }: CompleteCommitmentFormProps) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await completeCommitmentWithComment(commitmentId, comment)

    setLoading(false)

    if (!result.success) {
      setError(result.error || 'Failed to complete commitment')
      return
    }

    // Success - form will disappear on revalidation
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
      <div>
        <label htmlFor={`comment-${commitmentId}`} className="block text-sm font-medium text-earth-brown mb-1">
          Comments
        </label>
        <textarea
          id={`comment-${commitmentId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How did it go?"
          rows={3}
          className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-earth-brown text-sm"
        />
      </div>

      {error && (
        <div className="text-sm text-burnt-orange">{error}</div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="small"
        disabled={loading}
      >
        {loading ? 'Completing...' : 'Complete'}
      </Button>
    </form>
  )
}
