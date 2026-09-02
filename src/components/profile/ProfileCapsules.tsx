"use client"

// ── ProfileCapsules — section « Capsules » du profil ────────────────────────
// Affiche les capsules de l'utilisateur (grille 9:16, réutilise CapsuleCard).
// Présentational : les capsules proviennent de useUserCapsules (React Query)
// appelé dans ProfilePage. Un clic ouvre la visionneuse plein écran.

import { useState } from "react"
import { Clapperboard } from "lucide-react"
import Card from "@/components/common/Card"
import CapsuleCard from "@/components/capsule/CapsuleCard"
import CapsuleViewer from "@/components/capsule/CapsuleViewer"
import { Skeleton } from "@/components/ui/skeleton"
import type { Capsule } from "@/lib/capsule-service"

interface ProfileCapsulesProps {
  capsules: Capsule[]
  loading?: boolean
  /** ID Dughu de l'utilisateur connecté (autorisations du visualiseur). */
  currentUserId?: string
  onSeeAll?: () => void
  /** Nombre de capsules affichées dans la version résumée (6 par défaut). */
  previewCount?: number
}

export function ProfileCapsules({
  capsules = [],
  loading = false,
  currentUserId,
  onSeeAll,
  previewCount = 6,
}: ProfileCapsulesProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  // Capsules supprimées depuis l'ouverture du profil (mise à jour optimiste locale)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const remaining = capsules.filter((c) => !deletedIds.has(c.id))
  const visible = onSeeAll ? remaining.slice(0, previewCount) : remaining

  const handleDeleted = (capsuleId: string) => {
    setDeletedIds((current) => new Set(current).add(capsuleId))
    setViewerIndex(null)
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[16px] font-bold text-[#2D2D2D]">
          <Clapperboard size={16} className="text-[#A35A2A]" aria-hidden />
          Capsules
        </h3>
        {onSeeAll && visible.length > 0 && (
          <button
            onClick={onSeeAll}
            className="text-[12px] font-semibold text-[#A35A2A] hover:underline"
          >
            Voir toutes les capsules
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-1" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-lg" />
          ))}
          <span className="sr-only">Chargement des capsules…</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-[#65676B]">
          Aucune capsule pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {visible.map((capsule) => (
            <CapsuleCard
              key={capsule.id}
              capsule={capsule}
              onOpen={() => setViewerIndex(remaining.indexOf(capsule))}
            />
          ))}
        </div>
      )}

      {viewerIndex !== null && remaining[viewerIndex] && (
        <CapsuleViewer
          capsules={remaining}
          startIndex={viewerIndex}
          userId={currentUserId}
          currentUserId={currentUserId}
          onClose={() => setViewerIndex(null)}
          onCapsuleDeleted={handleDeleted}
        />
      )}
    </Card>
  )
}