'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CurriculumModule {
  id: string
  title: string
  principle: string
  description: string
  reflective_question: string
  exercise: string
  order_in_sequence: number
  sequence_id: string
  curriculum_sequences: {
    id: string
    title: string
    description: string | null
  }
}

interface CurriculumSelectionFormProps {
  meetingId: string
  modules: CurriculumModule[]
  completedModuleIds: Set<string>
  selectedModuleId: string | null
}

export default function CurriculumSelectionForm({
  meetingId,
  modules,
  completedModuleIds,
  selectedModuleId
}: CurriculumSelectionFormProps) {
  const [selectedId, setSelectedId] = useState<string | null>(selectedModuleId)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedId) {
      setError('Please select a curriculum module')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/meetings/select-curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          moduleId: selectedId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save selection')
      }

      // Success - redirect to dashboard
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selection')
      setIsSubmitting(false)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  // Group modules by sequence
  const modulesBySequence = modules.reduce((acc, module) => {
    const sequenceId = module.sequence_id
    if (!acc[sequenceId]) {
      acc[sequenceId] = {
        sequence: module.curriculum_sequences,
        modules: []
      }
    }
    acc[sequenceId].modules.push(module)
    return acc
  }, {} as Record<string, { sequence: CurriculumModule['curriculum_sequences'], modules: CurriculumModule[] }>)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Sequences and Modules */}
      {Object.values(modulesBySequence).map(({ sequence, modules: seqModules }) => (
        <div key={sequence.id} className="bg-white rounded-lg p-6">
          <h3 className="text-lg font-bold text-earth-brown mb-2">{sequence.title}</h3>
          {sequence.description && (
            <p className="text-sm text-stone-gray mb-4">{sequence.description}</p>
          )}

          <div className="space-y-3">
            {seqModules.map((module) => {
              const isCompleted = completedModuleIds.has(module.id)
              const isSelected = selectedId === module.id
              const isExpanded = expandedId === module.id

              return (
                <div
                  key={module.id}
                  className={`border-2 rounded-lg transition-all ${
                    isSelected
                      ? 'border-burnt-orange bg-orange-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Radio Button */}
                      <input
                        type="radio"
                        id={module.id}
                        name="curriculum"
                        value={module.id}
                        checked={isSelected}
                        onChange={(e) => setSelectedId(e.target.value)}
                        className="mt-1 w-4 h-4 text-burnt-orange focus:ring-burnt-orange"
                      />

                      {/* Module Info */}
                      <div className="flex-1">
                        <label
                          htmlFor={module.id}
                          className="block cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <h4 className="font-semibold text-earth-brown">
                              {module.title}
                            </h4>
                            {isCompleted && (
                              <span className="text-xs bg-stone-200 text-stone-700 px-2 py-1 rounded">
                                Previously completed
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-burnt-orange font-medium mb-2">
                            {module.principle}
                          </p>
                          <p className="text-sm text-stone-gray">
                            {module.description}
                          </p>
                        </label>

                        {/* Expand/Collapse Button */}
                        <button
                          type="button"
                          onClick={() => toggleExpanded(module.id)}
                          className="mt-2 text-sm text-burnt-orange hover:underline"
                        >
                          {isExpanded ? 'Hide details' : 'Show details'}
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-stone-200 space-y-3">
                            <div>
                              <h5 className="text-sm font-semibold text-earth-brown mb-1">
                                Reflective Question
                              </h5>
                              <p className="text-sm text-stone-gray italic">
                                "{module.reflective_question}"
                              </p>
                            </div>
                            <div>
                              <h5 className="text-sm font-semibold text-earth-brown mb-1">
                                Group Exercise
                              </h5>
                              <p className="text-sm text-stone-gray">
                                {module.exercise}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !selectedId}
          className="px-6 py-3 bg-burnt-orange text-warm-cream font-semibold rounded-lg hover:bg-deep-charcoal transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : selectedModuleId ? 'Update Selection' : 'Confirm Selection'}
        </button>
      </div>
    </form>
  )
}
