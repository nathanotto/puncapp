'use client'

import { useState, useEffect, useRef } from 'react'

interface TimerWidgetProps {
  currentPerson: {
    id: string
    name: string
  } | null
  allottedSeconds: number
  isScribe: boolean
  section: 'lightning_round' | 'full_checkins'
  onNext: (overtimeSeconds: number, priority?: number) => Promise<void>
  onSkip: () => Promise<void>
  onAddTime: (seconds: number) => void
  onStart: () => void
}

export function TimerWidget({
  currentPerson,
  allottedSeconds,
  isScribe,
  section,
  onNext,
  onSkip,
  onAddTime,
  onStart,
}: TimerWidgetProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(allottedSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [isSilenced, setSilenced] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null)
  const [hasPlayedWarning, setHasPlayedWarning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Timer countdown
  useEffect(() => {
    if (!isRunning || !currentPerson) return

    const interval = setInterval(() => {
      setRemainingSeconds(prev => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, currentPerson])

  // Warning sounds
  useEffect(() => {
    if (isSilenced || hasPlayedWarning) return

    if (section === 'lightning_round' && remainingSeconds === 15) {
      playSound('beep-beep')
      setHasPlayedWarning(true)
    } else if (section === 'full_checkins' && remainingSeconds === 60) {
      playSound('tinkle')
      setHasPlayedWarning(true)
    }
  }, [remainingSeconds, section, isSilenced, hasPlayedWarning])

  function playSound(type: 'beep-beep' | 'tinkle') {
    // TODO: Implement actual sound playing
    // For now, use Web Audio API or audio elements
    console.log(`[SOUND] ${type}`)

    if (audioRef.current) {
      audioRef.current.src = type === 'beep-beep'
        ? '/sounds/beep-beep.mp3'
        : '/sounds/tinkle.mp3'
      audioRef.current.play().catch(() => {})
    }
  }

  function handleStart() {
    setIsRunning(true)
    onStart()
  }

  function handleSilence() {
    setSilenced(true)
  }

  function handleAddTime(seconds: number) {
    setRemainingSeconds(prev => prev + seconds)
    setHasPlayedWarning(false) // Reset warning for new time
    onAddTime(seconds)
  }

  async function handleNext() {
    if (isProcessing) return

    setIsRunning(false)
    setIsProcessing(true)

    const overtime = Math.max(0, -remainingSeconds) // Positive if went over

    try {
      await onNext(overtime, selectedPriority ?? undefined)

      // Reset for next person
      setRemainingSeconds(allottedSeconds)
      setSelectedPriority(null)
      setHasPlayedWarning(false)
      setSilenced(false)
    } catch (error) {
      console.error('Error in handleNext:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleSkip() {
    if (isProcessing) return

    setIsRunning(false)
    setIsProcessing(true)

    try {
      await onSkip()

      // Reset
      setRemainingSeconds(allottedSeconds)
      setSelectedPriority(null)
      setHasPlayedWarning(false)
      setSilenced(false)
    } catch (error) {
      console.error('Error in handleSkip:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Format time as M:SS
  function formatTime(seconds: number): string {
    const absSeconds = Math.abs(seconds)
    const mins = Math.floor(absSeconds / 60)
    const secs = absSeconds % 60
    const sign = seconds < 0 ? '+' : ''
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Determine timer color
  function getTimerColor(): string {
    if (remainingSeconds < 0) return 'text-red-600' // Overtime
    if (remainingSeconds <= 15 && section === 'lightning_round') return 'text-orange-500'
    if (remainingSeconds <= 60 && section === 'full_checkins') return 'text-orange-500'
    return 'text-gray-900'
  }

  if (!currentPerson) {
    return (
      <div className="bg-gray-100 rounded-lg p-6 text-center">
        <p className="text-gray-500">No one is currently speaking</p>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
      {/* Hidden audio element for sounds */}
      <audio ref={audioRef} />

      {/* Current speaker */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500">Current</p>
        <p className="text-2xl font-bold">{currentPerson.name}</p>
      </div>

      {/* Timer display */}
      <div className="text-center mb-6">
        <p className={`text-6xl font-mono font-bold ${getTimerColor()}`}>
          {formatTime(remainingSeconds)}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Allotted: {formatTime(allottedSeconds)}
        </p>
        {remainingSeconds < 0 && (
          <p className="text-sm text-red-600 mt-1">
            Overtime: {formatTime(-remainingSeconds)}
          </p>
        )}
      </div>

      {/* Scribe controls */}
      {isScribe && (
        <>
          {/* Timer controls */}
          <div className="flex justify-center gap-3 mb-4">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                Start
              </button>
            ) : (
              <>
                <button
                  onClick={handleSilence}
                  disabled={isSilenced}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isSilenced
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {isSilenced ? 'Silenced' : 'Silence'}
                </button>
                <button
                  onClick={() => handleAddTime(30)}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200"
                >
                  +30 sec
                </button>
                <button
                  onClick={handleNext}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Next →'}
                </button>
              </>
            )}
          </div>

          {/* Priority selection (Lightning Round only) */}
          {section === 'lightning_round' && isRunning && (
            <div className="flex justify-center items-center gap-4 mb-4">
              <span className="text-sm text-gray-600">Priority:</span>
              <button
                onClick={() => setSelectedPriority(1)}
                className={`w-10 h-10 rounded-full font-bold ${
                  selectedPriority === 1
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                1
              </button>
              <button
                onClick={() => setSelectedPriority(2)}
                className={`w-10 h-10 rounded-full font-bold ${
                  selectedPriority === 2
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                2
              </button>
              <button
                onClick={handleSkip}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Skip'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
