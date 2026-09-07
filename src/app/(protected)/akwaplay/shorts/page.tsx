"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Clapperboard, RefreshCw, Plus } from "lucide-react"
import { useAuth } from "@/hooks/queries/use-auth"
import {
  fetchShorts,
  type AkwaShort,
} from "@/services/akwaplay/akwaplayShort.service"
import AkwaHeader from "@/components/akwaplay/header/AkwaHeader"
import AkwaSidebar from "@/components/akwaplay/sidebar/AkwaSidebar"
import AkwaVideoSkeleton from "@/components/akwaplay/grid/AkwaVideoSkeleton"
import AkwaShortCard from "@/components/akwaplay/shorts/AkwaShortCard"
import AkwaShortViewerModal from "@/components/akwaplay/shorts/AkwaShortViewerModal"
import AkwaShortCreateModal from "@/components/akwaplay/shorts/AkwaShortCreateModal"

function AkwaShortsContent() {
  const { data: rawUser, isLoading: authLoading } = useAuth()

  // 1. Détection immédiate du vrai ID utilisateur (mémoire / localStorage) pour éviter tout ID par défaut erroné
  const [cachedUserId, setCachedUserId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dughu_current_user_id") || ""
    }
    return ""
  })

  const rawUserId = String(
    rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.user_id || rawUser?.id || ""
  ).trim()

  useEffect(() => {
    if (rawUserId) {
      try {
        localStorage.setItem("dughu_current_user_id", rawUserId)
        setCachedUserId(rawUserId)
      } catch {}
    }
  }, [rawUserId])

  const effectiveUserId = rawUserId || cachedUserId || "28341"

  const searchParams = useSearchParams()
  const urlShortId = searchParams.get("shortId")

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [shorts, setShorts] = useState<AkwaShort[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Visionneuse et Création
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  // Responsive sidebar desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setSidebarOpen(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // Chargement des shorts
  const loadShorts = useCallback(
    async (pageNum = 1) => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      const signal = abortRef.current.signal

      if (pageNum === 1) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      let aborted = false

      try {
        const result = await fetchShorts(effectiveUserId, pageNum, signal)

        if (signal.aborted) {
          aborted = true
          return
        }

        setShorts((prev) => (pageNum === 1 ? result.shorts : [...prev, ...result.shorts]))
        setHasMore(result.hasMore)
        setPage(pageNum)
      } catch (err: any) {
        const isAbort =
          signal.aborted ||
          err?.name === "AbortError" ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED" ||
          err?.isCanceled ||
          err?.cause?.name === "CanceledError" ||
          err?.cause?.name === "AbortError" ||
          (err instanceof Error && (err.message.includes("annulée") || err.message.includes("canceled")))

        if (isAbort) {
          aborted = true
          return
        }
        setError(err?.message || "Impossible de charger les capsules.")
      } finally {
        if (!aborted && !signal.aborted) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [effectiveUserId]
  )

  useEffect(() => {
    if (authLoading && !cachedUserId && !rawUserId) return
    loadShorts(1)
  }, [effectiveUserId, authLoading, cachedUserId, rawUserId, loadShorts])

  // Ouvrir automatiquement le short ciblé par l'URL si présent
  useEffect(() => {
    if (urlShortId && shorts.length > 0) {
      const foundIndex = shorts.findIndex((s) => String(s.id) === String(urlShortId))
      if (foundIndex !== -1) {
        setViewerIndex(foundIndex)
      }
    }
  }, [urlShortId, shorts])

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      loadShorts(page + 1)
    }
  }, [loading, loadingMore, hasMore, page, loadShorts])

  const handleShortDeleted = (shortId: string | number) => {
    setShorts((prev) => prev.filter((s) => String(s.id) !== String(shortId)))
  }

  const handleShortCreated = (newShort?: AkwaShort) => {
    if (newShort) {
      setShorts((prev) => [newShort, ...prev])
      setViewerIndex(0)
    } else {
      loadShorts(1)
    }
  }

  return (
    <>
      <meta name="theme-color" content="#141414" />
      <div
        className="min-h-screen"
        style={{ backgroundColor: "#141414", color: "#ffffff", fontFamily: "'Inter', 'Roboto', sans-serif" }}
      >
        <AkwaHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          searchQuery=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onClearSearch={() => {}}
          onPublishClick={() => setCreateModalOpen(true)}
        />

        <div className="flex pt-14">
          <AkwaSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onPublishClick={() => setCreateModalOpen(true)}
          />

          <main
            className={`flex-1 min-w-0 transition-all duration-300 ease-in-out px-4 py-6 md:px-8 ${
              sidebarOpen ? "lg:ml-[220px]" : ""
            }`}
          >
            {/* ── En-tête section avec bouton Créer ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-[#985810]/20"
                  style={{ background: "linear-gradient(135deg, #985810, #7d480d)" }}
                >
                  <Clapperboard size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Capsules (Shorts)</h1>
                  <p className="text-xs text-[#9a9a9a]">Vidéos courtes verticales et immersives</p>
                </div>
              </div>

              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-lg transition hover:scale-102 shrink-0 self-start sm:self-auto"
                style={{ backgroundColor: "#985810" }}
              >
                <Plus size={15} />
                <span>Créer une capsule</span>
              </button>
            </div>

            <div style={{ borderBottom: "1px solid #242424" }} className="mb-6" />

            {/* ── Contenu ── */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[9/16] rounded-2xl bg-[#202020] animate-pulse border border-[#2e2e2e]"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#222222" }}
                >
                  <RefreshCw size={24} className="text-[#9a9a9a]" />
                </div>
                <p className="text-[#9a9a9a] text-sm max-w-xs">{error}</p>
                <button
                  onClick={() => loadShorts(1)}
                  className="px-5 py-2 rounded-full text-sm font-semibold text-white transition hover:bg-[#985810]"
                  style={{ backgroundColor: "#2a2a2a" }}
                >
                  Réessayer
                </button>
              </div>
            ) : shorts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#202020" }}
                >
                  <Clapperboard size={28} className="text-[#777777]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Aucune capsule disponible</h3>
                  <p className="text-[#888888] text-xs max-w-xs mt-1">
                    Soyez le premier à partager une capsule courte et dynamique avec la communauté !
                  </p>
                </div>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-2 px-5 py-2.5 rounded-full text-xs font-bold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "#985810" }}
                >
                  Publier la première capsule
                </button>
              </div>
            ) : (
              <div>
                {/* ── Grille verticale des capsules ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                  {shorts.map((short, idx) => (
                    <AkwaShortCard
                      key={short.id}
                      short={short}
                      onClick={() => setViewerIndex(idx)}
                    />
                  ))}
                </div>

                {/* ── Charger plus ── */}
                {hasMore && (
                  <div className="flex justify-center mt-10">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-8 py-2.5 rounded-full text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-40 border border-[#3a3a3a]"
                    >
                      {loadingMore ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Chargement…</span>
                        </span>
                      ) : (
                        "Charger plus de capsules"
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* ── MODALE VISIONNEUSE PLEIN ÉCRAN (9:16) ── */}
        {viewerIndex !== null && shorts.length > 0 && (
          <AkwaShortViewerModal
            shorts={shorts}
            initialIndex={viewerIndex}
            currentUserId={effectiveUserId}
            onClose={() => setViewerIndex(null)}
            onDeleteShort={handleShortDeleted}
            onShortUpdated={(updated) => {
              setShorts((prev) =>
                prev.map((s) => (String(s.id) === String(updated.id) ? updated : s))
              )
            }}
          />
        )}

        {/* ── MODALE DE CRÉATION DE CAPSULE ── */}
        <AkwaShortCreateModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          userId={effectiveUserId}
          onSuccess={handleShortCreated}
        />
      </div>
    </>
  )
}

export default function AkwaShortsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#141414] flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-[#985810] animate-spin" />
        </div>
      }
    >
      <AkwaShortsContent />
    </Suspense>
  )
}
