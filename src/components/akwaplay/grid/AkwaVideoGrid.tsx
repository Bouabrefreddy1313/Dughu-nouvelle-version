"use client"

import { Film, Plus, RefreshCw } from "lucide-react"
import type { AkwaVideo } from "@/types/akwaplay/akwaplay.types"
import AkwaVideoCard from "./AkwaVideoCard"
import AkwaVideoSkeleton from "./AkwaVideoSkeleton"

interface AkwaVideoGridProps {
  videos: AkwaVideo[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  onLoadMore: () => void
  onRetry: () => void
  onPublishClick: () => void
}

const SKELETON_COUNT = 10

export default function AkwaVideoGrid({
  videos,
  loading,
  loadingMore,
  hasMore,
  error,
  onLoadMore,
  onRetry,
  onPublishClick,
}: AkwaVideoGridProps) {
  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <AkwaVideoSkeleton key={i} />
        ))}
      </div>
    )
  }

  /* ── Erreur ── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#2a2a2a" }}
        >
          <RefreshCw size={24} className="text-[#9a9a9a]" />
        </div>
        <p className="text-[#9a9a9a] text-sm max-w-xs">{error}</p>
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-full text-sm font-semibold text-white transition hover:bg-[#985810]"
          style={{ backgroundColor: "#2a2a2a" }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  /* ── Vide ── */
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#2a2a2a" }}
        >
          <Film size={24} className="text-[#9a9a9a]" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Aucune vidéo trouvée</h3>
          <p className="text-[#9a9a9a] text-sm mt-1 max-w-xs">
            Soyez le premier à publier dans cette section !
          </p>
        </div>
        <button
          onClick={onPublishClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: "#985810" }}
        >
          <Plus size={15} />
          Publier une vidéo
        </button>
      </div>
    )
  }

  /* ── Grille ── */
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {videos.map((video) => (
          <AkwaVideoCard key={video.id} video={video} />
        ))}
      </div>

      {/* Charger plus */}
      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-8 py-2.5 rounded-full text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ border: "1px solid #3a3a3a" }}
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                Chargement…
              </span>
            ) : (
              "Charger plus de vidéos"
            )}
          </button>
        </div>
      )}
    </div>
  )
}
