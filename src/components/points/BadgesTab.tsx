"use client"

/**
 * Onglet « Mes badges » : badges obtenus (API /badge/[userId], état vide
 * trophée si aucun) et catalogue complet (API /badge) avec filtres par
 * catégorie et statut obtenu / verrouillé (croisement côté client).
 */

import { useMemo, useState } from "react"
import { Trophy, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import BadgeCard from "./BadgeCard"
import { useBadgeCatalogue, useUserBadges } from "@/hooks/badges/use-badges"
import type { BadgeItem } from "@/types/points/points.types"
import { cn } from "@/lib/utils"

interface BadgesTabProps {
  /** ID Dughu de l'utilisateur connecté (null si non résolu). */
  userId: string
}

/** Ordre de préférence des catégories dans les filtres. */
const CATEGORY_ORDER = ["engagement", "reconnaissance", "fidelité", "fidelite", "création", "creation", "leadership", "certification"]

function categoryLabel(category: string): string {
  if (!category) return "Autres"
  return category.charAt(0).toUpperCase() + category.slice(1)
}

/** Clés de croisement catalogue ↔ badges obtenus (id puis nom normalisé). */
function badgeKeys(badge: BadgeItem): string[] {
  const name = badge.name.toLowerCase().replace(/\s+/g, " ").trim()
  return [badge.id, name].filter(Boolean)
}

export default function BadgesTab({ userId }: BadgesTabProps) {
  const [category, setCategory] = useState<string>("all")

  const catalogueQuery = useBadgeCatalogue()
  const userBadgesQuery = useUserBadges({ userId })

  const catalogue = useMemo(() => catalogueQuery.data?.badges ?? [], [catalogueQuery.data])
  const userBadges = useMemo(() => userBadgesQuery.data?.badges ?? [], [userBadgesQuery.data])

  // Croisement : ids et noms normalisés des badges obtenus.
  const earnedKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const badge of userBadges) {
      for (const key of badgeKeys(badge)) keys.add(key)
    }
    return keys
  }, [userBadges])

  // Catégories dérivées du catalogue (ordre de préférence, puis ordre d'arrivée).
  const categories = useMemo(() => {
    const seen = new Set<string>()
    for (const badge of catalogue) {
      if (badge.category) seen.add(badge.category)
    }
    return [...seen].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a)
      const ib = CATEGORY_ORDER.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b, "fr")
    })
  }, [catalogue])

  const visibleBadges = useMemo(
    () => (category === "all" ? catalogue : catalogue.filter((badge) => badge.category === category)),
    [catalogue, category]
  )

  const catalogueLoading = catalogueQuery.isLoading || catalogueQuery.isFetching
  const userBadgesLoading = userBadgesQuery.isLoading || userBadgesQuery.isFetching
  const hasError = catalogueQuery.isError || (userBadgesQuery.isError && !!userId)

  if (hasError) {
    return (
      <div role="tabpanel" aria-label="Mes badges" className="space-y-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-sm font-semibold text-[#2D2D2D]">Impossible de charger les badges.</p>
          <p className="mt-1 text-xs text-[#65676B]">Vérifiez votre connexion puis réessayez.</p>
          <button
            type="button"
            onClick={() => {
              void catalogueQuery.refetch()
              void userBadgesQuery.refetch()
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#A35A2A] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#8B5A2B]"
          >
            <RefreshCw size={14} aria-hidden />
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div role="tabpanel" aria-label="Mes badges" className="space-y-5">
      {/* Badges obtenus */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="text-base font-bold text-[#2D2D2D]">Mes badges</h2>
        {userBadgesLoading ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : userBadges.length === 0 ? (
          <div className="mt-3 flex flex-col items-center rounded-xl bg-gray-50/70 px-4 py-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-[#F5EFE8] text-[#A35A2A]" aria-hidden>
              <Trophy size={26} />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#2D2D2D]">Aucun badge obtenu pour le moment</p>
            <p className="mt-1 max-w-sm text-xs text-[#65676B]">
              Participez activement sur Dughu pour débloquer vos premiers badges !
            </p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {userBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} earned />
            ))}
          </div>
        )}
      </section>
      {/* Catalogue des badges */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="text-base font-bold text-[#2D2D2D]">Catalogue des badges</h2>

        {/* Filtres par catégorie */}
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Filtrer les badges par catégorie">
            <button
              type="button"
              aria-pressed={category === "all"}
              onClick={() => setCategory("all")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]",
                category === "all" ? "bg-[#A35A2A] text-white" : "bg-gray-100 text-[#65676B] hover:bg-[#F5EFE8]"
              )}
            >
              Tous
            </button>
            {categories.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={category === key}
                onClick={() => setCategory(key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]",
                  category === key ? "bg-[#A35A2A] text-white" : "bg-gray-100 text-[#65676B] hover:bg-[#F5EFE8]"
                )}
              >
                {categoryLabel(key)}
              </button>
            ))}
          </div>
        )}

        {catalogueLoading ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : visibleBadges.length === 0 ? (
          <p className="mt-4 rounded-xl bg-gray-50/70 px-4 py-8 text-center text-sm text-[#65676B]">
            Aucun badge dans cette catégorie pour le moment.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleBadges.map((badge) => {
              const earned = badgeKeys(badge).some((key) => earnedKeys.has(key))
              return <BadgeCard key={badge.id || badge.name} badge={badge} earned={earned} />
            })}
          </div>
        )}
      </section>
    </div>
  )
}
