'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Attendee {
  user_id: string
  name: string
  username: string
}

interface Feedback {
  user_id: string
  value_rating: number | null
  most_value_user_id: string | null
  skipped_rating: boolean
  skipped_most_value: boolean
}

interface ClosingSectionProps {
  meetingId: string
  attendees: Attendee[]
  feedback: Feedback[]
  audioRecording: { storage_path: string; recorded_by: string } | null
  currentUserId: string
  isScribe: boolean
  onSubmitFeedback: (rating: number | null, mostValueUserId: string | null, skipRating: boolean, skipMostValue: boolean) => Promise<void>
  onSaveAudioMetadata: (storagePath: string) => Promise<void>
  onCompleteMeeting: () => Promise<void>
}

export function ClosingSection({
  meetingId,
  attendees,
  feedback,
  audioRecording,
  currentUserId,
  isScribe,
  onSubmitFeedback,
  onSaveAudioMetadata,
  onCompleteMeeting,
}: ClosingSectionProps) {
  const supabase = createClient()
  const [rating, setRating] = useState<number | null>(null)
  const [skipRating, setSkipRating] = useState(false)
  const [mostValueUserId, setMostValueUserId] = useState<string | null>(null)
  const [skipMostValue, setSkipMostValue] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)
  const [isPending, startTransition] = useTransition()

  const currentUserFeedback = feedback.find(f => f.user_id === currentUserId)
  const hasSubmittedFeedback = !!currentUserFeedback
  const allHaveSubmittedFeedback = attendees.every(a => feedback.some(f => f.user_id === a.user_id))

  // Filter out current user from "most value" options
  const otherAttendees = attendees.filter(a => a.user_id !== currentUserId)

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!skipRating && !rating) {
      alert('Please select a rating or choose "No response"')
      return
    }

    if (!skipMostValue && !mostValueUserId) {
      alert('Please select which man provided the most value or choose "No response"')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmitFeedback(rating, mostValueUserId, skipRating, skipMostValue)
      // Reset form
      setRating(null)
      setSkipRating(false)
      setMostValueUserId(null)
      setSkipMostValue(false)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAudioUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!audioFile) {
      alert('Please select an audio file')
      return
    }

    setIsUploadingAudio(true)
    try {
      // Upload file directly to Supabase storage (client-side, no 1MB limit)
      const fileName = `${meetingId}_${Date.now()}.${audioFile.name.split('.').pop()}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(fileName, audioFile)

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Save metadata to database via server action
      await onSaveAudioMetadata(uploadData.path)

      setAudioFile(null)
      alert('Audio uploaded successfully!')
    } catch (error) {
      console.error('Error uploading audio:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload audio. Please try again.')
    } finally {
      setIsUploadingAudio(false)
    }
  }

  const handleCompleteMeeting = () => {
    startTransition(async () => {
      try {
        await onCompleteMeeting()
        // Redirect is handled by the server action
      } catch (error: any) {
        // Next.js redirect() throws a NEXT_REDIRECT error - this is expected, don't show alert
        if (error?.digest?.startsWith('NEXT_REDIRECT')) {
          return
        }
        console.error('Error completing meeting:', error)
        alert('Failed to complete meeting. Check console for details.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-2">Closing</h2>
        <p className="text-blue-800">
          Thank you for your presence today. Please take a moment to provide feedback on the meeting.
        </p>
      </div>

      {/* Feedback Form or Status */}
      {hasSubmittedFeedback ? (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-green-500 bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">Feedback Submitted</h3>
              {!currentUserFeedback.skipped_rating && currentUserFeedback.value_rating && (
                <p className="text-sm text-green-800">Rating: {currentUserFeedback.value_rating}/10</p>
              )}
              {currentUserFeedback.skipped_rating && (
                <p className="text-sm text-green-700 italic">Rating: No response</p>
              )}
              {!currentUserFeedback.skipped_most_value && currentUserFeedback.most_value_user_id && (
                <p className="text-sm text-green-800">
                  Most value from: {attendees.find(a => a.user_id === currentUserFeedback.most_value_user_id)?.name}
                </p>
              )}
              {currentUserFeedback.skipped_most_value && (
                <p className="text-sm text-green-700 italic">Most value: No response</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitFeedback} className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="font-semibold text-earth-brown mb-4">Your Feedback</h3>

          {/* Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-earth-brown mb-2">
              How much value did you get from this meeting? (1-10)
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setRating(num)
                    setSkipRating(false)
                  }}
                  disabled={skipRating}
                  className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                    rating === num
                      ? 'bg-burnt-orange text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${skipRating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {num}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-gray">
              <input
                type="checkbox"
                checked={skipRating}
                onChange={(e) => {
                  setSkipRating(e.target.checked)
                  if (e.target.checked) setRating(null)
                }}
                className="w-4 h-4"
              />
              No response
            </label>
          </div>

          {/* Most Value */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-earth-brown mb-2">
              Which man caused the most value for you today?
            </label>
            <select
              value={mostValueUserId || ''}
              onChange={(e) => {
                setMostValueUserId(e.target.value || null)
                setSkipMostValue(false)
              }}
              disabled={skipMostValue}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange disabled:opacity-50"
            >
              <option value="">Select a member...</option>
              {otherAttendees.map((attendee) => (
                <option key={attendee.user_id} value={attendee.user_id}>
                  {attendee.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-stone-gray mt-2">
              <input
                type="checkbox"
                checked={skipMostValue}
                onChange={(e) => {
                  setSkipMostValue(e.target.checked)
                  if (e.target.checked) setMostValueUserId(null)
                }}
                className="w-4 h-4"
              />
              No response
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      )}

      {/* Feedback Status */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-earth-brown mb-3">Feedback Status</h3>
        <div className="space-y-2">
          {attendees.map(attendee => {
            const hasSubmitted = feedback.some(f => f.user_id === attendee.user_id)
            return (
              <div key={attendee.user_id} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  hasSubmitted ? 'border-green-500 bg-green-500' : 'border-gray-300'
                }`}>
                  {hasSubmitted && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={hasSubmitted ? 'text-green-700 font-medium' : 'text-stone-gray'}>
                  {attendee.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Audio Recording (Scribe only) */}
      {isScribe && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="font-semibold text-earth-brown mb-4">Audio Recording (Optional)</h3>

          {audioRecording ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium mb-2">✓ Audio recording uploaded</p>
              <p className="text-sm text-green-700">File: {audioRecording.storage_path.split('/').pop()}</p>
            </div>
          ) : (
            <form onSubmit={handleAudioUpload}>
              <div className="mb-4">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-stone-gray
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-burnt-orange file:text-white
                    hover:file:bg-deep-charcoal"
                />
              </div>
              <button
                type="submit"
                disabled={!audioFile || isUploadingAudio}
                className="px-6 py-2 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal disabled:bg-stone-300 disabled:cursor-not-allowed"
              >
                {isUploadingAudio ? 'Uploading...' : 'Upload Recording'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Complete Meeting (Scribe only) */}
      {isScribe && allHaveSubmittedFeedback && (
        <div className="bg-white rounded-lg border-2 border-blue-200 p-6">
          <button
            onClick={handleCompleteMeeting}
            disabled={isPending}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Completing Meeting...' : 'Complete Meeting & View Summary →'}
          </button>
        </div>
      )}

      {isScribe && !allHaveSubmittedFeedback && (
        <p className="text-sm text-stone-gray italic text-center">
          Waiting for all members to submit feedback...
        </p>
      )}
    </div>
  )
}
