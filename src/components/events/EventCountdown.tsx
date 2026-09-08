"use client"

import { useState, useEffect } from "react"

interface EventCountdownProps {
  startDate?: string
  startTime?: string
  isPassed?: boolean
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  isOver: boolean
}

function parseTargetDate(startDate?: string, startTime?: string): Date | null {
  if (!startDate) return null
  // Format possible : YYYY-MM-DD ou DD/MM/YYYY
  try {
    const timeStr = startTime || "00:00:00"
    if (startDate.includes("-")) {
      // YYYY-MM-DD
      return new Date(`${startDate}T${timeStr}`)
    } else if (startDate.includes("/")) {
      // DD/MM/YYYY
      const [d, m, y] = startDate.split("/")
      return new Date(`${y}-${m}-${d}T${timeStr}`)
    }
    return new Date(`${startDate} ${timeStr}`)
  } catch {
    return null
  }
}

export default function EventCountdown({
  startDate,
  startTime,
  isPassed = false,
}: EventCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOver: isPassed,
  })

  useEffect(() => {
    const target = parseTargetDate(startDate, startTime)
    if (!target || isNaN(target.getTime())) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: isPassed })
      return
    }

    const calculate = () => {
      const now = new Date().getTime()
      const diff = target.getTime() - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, isOver: false })
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [startDate, startTime, isPassed])

  const pad = (n: number) => String(n).padStart(2, "0")

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">
        <span className="inline-block w-2 h-2 rounded-full bg-[#8B5E34] animate-pulse" />
        <span>{timeLeft.isOver ? "Statut :" : "Début dans :"}</span>
      </div>

      {timeLeft.isOver ? (
        <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400">
          Événement en cours ou passé
        </span>
      ) : (
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Jours */}
          <div className="flex flex-col items-center justify-center min-w-[46px] sm:min-w-[52px] h-12 sm:h-14 px-2 rounded-xl bg-gray-100 dark:bg-zinc-800/90 border border-gray-200/60 dark:border-zinc-700/60 shadow-2xs">
            <span className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 leading-none">
              {pad(timeLeft.days)}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase">
              Jours
            </span>
          </div>

          <span className="text-gray-400 font-bold">:</span>

          {/* Heures */}
          <div className="flex flex-col items-center justify-center min-w-[46px] sm:min-w-[52px] h-12 sm:h-14 px-2 rounded-xl bg-gray-100 dark:bg-zinc-800/90 border border-gray-200/60 dark:border-zinc-700/60 shadow-2xs">
            <span className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 leading-none">
              {pad(timeLeft.hours)}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase">
              Heures
            </span>
          </div>

          <span className="text-gray-400 font-bold">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center justify-center min-w-[46px] sm:min-w-[52px] h-12 sm:h-14 px-2 rounded-xl bg-gray-100 dark:bg-zinc-800/90 border border-gray-200/60 dark:border-zinc-700/60 shadow-2xs">
            <span className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 leading-none">
              {pad(timeLeft.minutes)}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase">
              Min
            </span>
          </div>

          <span className="text-gray-400 font-bold">:</span>

          {/* Secondes */}
          <div className="flex flex-col items-center justify-center min-w-[46px] sm:min-w-[52px] h-12 sm:h-14 px-2 rounded-xl bg-gray-100 dark:bg-zinc-800/90 border border-gray-200/60 dark:border-zinc-700/60 shadow-2xs">
            <span className="text-base sm:text-lg font-black text-[#8B5E34] leading-none">
              {pad(timeLeft.seconds)}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase">
              Sec
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
