'use client'

import { useState, useTransition } from 'react'

interface CurriculumModule {
  id: string
  title: string
  principle: string
  description: string
  reflective_question: string
  exercise: string
  assignment_text?: string
  assignment_due_days: number
}

interface CurriculumResponse {
  user_id: string
  response: string
  user?: {
    full_name: string
  }
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
  meetingId: string
  meetingDate: string
  onSubmitResponse: (response: string) => Promise<void>
  onAcceptAssignment?: (dueDate: string) => Promise<void>
  onComplete: () => Promise<void>
}

const MAX_RESPONSE_LENGTH = 1500
const NOT_RESPONDING_TEXT = "I'm not choosing to respond to this question."

export function CurriculumSection({
  module,
  attendees,
  responses,
  currentUserId,
  isScribe,
  meetingId,
  meetingDate,
  onSubmitResponse,
  onAcceptAssignment,
  onComplete,
}: CurriculumSectionProps) {
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showAssignment, setShowAssignment] = useState(false)
  const [assignmentAccepted, setAssignmentAccepted] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [acceptingAssignment, setAcceptingAssignment] = useState(false)

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

  // Calculate default due date for assignment
  const defaultDueDate = module?.assignment_due_days
    ? new Date(new Date(meetingDate).getTime() + module.assignment_due_days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    : '';

  // Set default due date when component mounts
  if (!dueDate && defaultDueDate) {
    setDueDate(defaultDueDate);
  }

  const currentUserResponse = responses.find(r => r.user_id === currentUserId)
  const hasSubmitted = !!currentUserResponse
  const allHaveResponded = attendees.every(a => responses.some(r => r.user_id === a.user_id))
  const hasAssignment = !!(module?.assignment_text)

  // Show assignment UI after response is submitted and hasn't been accepted yet
  const shouldShowAssignment = hasSubmitted && hasAssignment && !assignmentAccepted

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

  const handleNotResponding = async () => {
    if (!confirm('Are you sure you don\'t want to respond to this question?')) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmitResponse(NOT_RESPONDING_TEXT)
      setResponseText('')
    } catch (error) {
      console.error('Error submitting response:', error)
      alert('Failed to submit response. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAcceptAssignment = async () => {
    if (!dueDate) {
      alert('Please select a due date')
      return
    }

    setAcceptingAssignment(true)
    try {
      if (onAcceptAssignment) {
        await onAcceptAssignment(dueDate)
      }
      setAssignmentAccepted(true)
      setShowAssignment(false)
    } catch (error) {
      console.error('Error accepting assignment:', error)
      alert('Failed to accept assignment. Please try again.')
    } finally {
      setAcceptingAssignment(false)
    }
  }

  const handlePassAssignment = () => {
    setShowAssignment(false)
    setAssignmentAccepted(true) // Mark as handled so it doesn't show again
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
        <p className="text-lg text-burnt-orange font-semibold italic mb-4">"{module.principle}"</p>
        <p className="text-stone-gray mb-6">{module.description}</p>

        <div className="border-t border-stone-200 pt-4 mb-4">
          <h3 className="font-semibold text-earth-brown mb-2">Reflective Question</h3>
          <p className="text-stone-gray italic bg-blue-50 p-3 rounded">"{module.reflective_question}"</p>
        </div>

        <div className="border-t border-stone-200 pt-4 mb-4">
          <h3 className="font-semibold text-earth-brown mb-2">Group Exercise</h3>
          <p className="text-stone-gray">{module.exercise}</p>
        </div>

        {module.assignment_text && (
          <div className="border-t border-stone-200 pt-4">
            <h3 className="font-semibold text-earth-brown mb-2">📝 Assignment (Optional)</h3>
            <p className="text-stone-gray bg-amber-50 p-3 rounded">{module.assignment_text}</p>
            <p className="text-xs text-gray-500 mt-2">
              Default due: {module.assignment_due_days} days after meeting
            </p>
          </div>
        )}
      </div>

      {/* Response Form or Status */}
      {!hasSubmitted ? (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="font-semibold text-earth-brown mb-3">Your Response</h3>
          <p className="text-sm text-stone-gray mb-4">
            Reflect on the question above and share your thoughts with the group.
          </p>

          <form onSubmit={handleSubmit}>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Enter your reflection... (required)"
              maxLength={MAX_RESPONSE_LENGTH}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange resize-none"
            />

            <div className="flex justify-between items-center mt-3">
              <div className="flex gap-2 items-center">
                <p className="text-sm text-stone-gray">
                  {responseText.length} / {MAX_RESPONSE_LENGTH} characters
                </p>
                <button
                  type="button"
                  onClick={handleNotResponding}
                  disabled={isSubmitting}
                  className="text-sm text-gray-600 hover:text-gray-800 underline disabled:opacity-50"
                >
                  Not choosing to respond
                </button>
              </div>
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
      ) : (
        <>
          {/* All Responses */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <h3 className="font-semibold text-earth-brown mb-4">Group Responses</h3>
            <div className="space-y-3">
              {responses.map((resp) => {
                const attendee = attendees.find(a => a.user_id === resp.user_id)
                const isCurrentUser = resp.user_id === currentUserId
                return (
                  <div
                    key={resp.user_id}
                    className={`p-3 rounded ${isCurrentUser ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
                  >
                    <p className="font-medium text-sm mb-1 flex items-center gap-2">
                      {attendee?.name || resp.user?.full_name || 'Unknown'}
                      {isCurrentUser && (
                        <span className="text-xs text-green-700">(You)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{resp.response}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Assignment Acceptance UI */}
          {shouldShowAssignment && !showAssignment && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-6">
              <h3 className="font-semibold text-amber-900 mb-2">📝 Optional Assignment Available</h3>
              <p className="text-sm text-amber-800 mb-4">
                This module has an optional assignment. Would you like to commit to completing it?
              </p>
              <button
                onClick={() => setShowAssignment(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700"
              >
                View Assignment
              </button>
            </div>
          )}

          {showAssignment && hasAssignment && (
            <div className="bg-white border-2 border-amber-300 rounded-lg p-6">
              <h3 className="font-semibold text-earth-brown mb-3">Accept Assignment</h3>
              <div className="bg-amber-50 p-4 rounded mb-4">
                <p className="text-sm text-gray-700 font-medium mb-2">Assignment:</p>
                <p className="text-sm text-gray-700">{module.assignment_text}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: {module.assignment_due_days} days from meeting date
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAcceptAssignment}
                  disabled={acceptingAssignment || !dueDate}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
                >
                  {acceptingAssignment ? 'Accepting...' : 'Accept Assignment'}
                </button>
                <button
                  onClick={handlePassAssignment}
                  disabled={acceptingAssignment}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Pass
                </button>
              </div>
            </div>
          )}
        </>
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
