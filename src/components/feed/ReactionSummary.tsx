"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { REACTIONS, REACTION_TYPE_TO_ID, REACTION_ID_TO_TYPE } from "@/lib/constants"

export interface ReactionSummaryItem {
  type: string
  count: number
}

interface ReactionSummaryProps {
  reactions?: ReactionSummaryItem[]
  likesCount: number
  fallbackReactionId?: number | null
  onClick?: () => void
  size?: "sm" | "md"
  className?: string
}

export function ReactionSummary({
  reactions,
  likesCount,
  fallbackReactionId,
  onClick,
  size = "md",
  className,
}: ReactionSummaryProps) {
  const { icons, tooltipText } = useMemo(() => {
    if (!likesCount || likesCount <= 0) return { icons: [], tooltipText: "" }

    let topTypes: { type: string; count: number }[] = []

    if (reactions && reactions.length > 0) {
      topTypes = [...reactions]
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count)
    }

    const myType = fallbackReactionId
      ? REACTION_ID_TO_TYPE[fallbackReactionId] || "like"
      : null

    // Si l'utilisateur connecté a réagi et que sa réaction n'est pas encore dans topTypes
    if (myType) {
      const found = topTypes.find((t) => t.type === myType)
      if (!found) {
        topTypes.unshift({ type: myType, count: 1 })
      }
    }

    // Si aucune réaction détaillée n'existe mais que likesCount > 0
    if (topTypes.length === 0) {
      topTypes = [{ type: "like", count: likesCount }]
    }

    // Max 3 réactions les plus fréquentes
    const displayedTypes = topTypes.slice(0, 3)

    const mappedIcons = displayedTypes
      .map((item) => {
        const id = REACTION_TYPE_TO_ID[item.type]
        return REACTIONS.find((r) => r.id === id)?.icon || "👍"
      })
      .filter(Boolean)

    const tooltip = topTypes
      .map((item) => {
        const id = REACTION_TYPE_TO_ID[item.type]
        const def = REACTIONS.find((r) => r.id === id)
        return `${def?.icon || "👍"} ${item.count}`
      })
      .join(" • ")

    return { icons: mappedIcons, tooltipText: tooltip }
  }, [reactions, likesCount, fallbackReactionId])

  if (!likesCount || likesCount <= 0 || icons.length === 0) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 hover:underline cursor-pointer group select-none transition",
        className
      )}
      title={tooltipText || "Voir les personnes qui ont réagi"}
      aria-label={`${likesCount} réaction${likesCount > 1 ? "s" : ""}`}
    >
      <div className="flex items-center -space-x-1.5">
        {icons.map((icon, index) => (
          <span
            key={`${icon}-${index}`}
            className={cn(
              "rounded-full bg-white ring-2 ring-white shadow-xs flex items-center justify-center leading-none group-hover:scale-110 transition-transform",
              size === "sm" ? "w-[18px] h-[18px] text-[11px]" : "w-[22px] h-[22px] text-[14px]"
            )}
            style={{ zIndex: icons.length - index }}
          >
            {icon}
          </span>
        ))}
      </div>

      <span
        className={cn(
          "font-semibold text-[#050505]",
          size === "sm" ? "text-xs" : "text-sm"
        )}
      >
        {likesCount}
      </span>
    </button>
  )
}
