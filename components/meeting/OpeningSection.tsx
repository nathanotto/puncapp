'use client'

import { useState, useTransition } from 'react'
import { PUNC_ETHOS } from '@/lib/constants/ethos'

interface OpeningSectionProps {
  isScribe: boolean
  currentSection: string
  onMeditationComplete: () => Promise<void>
  onEthosComplete: () => Promise<void>
}

export function OpeningSection({
  isScribe,
  currentSection,
  onMeditationComplete,
  onEthosComplete,
}: OpeningSectionProps) {
  const [showEthos, setShowEthos] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Meditation is complete when we've moved past opening_meditation
  const meditationComplete = !['not_started', 'opening_meditation'].includes(currentSection)
  // Ethos is complete when we've moved past opening_ethos
  const ethosComplete = !['not_started', 'opening_meditation', 'opening_ethos'].includes(currentSection)

  const handleMeditationComplete = () => {
    startTransition(async () => {
      try {
        await onMeditationComplete()
      } catch (error) {
        console.error('Error completing meditation:', error)
        alert('Failed to advance section. Check console for details.')
      }
    })
  }

  const handleEthosComplete = () => {
    startTransition(async () => {
      try {
        await onEthosComplete()
      } catch (error) {
        console.error('Error completing ethos:', error)
        alert('Failed to advance section. Check console for details.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Meditation */}
      <div className={`p-4 rounded-lg border-2 ${
        meditationComplete ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              meditationComplete ? 'border-green-500 bg-green-500' : 'border-gray-300'
            }`}>
              {meditationComplete && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="font-medium">Meditation</h3>
              <p className="text-sm text-gray-500">Leader guides the group in meditation</p>
            </div>
          </div>

          {isScribe && !meditationComplete && (
            <button
              onClick={handleMeditationComplete}
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Completing...' : 'Complete →'}
            </button>
          )}
        </div>
      </div>

      {/* Ethos */}
      <div className={`p-4 rounded-lg border-2 ${
        ethosComplete ? 'border-green-300 bg-green-50' :
        meditationComplete ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              ethosComplete ? 'border-green-500 bg-green-500' : 'border-gray-300'
            }`}>
              {ethosComplete && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="font-medium">Ethos Reading</h3>
              <p className="text-sm text-gray-500">Read the PUNC Ethos together</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEthos(!showEthos)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              {showEthos ? 'Hide Ethos' : 'Show Ethos'}
            </button>

            {isScribe && meditationComplete && !ethosComplete && (
              <button
                onClick={handleEthosComplete}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? 'Completing...' : 'Complete →'}
              </button>
            )}
          </div>
        </div>

        {/* Ethos text (expandable) */}
        {showEthos && (
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <pre className="whitespace-pre-wrap font-serif text-gray-800">
              {PUNC_ETHOS}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
