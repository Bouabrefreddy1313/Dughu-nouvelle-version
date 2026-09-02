"use client"

/**
 * Carte de badge réutilisable : icône (emoji ou image), nom, tag de catégorie
 * coloré, description courte et statut (« Obtenu » avec date, ou verrouillé).
 */

import Image from "next/image"
import { Lock, BadgeCheck } from "lucide-react"
import type { BadgeItem } from "@/types/points/points.types"
import { cn } from "@/lib/utils"

interface BadgeCardProps {
  badge: BadgeItem
  /** Vrai si le badge a été obtenu par l'utilisateur connecté. */
  earned: boolean
}

/** Couleurs des tags de catégorie (sémantiques et distinctes). */
const CATEGORY_STYLES: Record<string, string> = {
  engagement: "bg-orange-100 text-orange-700",
  reconnaissance: "bg-violet-100 text-violet-700",
  fidelite: "bg-sky-100 text-sky-700",
  "fidélité": "bg-sky-100 text-sky-700",
  creation: "bg-emerald-100 text-emerald-700",
  "création": "bg-emerald-100 text-emerald-700",
  leadership: "bg-amber-100 text-amber-700",
  certification: "bg-rose-100 text-rose-700",
}

function categoryLabel(category: string): string {
  if (!category) return "Badge"
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function formatEarnedDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

const isImageUrl = (value: string) => /^https?:\/\//.test(value) || value.startsWith("/")

export default function BadgeCard({ badge, earned }: BadgeCardProps) {
  const categoryStyle = CATEGORY_STYLES[badge.category] || "bg-gray-100 text-gray-600"

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border bg-white p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition",
        earned
          ? "border-[#A35A2A]/40 ring-2 ring-[#A35A2A]/20"
          : "border-gray-200 opacity-90"
      )}
    >
      <span
        className={cn(
          "flex size-14 items-center justify-center overflow-hidden rounded-full text-2xl",
          earned ? "bg-[#F5EFE8]" : "bg-gray-100 grayscale"
        )}
        aria-hidden
      >
        {badge.icon && isImageUrl(badge.icon) ? (
          <Image src={badge.icon} alt="" width={56} height={56} className="size-full object-cover" unoptimized />
        ) : (
          <span>{badge.icon || "🏅"}</span>
        )}
      </span>

      <h3 className="mt-2 text-sm font-bold text-[#2D2D2D]">{badge.name}</h3>
      <span className={cn("mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", categoryStyle)}>
        {categoryLabel(badge.category)}
      </span>

      {badge.description && (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#65676B]">{badge.description}</p>
      )}

      <div className="mt-3">
        {earned ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <BadgeCheck size={14} aria-hidden />
            Obtenu{badge.earnedAt ? ` le ${formatEarnedDate(badge.earnedAt)}` : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#65676B]">
            <Lock size={13} aria-hidden />
            À débloquer
          </span>
        )}
      </div>
    </div>
  )
}
