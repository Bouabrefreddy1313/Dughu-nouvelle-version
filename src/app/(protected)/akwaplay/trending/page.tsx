"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Zap, RefreshCw, Film } from "lucide-react"
import { useAuth } from "@/hooks/queries/use-auth"
import AkwaHeader from "@/components/akwaplay/header/AkwaHeader"
import AkwaSidebar from "@/components/akwaplay/sidebar/AkwaSidebar"
import AkwaVideoCard from "@/components/akwaplay/grid/AkwaVideoCard"
import AkwaVideoSkeleton from "@/components/akwaplay/grid/AkwaVideoSkeleton"
import { getTrendingVideos } from "@/services/akwaplay/akwaplayVideo.service"
import type { AkwaVideo } from "@/types/akwaplay/akwaplay.types"

export default function AkwaTrendingPage() {
  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.id || "")

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [videos, setVideos] = useState<AkwaVideo[]>([])
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

  const loadVideos = useCallback(async (pageNum = 1) => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    if (pageNum === 1) { setLoading(true); setError(null) }
    else setLoadingMore(true)

    try {
      const result = await getTrendingVideos(pageNum, signal)
      setVideos(prev => pageNum === 1 ? result.videos : [...prev, ...result.videos])
      setHasMore(result.hasMore)
      setPage(pageNum)
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.name === "CanceledError") return
      setError(err?.message || "Impossible de charger les tendances.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { loadVideos(1) }, [loadVideos])

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) loadVideos(page + 1)
  }, [loading, loadingMore, hasMore, page, loadVideos])

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
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Tendances</h1>
                <p className="text-sm text-[#9a9a9a]">Les vidéos les plus populaires du moment</p>
              </div>
            </div>

            <div style={{ borderBottom: "1px solid #2a2a2a" }} className="mb-6" />

            {/* Contenu */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => <AkwaVideoSkeleton key={i} />)}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#2a2a2a" }}>
                  <RefreshCw size={24} className="text-[#9a9a9a]" />
                </div>
                <p className="text-[#9a9a9a] text-sm max-w-xs">{error}</p>
                <button
                  onClick={() => loadVideos(1)}
                  className="px-5 py-2 rounded-full text-sm font-semibold text-white transition hover:bg-[#f5821f]"
                  style={{ backgroundColor: "#2a2a2a" }}
                >
                  Réessayer
                </button>
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#2a2a2a" }}>
                  <Film size={24} className="text-[#9a9a9a]" />
                </div>
                <p className="text-[#9a9a9a] text-sm">Aucune vidéo en tendance pour le moment.</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {videos.map(video => <AkwaVideoCard key={video.id} video={video} />)}
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
