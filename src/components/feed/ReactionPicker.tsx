"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { REACTIONS } from "@/lib/constants"

interface ReactionPickerProps {
  onSelect: (reactionId: number) => void
  selectedReactionId?: number | null
  className?: string
  align?: "left" | "center" | "right"
  onClose?: () => void
}

export function ReactionPicker({
  onSelect,
  selectedReactionId,
  className,
  align = "left",
  onClose,
}: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)

  // Fermer au clic extérieur si un callback onClose est fourni
  useEffect(() => {
    if (!onClose) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside, { passive: true })
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [onClose])

  return (
    <div
      ref={pickerRef}
      role="toolbar"
      aria-label="Sélectionner une réaction"
      className={cn(
        // Positionnement et boîte
        "absolute z-50 flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 bg-white rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.18)] border border-gray-100/90 max-w-[calc(100vw-1rem)]",
        // Animation légère et dynamique à l'apparition
        "animate-in fade-in zoom-in-95 duration-150 ease-out origin-bottom",
        // Alignement horizontal
        align === "left" && "left-0 sm:left-2",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "right" && "right-0 sm:right-2",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {REACTIONS.map((reaction, index) => {
        const isSelected = selectedReactionId === reaction.id
        return (
          <button
            key={reaction.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (typeof window !== "undefined" && "vibrate" in navigator) {
                try {
                  navigator.vibrate(10)
                } catch {
                  /* ignore */
                }
              }
              onSelect(reaction.id)
            }}
            className={cn(
              "group relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full",
              "text-[22px] sm:text-[25px] leading-none transition-all duration-150 select-none",
              "hover:scale-125 hover:-translate-y-1 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#A35A2A]",
              isSelected && "bg-amber-50 ring-2 ring-[#A35A2A]/40 scale-110"
            )}
            style={{ animationDelay: `${index * 20}ms` }}
            title={reaction.name}
            aria-label={reaction.name}
            aria-pressed={isSelected}
          >
            <span className="transform transition-transform group-hover:scale-110">
              {reaction.icon}
            </span>

            {/* Infobulle élégante au survol (desktop) */}
            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 whitespace-nowrap hidden sm:block">
              {reaction.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
