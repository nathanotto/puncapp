'use client'

import { useState, useTransition } from 'react'

interface CurriculumModule {
  id: string
  title: string
  principle: string
  description: string
  reflective_question: string
  exercise: string
}

interface CurriculumResponse {
  user_id: string
  response: string
}

interface Attendee {
  user_id: string
  name: string
  username: string
}

interface CurriculumSectionProps {
  module: CurriculumModule | null
  attendees: Attendee[]
  responses: CurriculumResponse[]
  currentUserId: string
  isScribe: boolean
  onSubmitResponse: (response: string) => Promise<void>
  onComplete: () => Promise<void>
}

const MAX_RESPONSE_LENGTH = 1500

export function CurriculumSection({
  module,
  attendees,
  responses,
  currentUserId,
  isScribe,
  onSubmitResponse,
  onComplete,
}: CurriculumSectionProps) {
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!module) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
        <p className="text-orange-800 font-medium">
          No curriculum module selected for this meeting.
        </p>
        {isScribe && (
          <button
            onClick={() => startTransition(async () => {
              try {
                await onComplete()
              } catch (error) {
                console.error('Error advancing section:', error)
                alert('Failed to advance section. Check console for details.')
              }
            })}
            disabled={isPending}
            className="mt-4 px-4 py-2 bg-burnt-orange text-white rounded-lg font-medium hover:bg-deep-charcoal disabled:opacity-50"
          >
            {isPending ? 'Advancing...' : 'Skip to Closing →'}
          </button>
        )}
      </div>
    )
  }

  console.log('CurriculumSection - responses:', responses)
  console.log('CurriculumSection - attendees:', attendees)
  console.log('CurriculumSection - currentUserId:', currentUserId)

  const currentUserResponse = responses.find(r => r.user_id === currentUserId)
  const hasSubmitted = !!currentUserResponse
  const allHaveResponded = attendees.every(a => responses.some(r => r.user_id === a.user_id))

  console.log('CurriculumSection - hasSubmitted:', hasSubmitted)
  console.log('CurriculumSection - allHaveResponded:', allHaveResponded)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!responseText.trim()) {
      alert('Please enter a response')
      return
    }

    if (responseText.length > MAX_RESPONSE_LENGTH) {
      alert(`Response must be ${MAX_RESPONSE_LENGTH} characters or less`)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmitResponse(responseText)
      // Clear the form after successful submission
      setResponseText('')
    } catch (error) {
      console.error('Error submitting response:', error)
      alert('Failed to submit response. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = () => {
    startTransition(async () => {
      try {
        await onComplete()
      } catch (error) {
        console.error('Error completing curriculum:', error)
        alert('Failed to advance section. Check console for details.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Module Content */}
      <div className="bg-white rounded-lg border-2 border-burnt-orange p-6">
        <h2 className="text-2xl font-bold text-earth-brown mb-2">{module.title}</h2>
        <p className="text-lg text-burnt-orange font-semibold mb-4">{module.principle}</p>
        <p className="text-stone-gray mb-6">{module.description}</p>

        <div className="border-t border-stone-200 pt-4 mb-4">
          <h3 className="font-semibold text-earth-brown mb-2">Reflective Question</h3>
          <p className="text-stone-gray italic">"{module.reflective_question}"</p>
        </div>

        <div className="border-t border-stone-200 pt-4">
          <h3 className="font-semibold text-earth-brown mb-2">Group Exercise</h3>
          <p className="text-stone-gray">{module.exercise}</p>
        </div>
      </div>

      {/* Response Form or Status */}
      {hasSubmitted ? (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-green-500 bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">Your Response Submitted</h3>
              <p className="text-sm text-green-800 whitespace-pre-wrap">{currentUserResponse.response}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="font-semibold text-earth-brown mb-3">Your Response</h3>
          <p className="text-sm text-stone-gray mb-4">
            Reflect on the question above and share your thoughts with the group.
          </p>

          <form onSubmit={handleSubmit}>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Type your response here..."
              maxLength={MAX_RESPONSE_LENGTH}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange resize-none"
            />

            <div className="flex justify-between items-center mt-3">
              <p className="text-sm text-stone-gray">
                {responseText.length} / {MAX_RESPONSE_LENGTH} characters
              </p>
              <button
                type="submit"
                disabled={isSubmitting || !responseText.trim()}
                className="px-6 py-2 bg-burnt-orange text-white font-semibold rounded-lg hover:bg-deep-charcoal disabled:bg-stone-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Response Status */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-earth-brown mb-3">Response Status</h3>
        <div className="space-y-2">
          {attendees.map(attendee => {
            const hasResponded = responses.some(r => r.user_id === attendee.user_id)
            return (
              <div key={attendee.user_id} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  hasResponded ? 'border-green-500 bg-green-500' : 'border-gray-300'
                }`}>
                  {hasResponded && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={hasResponded ? 'text-green-700 font-medium' : 'text-stone-gray'}>
                  {attendee.name}
                </span>
              </div>
            )
          })}
        </div>

        {isScribe && allHaveResponded && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleComplete}
              disabled={isPending}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Advancing...' : 'Complete Curriculum →'}
            </button>
          </div>
        )}

        {isScribe && !allHaveResponded && (
          <p className="mt-4 text-sm text-stone-gray italic">
            Waiting for all members to submit their responses...
          </p>
        )}
      </div>
    </div>
  )
}
