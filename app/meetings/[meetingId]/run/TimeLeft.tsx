'use client'

import { useState, useEffect } from 'react'

interface TimeLeftProps {
  endTime: Date
}

export function TimeLeft({ endTime }: TimeLeftProps) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function updateTimeLeft() {
      const now = new Date()
      const diffMs = endTime.getTime() - now.getTime()

      if (diffMs <= 0) {
        setTimeLeft('0:00')
        return
      }

      const totalMinutes = Math.floor(diffMs / 60000)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60

      if (hours > 0) {
        setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}`)
      } else {
        setTimeLeft(`${minutes}:00`)
      }
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [endTime])

  return <>{timeLeft}</>
}
