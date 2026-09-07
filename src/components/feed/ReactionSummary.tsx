"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { normalizeReactionType, getReactionMeta } from "@/lib/constants"

export interface ReactionSummaryItem {
  type: string
  count: number
}

interface ReactionSummaryProps {
  reactions?: ReactionSummaryItem[]
  likesCount: number
  fallbackReactionId?: number | string | null
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

    // Regroupe et déduplique par type de réaction normalisé
    const countByType: Record<string, number> = {}

    if (Array.isArray(reactions) && reactions.length > 0) {
      for (const r of reactions) {
        const normType = normalizeReactionType(r.type)
        const count = Number(r.count) || 0
        if (normType && count > 0) {
          countByType[normType] = (countByType[normType] || 0) + count
        }
      }
    }

    // Si l'utilisateur courant a réagi (passé via fallbackReactionId), on s'assure que son type est inclus
    const myNormType = fallbackReactionId ? normalizeReactionType(fallbackReactionId) : null
    if (myNormType && !countByType[myNormType]) {
      countByType[myNormType] = 1
    }

    // Si aucun type distinct n'a pu être identifié mais qu'il y a des likes
    if (Object.keys(countByType).length === 0) {
      countByType[myNormType || "like"] = likesCount
    }

    // Trie par fréquence décroissante pour afficher les types les plus représentés en premier
    const sortedTypes = Object.entries(countByType)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])

    // On affiche une icône par type distinct présent sur le post (côte à côte)
    // On conserve les types distincts (jusqu'à 6 types disponibles)
    const distinctIcons: string[] = []
    const tooltipParts: string[] = []

    for (const [type, count] of sortedTypes) {
      const meta = getReactionMeta(type)
      if (meta && !distinctIcons.includes(meta.icon)) {
        distinctIcons.push(meta.icon)
      }
      if (meta) {
        tooltipParts.push(`${meta.icon} ${count}`)
      }
    }

    return {
      icons: distinctIcons,
      tooltipText: tooltipParts.join(" • "),
    }
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
