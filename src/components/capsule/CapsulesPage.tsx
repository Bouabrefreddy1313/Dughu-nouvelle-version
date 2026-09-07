"use client"

// ── CapsulesPage — page dédiée /capsules ────────────────────────────────────
// Sidebar interactive (Pour vous, Suivis, Mes capsules, Points Capsule)
// + Grille de capsules (format 9:16) + Visionneuse plein écran au clic.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Clapperboard,
  Plus,
  Sparkles,
  Users,
  Film,
  Coins,
  RefreshCw,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { useCapsulesFeed, useUserCapsules } from "@/hooks/queries/use-capsules"
import { usePointsHistory } from "@/hooks/points/use-points"
import { fetchCapsulesFeed } from "@/services/capsules/capsules.service"
import type { Capsule } from "@/lib/capsule-service"
import CapsuleCard from "./CapsuleCard"
import CapsuleViewer from "./CapsuleViewer"
import CapsuleCreator from "./CapsuleCreator"
import CapsuleSidebar, { type CapsuleTab } from "./CapsuleSidebar"
import CapsulePointsView from "./CapsulePointsView"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 12

export default function CapsulesPage() {
  const { data: rawUser, isLoading: authLoading } = useAuth()
  const userId = String(rawUser?.dughu?.userId || "")
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<CapsuleTab>("all")
  const [creatorOpen, setCreatorOpen] = useState(false)

  // ── Onglet "all" (Pour vous / Feed global) ──
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const {
    data: feedData,
    isLoading: feedLoading,
    isError: feedIsError,
    error: feedError,
    refetch: refetchFeed,
  } = useCapsulesFeed({ userId, page: 1, perPage: PAGE_SIZE })

  // ── Onglet "following" (Capsules des abonnements) ──
  const {
    data: followingData,
    isLoading: followingLoading,
    isError: followingIsError,
    error: followingError,
    refetch: refetchFollowing,
  } = useCapsulesFeed({
    userId,
    page: 1,
    perPage: PAGE_SIZE,
    filter: "following",
  })
  const followingCapsules = useMemo(() => followingData?.capsules || [], [followingData])

  // ── Onglet "mine" (Mes capsules) ──
  const {
    data: myCapsulesData,
    isLoading: myCapsulesLoading,
    isError: myCapsulesIsError,
    error: myCapsulesError,
    refetch: refetchMyCapsules,
  } = useUserCapsules(userId, userId)
  const myCapsules = useMemo(() => myCapsulesData || [], [myCapsulesData])

  // ── Points Capsule (/pointsHistory/{userId}/capsule) ──
  const {
    data: pointsData,
    isLoading: pointsLoading,
  } = usePointsHistory({
    userId,
    source: "capsule",
    enabled: !!userId,
  })

  // Calcul du solde des points Capsule pour la sidebar
  const pointsTotal = useMemo(() => {
    if (!pointsData?.entries) return undefined
    let total = 0
    for (const e of pointsData.entries) {
      if (e.type === "gain") total += e.points
      else total -= e.points
    }
    return Math.max(0, total)
  }, [pointsData])

  // ── Gestion de la visionneuse ──
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [viewerList, setViewerList] = useState<Capsule[]>([])

  // Synchronisation du feed "all"
  useEffect(() => {
    if (!feedData) return
    const fresh = feedData.capsules || []
    setCapsules((current) => {
      if (current.length === 0) return fresh
      const freshById = new Map(fresh.map((c) => [String(c.id), c]))
      const currentIds = new Set(current.map((c) => String(c.id)))
      const added = fresh.filter((c) => !currentIds.has(String(c.id)))
      return [...added, ...current.map((c) => freshById.get(String(c.id)) ?? c)]
    })
    setHasMore(!!feedData.pagination?.hasMore)
    setHydrated(true)
  }, [feedData])

  const displayCapsules = hydrated ? capsules : (feedData?.capsules || [])

  // Infinite scroll pour "all"
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !userId || activeTab !== "all") return
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
      // silencieux
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loadingMore, page, userId, activeTab])

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || activeTab !== "all") return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: "400px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore, activeTab])

  // Ouvrir la visionneuse avec la liste correspondante
  const handleOpenViewer = (list: Capsule[], index: number) => {
    setViewerList(list)
    setViewerIndex(index)
  }

  const handleDeleted = useCallback((capsuleId: string) => {
    setCapsules((current) => current.filter((c) => c.id !== capsuleId))
    setViewerIndex(null)
    void refetchFeed()
    void refetchMyCapsules()
    void refetchFollowing()
  }, [refetchFeed, refetchMyCapsules, refetchFollowing])

  return (
    <MainLayout user={rawUser} wide noRightSidebar active="capsules">
      <div className="mx-auto w-full max-w-[1100px] px-2 py-4 sm:px-4">
        {/* ── Layout 2 colonnes (Sidebar + Contenu) ── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── SIDEBAR DESKTOP (Fixe / Sticky) ── */}
          <aside className="hidden lg:block w-[280px] shrink-0 sticky top-24">
            <CapsuleSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              userId={userId}
              myCapsulesCount={myCapsules.length}
              pointsTotal={pointsTotal}
              pointsLoading={pointsLoading}
              onOpenCreator={() => setCreatorOpen(true)}
            />
          </aside>

          {/* ── ZONE DE CONTENU PRINCIPALE ── */}
          <main className="flex-1 min-w-0 w-full">
            {/* ── Barre de navigation responsive Mobile / Tablette (< lg) ── */}
            <div className="lg:hidden mb-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#985810]/10 text-[#985810]">
                    <Clapperboard size={20} />
                  </div>
                  <h1 className="text-lg font-bold text-[#2D2D2D]">Capsules</h1>
                </div>

                {userId && (
                  <button
                    type="button"
                    onClick={() => setCreatorOpen(true)}
                    className="flex items-center gap-1.5 rounded-full bg-[#985810] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#7d480d]"
                  >
                    <Plus size={15} />
                    <span>Créer</span>
                  </button>
                )}
              </div>

              {/* Barre de défilement des onglets mobiles */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition shrink-0",
                    activeTab === "all"
                      ? "bg-[#985810] text-white shadow-sm"
                      : "bg-white text-[#65676B] hover:bg-gray-100 border border-gray-100"
                  )}
                >
                  <Sparkles size={14} />
                  <span>Pour vous</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("following")}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition shrink-0",
                    activeTab === "following"
                      ? "bg-[#985810] text-white shadow-sm"
                      : "bg-white text-[#65676B] hover:bg-gray-100 border border-gray-100"
                  )}
                >
                  <Users size={14} />
                  <span>Suivi(e)s</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("mine")}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition shrink-0",
                    activeTab === "mine"
                      ? "bg-[#985810] text-white shadow-sm"
                      : "bg-white text-[#65676B] hover:bg-gray-100 border border-gray-100"
                  )}
                >
                  <Film size={14} />
                  <span>Mes capsules</span>
                  {myCapsules.length > 0 && (
                    <span
                      className={cn(
                        "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                        activeTab === "mine" ? "bg-white text-[#985810]" : "bg-[#985810]/10 text-[#985810]"
                      )}
                    >
                      {myCapsules.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("points")}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition shrink-0",
                    activeTab === "points"
                      ? "bg-[#985810] text-white shadow-sm"
                      : "bg-white text-[#65676B] hover:bg-gray-100 border border-gray-100"
                  )}
                >
                  <Coins size={14} />
                  <span>Points</span>
                  {pointsTotal !== undefined && pointsTotal > 0 && (
                    <span
                      className={cn(
                        "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                        activeTab === "points" ? "bg-white text-[#985810]" : "bg-amber-100 text-[#985810]"
                      )}
                    >
                      {pointsTotal}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════
                VUE 1 : TOUTES LES CAPSULES (POUR VOUS / FEED GLOBAL)
               ═════════════════════════════════════════════════════════════ */}
            {activeTab === "all" && (
              <div className="space-y-4">
                <div className="hidden lg:flex items-center justify-between px-1">
                  <div>
                    <h1 className="text-xl font-bold text-[#2D2D2D]">Pour vous</h1>
                    <p className="text-xs text-[#65676B]">Découvrez les dernières capsules vidéo de la communauté</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refetchFeed()}
                    className="inline-flex items-center gap-1.5 text-xs text-[#65676B] hover:text-[#985810] transition"
                  >
                    <RefreshCw size={13} />
                    <span>Actualiser</span>
                  </button>
                </div>

                {feedIsError ? (
                  <div className="rounded-3xl bg-white p-8 text-center shadow-sm border border-gray-100">
                    <p className="text-sm text-red-600">
                      {feedError instanceof Error ? feedError.message : "Impossible de charger les capsules."}
                    </p>
                    <button
                      onClick={() => void refetchFeed()}
                      className="mt-3 text-xs font-semibold text-[#985810] hover:underline"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : authLoading || feedLoading || (!feedData && !!userId) ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-[9/16] rounded-2xl" />
                    ))}
                    <span className="sr-only">Chargement des capsules...</span>
                  </div>
                ) : displayCapsules.length === 0 ? (
                  <div className="rounded-3xl bg-white p-12 text-center shadow-sm border border-gray-100">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#985810]/10 text-[#985810] mb-3">
                      <Film size={28} />
                    </div>
                    <h3 className="text-base font-bold text-[#2D2D2D]">Aucune capsule pour l&apos;instant</h3>
                    <p className="text-sm text-[#65676B] max-w-sm mx-auto mt-1">
                      Soyez le premier à partager une capsule vidéo avec la communauté Dughu !
                    </p>
                    {userId && (
                      <button
                        type="button"
                        onClick={() => setCreatorOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#985810] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#7d480d]"
                      >
                        <Plus size={16} />
                        <span>Créer une capsule</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {displayCapsules.map((capsule, i) => (
                        <CapsuleCard
                          key={capsule.id}
                          capsule={capsule}
                          onOpen={() => handleOpenViewer(displayCapsules, i)}
                        />
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
            )}

            {/* ═════════════════════════════════════════════════════════════
                VUE 2 : ABONNEMENTS (CAPSULES DES PERSONNES SUIVIES)
               ═════════════════════════════════════════════════════════════ */}
            {activeTab === "following" && (
              <div className="space-y-4">
                <div className="hidden lg:flex items-center justify-between px-1">
                  <div>
                    <h1 className="text-xl font-bold text-[#2D2D2D]">Suivi(e)s</h1>
                    <p className="text-xs text-[#65676B]">Capsules publiées par les créateurs dont vous êtes abonné</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refetchFollowing()}
                    className="inline-flex items-center gap-1.5 text-xs text-[#65676B] hover:text-[#985810] transition"
                  >
                    <RefreshCw size={13} />
                    <span>Actualiser</span>
                  </button>
                </div>

                {followingIsError ? (
                  <div className="rounded-3xl bg-white p-8 text-center shadow-sm border border-gray-100">
                    <p className="text-sm text-red-600">
                      {followingError instanceof Error ? followingError.message : "Impossible de charger les capsules de vos abonnements."}
                    </p>
                    <button
                      onClick={() => void refetchFollowing()}
                      className="mt-3 text-xs font-semibold text-[#985810] hover:underline"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : followingLoading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-[9/16] rounded-2xl" />
                    ))}
                    <span className="sr-only">Chargement des capsules suivies...</span>
                  </div>
                ) : followingCapsules.length === 0 ? (
                  <div className="rounded-3xl bg-white p-12 text-center shadow-sm border border-gray-100">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#985810]/10 text-[#985810] mb-3">
                      <Users size={28} />
                    </div>
                    <h3 className="text-base font-bold text-[#2D2D2D]">Aucune capsule de vos abonnements</h3>
                    <p className="text-sm text-[#65676B] max-w-sm mx-auto mt-1">
                      Les personnes auxquelles vous êtes abonné n&apos;ont pas encore publié de capsule ou vous ne suivez aucun créateur.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("all")}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#985810] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#7d480d]"
                    >
                      <Sparkles size={16} />
                      <span>Découvrir toutes les capsules</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {followingCapsules.map((capsule, i) => (
                      <CapsuleCard
                        key={capsule.id}
                        capsule={capsule}
                        onOpen={() => handleOpenViewer(followingCapsules, i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════
                VUE 3 : MES CAPSULES (PROPRES CAPSULES DE L'UTILISATEUR)
               ═════════════════════════════════════════════════════════════ */}
            {activeTab === "mine" && (
              <div className="space-y-4">
                <div className="hidden lg:flex items-center justify-between px-1">
                  <div>
                    <h1 className="text-xl font-bold text-[#2D2D2D]">Mes capsules</h1>
                    <p className="text-xs text-[#65676B]">
                      {myCapsules.length} capsule{myCapsules.length > 1 ? "s" : ""} publiée{myCapsules.length > 1 ? "s" : ""} par vous
                    </p>
                  </div>
                  {userId && (
                    <button
                      type="button"
                      onClick={() => setCreatorOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#985810] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#7d480d]"
                    >
                      <Plus size={16} />
                      <span>Créer</span>
                    </button>
                  )}
                </div>

                {myCapsulesIsError ? (
                  <div className="rounded-3xl bg-white p-8 text-center shadow-sm border border-gray-100">
                    <p className="text-sm text-red-600">
                      {myCapsulesError instanceof Error ? myCapsulesError.message : "Impossible de charger vos capsules."}
                    </p>
                    <button
                      onClick={() => void refetchMyCapsules()}
                      className="mt-3 text-xs font-semibold text-[#985810] hover:underline"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : myCapsulesLoading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-[9/16] rounded-2xl" />
                    ))}
                    <span className="sr-only">Chargement de vos capsules...</span>
                  </div>
                ) : myCapsules.length === 0 ? (
                  <div className="rounded-3xl bg-white p-12 text-center shadow-sm border border-gray-100">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#985810]/10 text-[#985810] mb-3">
                      <Film size={28} />
                    </div>
                    <h3 className="text-base font-bold text-[#2D2D2D]">Vous n&apos;avez pas encore publié de capsule</h3>
                    <p className="text-sm text-[#65676B] max-w-sm mx-auto mt-1">
                      Partagez des vidéos verticales courtes pour faire grandir votre audience et accumuler des points Dughu.
                    </p>
                    {userId && (
                      <button
                        type="button"
                        onClick={() => setCreatorOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#985810] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#7d480d]"
                      >
                        <Plus size={16} />
                        <span>Créer ma première capsule</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {myCapsules.map((capsule, i) => (
                      <CapsuleCard
                        key={capsule.id}
                        capsule={capsule}
                        onOpen={() => handleOpenViewer(myCapsules, i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════
                VUE 4 : MES POINTS CAPSULE (/pointsHistory/{userId}/capsule)
               ═════════════════════════════════════════════════════════════ */}
            {activeTab === "points" && (
              <CapsulePointsView
                userId={userId}
                onOpenCreator={() => setCreatorOpen(true)}
              />
            )}
          </main>
        </div>
      </div>

      {/* ── VISIONNEUSE PLEIN ÉCRAN ── */}
      {viewerIndex !== null && viewerList[viewerIndex] && (
        <CapsuleViewer
          capsules={viewerList}
          startIndex={viewerIndex}
          userId={userId}
          currentUserId={userId}
          onClose={() => setViewerIndex(null)}
          onCapsuleDeleted={handleDeleted}
        />
      )}

      {/* ── MODALE DE CRÉATION DE CAPSULE ── */}
      <CapsuleCreator
        user={rawUser}
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onCreated={() => {
          void queryClient.invalidateQueries({ queryKey: ["capsules"] })
          void refetchFeed()
          void refetchMyCapsules()
        }}
      />
    </MainLayout>
  )
}
