"use client"

// ── CapsulesPage — page dédiée /capsules ────────────────────────────────────
// Grille de capsules (format 9:16) + visionneuse plein écran au clic.
// Pattern identique à la page Flash : MainLayout + useAuth + React Query.

import { useCallback, useEffect, useRef, useState } from "react"
import { Clapperboard, Plus } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { useCapsulesFeed } from "@/hooks/queries/use-capsules"
import { fetchCapsulesFeed } from "@/services/capsules/capsules.service"
import type { Capsule } from "@/lib/capsule-service"
import CapsuleCard from "./CapsuleCard"
import CapsuleViewer from "./CapsuleViewer"
import CapsuleCreator from "./CapsuleCreator"
import { Skeleton } from "@/components/ui/skeleton"

const PAGE_SIZE = 12

export default function CapsulesPage() {
  const { data: rawUser, isLoading: authLoading } = useAuth()
  const userId = String(rawUser?.dughu?.userId || "")
  const queryClient = useQueryClient()
  const [creatorOpen, setCreatorOpen] = useState(false)

  const [capsules, setCapsules] = useState<Capsule[]>([])
  // `hydrated` : la 1re page de React Query a été recopiée dans `capsules`.
  // Tant qu'elle ne l'est pas, on rend `data.capsules` directement pour ne
  // jamais afficher « Aucune capsule » pendant le chargement (et on évite la
  // réapparition de capsules supprimées après une suppression optimiste).
  const [hydrated, setHydrated] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError, error, refetch } = useCapsulesFeed({ userId, page: 1, perPage: PAGE_SIZE })

  // Première page
  useEffect(() => {
    if (!data) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCapsules(data.capsules || [])
    setHasMore(!!data.pagination?.hasMore)
    setHydrated(true)
  }, [data])

  // Liste affichée : `capsules` (pages chargées au scroll + suppressions) une
  // fois hydratée ; sinon la 1re page distante directement (pas de flash vide).
  const displayCapsules = hydrated ? capsules : (data?.capsules || [])

  // Pages suivantes au scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !userId) return
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const json = await fetchCapsulesFeed({ userId, page: nextPage, perPage: PAGE_SIZE })
      const more: Capsule[] = json.capsules || []
      if (more.length > 0 || json.pagination?.hasMore) {
        setCapsules((current) => {
          const seen = new Set(current.map((c) => c.id))
          return [...current, ...more.filter((c) => !seen.has(c.id))]
        })
        setPage(nextPage)
        setHasMore(!!json.pagination?.hasMore)
      }
    } catch {
      // silencieux : nouvelle tentative au scroll suivant
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loadingMore, page, userId])

  // Intersection observer pour le chargement infini
  useEffect(() => {
    const node = loadMoreRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: "400px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore])

  const handleDeleted = useCallback((capsuleId: string) => {
    setCapsules((current) => current.filter((c) => c.id !== capsuleId))
    setViewerIndex(null)
    void refetch()
  }, [refetch])

  return (
    <MainLayout user={rawUser}>
      <div className="mx-auto max-w-2xl px-2 py-4 sm:px-0">
        <div className="mb-4 flex items-center justify-between px-1">
          <h1 className="flex items-center gap-2 text-xl font-bold text-[#2D2D2D]">
            <Clapperboard size={22} className="text-[#A35A2A]" aria-hidden />
            Capsules
          </h1>
          {userId && (
            <button
              type="button"
              onClick={() => setCreatorOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#A35A2A] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#8a4d23] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E08543]"
              aria-label="Créer une capsule"
            >
              <Plus size={16} aria-hidden />
              Créer
            </button>
          )}
        </div>

        {isError ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm border border-gray-100">
            <p className="text-sm text-red-600">{error instanceof Error ? error.message : "Impossible de charger les capsules."}</p>
            <button onClick={() => void refetch()} className="mt-3 text-xs font-semibold text-[#A35A2A] hover:underline">
              Réessayer
            </button>
          </div>
        ) : authLoading || isLoading || (!data && !!userId) ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[9/16] rounded-2xl" />
            ))}
            <span className="sr-only">Chargement des capsules...</span>
          </div>
        ) : displayCapsules.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm border border-gray-100">
            <p className="text-[#65676B]">Aucune capsule pour l&apos;instant.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {displayCapsules.map((capsule, i) => (
                <CapsuleCard key={capsule.id} capsule={capsule} onOpen={() => setViewerIndex(i)} />
              ))}
            </div>
            {hasMore && (
              <div ref={loadMoreRef} className="min-h-16 py-4 text-center">
                {loadingMore && <span className="text-xs text-[#65676B]">Chargement…</span>}
              </div>
            )}
          </>
        )}
      </div>

      {viewerIndex !== null && displayCapsules[viewerIndex] && (
        <CapsuleViewer
          capsules={displayCapsules}
          startIndex={viewerIndex}
          userId={userId}
          currentUserId={userId}
          onClose={() => setViewerIndex(null)}
          onCapsuleDeleted={handleDeleted}
        />
      )}

      {/* Création d'une capsule (POST /store/capsule Dughu) */}
      <CapsuleCreator
        user={rawUser}
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onCreated={() => {
          // Rafraîchit le feed (cache React Query) pour afficher la nouvelle capsule
          void queryClient.invalidateQueries({ queryKey: ["capsules"] })
          void refetch()
        }}
      />
    </MainLayout>
  )
}
