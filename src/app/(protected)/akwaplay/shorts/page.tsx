"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Clapperboard, RefreshCw, Play } from "lucide-react"
import { useAuth } from "@/hooks/queries/use-auth"
import {
  fetchShorts,
  type AkwaShort,
} from "@/services/akwaplay/akwaplayShort.service"
import AkwaHeader from "@/components/akwaplay/header/AkwaHeader"
import AkwaSidebar from "@/components/akwaplay/sidebar/AkwaSidebar"
import AkwaVideoSkeleton from "@/components/akwaplay/grid/AkwaVideoSkeleton"

export default function AkwaShortsPage() {
  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.id || "")

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [shorts, setShorts] = useState<AkwaShort[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setSidebarOpen(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const loadShorts = useCallback(async (pageNum = 1) => {
    if (!userId || userId.trim() === "") return
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    if (pageNum === 1) { setLoading(true); setError(null) }
    else setLoadingMore(true)

    try {
      const result = await fetchShorts(userId, pageNum, signal)
      setShorts(prev => pageNum === 1 ? result.shorts : [...prev, ...result.shorts])
      setHasMore(result.hasMore)
      setPage(pageNum)
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.name === "CanceledError") return
      setError(err?.message || "Impossible de charger les shorts.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userId])

  useEffect(() => { loadShorts(1) }, [loadShorts])

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) loadShorts(page + 1)
  }, [loading, loadingMore, hasMore, page, loadShorts])

  return (
    <>
      <meta name="theme-color" content="#141414" />
      <div
        className="min-h-screen"
        style={{ backgroundColor: "#141414", color: "#ffffff", fontFamily: "'Inter', 'Roboto', sans-serif" }}
      >
        <AkwaHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          searchQuery=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onClearSearch={() => {}}
          onPublishClick={() => {}}
        />

        <div className="flex pt-14">
          <AkwaSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onPublishClick={() => {}}
          />

          <main
            className={`flex-1 min-w-0 transition-all duration-300 ease-in-out px-4 py-6 md:px-6 ${sidebarOpen ? "lg:ml-[220px]" : ""}`}
          >
            {/* En-tête section */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f5821f, #e5530a)" }}
              >
                <Clapperboard size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Shorts</h1>
                <p className="text-sm text-[#9a9a9a]">Vidéos courtes et dynamiques</p>
              </div>
            </div>

            <div style={{ borderBottom: "1px solid #2a2a2a" }} className="mb-6" />

            {/* Contenu */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {Array.from({ length: 12 }).map((_, i) => <AkwaVideoSkeleton key={i} />)}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#2a2a2a" }}>
                  <RefreshCw size={24} className="text-[#9a9a9a]" />
                </div>
                <p className="text-[#9a9a9a] text-sm max-w-xs">{error}</p>
                <button
                  onClick={() => loadShorts(1)}
                  className="px-5 py-2 rounded-full text-sm font-semibold text-white transition hover:bg-[#f5821f]"
                  style={{ backgroundColor: "#2a2a2a" }}
                >
                  Réessayer
                </button>
              </div>
            ) : shorts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#2a2a2a" }}>
                  <Clapperboard size={24} className="text-[#9a9a9a]" />
                </div>
                <h3 className="text-white font-semibold">Aucun short disponible</h3>
                <p className="text-[#9a9a9a] text-sm max-w-xs">
                  Les shorts apparaîtront ici une fois publiés.
                </p>
              </div>
            ) : (
              <div>
                {/* Grille verticale style shorts */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {shorts.map(short => (
                    <div
                      key={short.id}
                      className="relative rounded-xl overflow-hidden cursor-pointer group"
                      style={{ aspectRatio: "9/16", backgroundColor: "#1c1c1c" }}
                    >
                      {/* Thumbnail */}
                      {short.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={short.thumbnail}
                          alt={short.caption || "Short"}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      )}

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                      {/* Icône lecture au centre */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play size={20} className="text-white ml-1" />
                        </div>
                      </div>

                      {/* Infos bas */}
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        {short.caption && (
                          <p className="text-white text-xs font-medium line-clamp-2">{short.caption}</p>
                        )}
                        {(short.viewsCount ?? 0) > 0 && (
                          <p className="text-white/60 text-xs mt-0.5">
                            {short.viewsCount?.toLocaleString()} vues
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-10">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-8 py-2.5 rounded-full text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
                      style={{ border: "1px solid #3a3a3a" }}
                    >
                      {loadingMore ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw size={14} className="animate-spin" />
                          Chargement…
                        </span>
                      ) : "Charger plus"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
