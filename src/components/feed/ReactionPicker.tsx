"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ReactionPickerProps {
  onSelect: (reactionId: number) => void
  selectedReactionId?: number | null
  className?: string
  align?: "left" | "center" | "right"
  onClose?: () => void
}

/**
 * Réactions statiques mappées aux images locales /public/images/.
 * Les IDs correspondent exactement à ceux de l'API Dughu (/reactions).
 */
const REACTION_ITEMS = [
  { id: 1,  name: "J'aime",     img: "/images/like.png" },
  { id: 2,  name: "J'adore",    img: "/images/love.png" },
  { id: 11, name: "Haha",       img: "/images/happy.png" },
  { id: 5,  name: "Triste",     img: "/images/triste.png" },
  { id: 6,  name: "Colère",     img: "/images/colere.png" },
  { id: 12, name: "Silence",    img: "/images/silence.png" },
  { id: 13, name: "Réflexion",  img: "/images/reflexion.png" },
  { id: 14, name: "Fade",       img: "/images/fade.png" },
  { id: 15, name: "Étonné",     img: "/images/etonne.png" },
] as const

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
        // Animation légère à l'apparition
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
      {REACTION_ITEMS.map((reaction, index) => {
        const isSelected = selectedReactionId === reaction.id
        return (
          <button
            key={reaction.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (typeof window !== "undefined" && "vibrate" in navigator) {
                try { navigator.vibrate(10) } catch { /* ignore */ }
              }
              onSelect(reaction.id)
            }}
            className={cn(
              "group relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full",
              "transition-all duration-150 select-none",
              "hover:scale-125 hover:-translate-y-1 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#A35A2A]",
              isSelected && "bg-amber-50 ring-2 ring-[#A35A2A]/40 scale-110"
            )}
            style={{ animationDelay: `${index * 20}ms` }}
            title={reaction.name}
            aria-label={reaction.name}
            aria-pressed={isSelected}
          >
            <img
              src={reaction.img}
              alt={reaction.name}
              width={32}
              height={32}
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain transform transition-transform group-hover:scale-110"
            />

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
