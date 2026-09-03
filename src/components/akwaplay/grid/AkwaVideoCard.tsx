"use client"

import { useRouter } from "next/navigation"
import { Play } from "lucide-react"
import type { AkwaVideo } from "@/types/akwaplay/akwaplay.types"

interface AkwaVideoCardProps {
  video: AkwaVideo
}

export default function AkwaVideoCard({ video }: AkwaVideoCardProps) {
  const router = useRouter()

  const handleVideoClick = () => {
    router.push(`/akwaplay/watch?v=${video.id}`)
  }

  const handleChannelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (video.author.id) {
      router.push(`/akwaplay/channel/${video.author.id}`)
    }
  }

  return (
    <article className="group flex flex-col cursor-pointer" onClick={handleVideoClick}>
      {/* ── Thumbnail ── */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#2a2a2a] shrink-0">
        {video.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          /* Fallback : fond sombre + logo Dughu centré */
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-[#1e1e1e]">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#f5821f" }}
            >
              <Play className="fill-white text-white translate-x-px" size={18} />
            </div>
            <span className="text-[10px] text-[#9a9a9a] font-semibold">Dughu</span>
          </div>
        )}

        {/* Overlay hover subtil */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

        {/* Badge durée */}
        {video.durationFormatted && (
          <span
            className="absolute bottom-1.5 right-1.5 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          >
            {video.durationFormatted}
          </span>
        )}
      </div>

      {/* ── Métadonnées ── */}
      <div className="flex gap-2.5 mt-2.5">
        {/* Avatar auteur */}
        <button
          onClick={handleChannelClick}
          aria-label={`Voir la chaîne de ${video.author.name}`}
          className="shrink-0 mt-0.5"
        >
          {video.author.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.author.avatar}
              alt={video.author.name}
              className="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-[#f5821f] transition"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: "#f5821f" }}
            >
              {video.author.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </button>

        {/* Titre, chaîne, stats */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-[#f5821f] transition-colors">
            {video.title}
          </h3>
          <button
            onClick={handleChannelClick}
            className="block text-xs text-[#9a9a9a] hover:text-white transition-colors mt-1 truncate max-w-full text-left"
          >
            {video.author.name}
          </button>
          <p className="text-xs mt-0.5" style={{ color: "#6a6a6a" }}>
            {video.viewsCount.toLocaleString("fr-FR")} vues
            {video.timeAgo ? ` · ${video.timeAgo}` : ""}
          </p>
        </div>
      </div>
    </article>
  )
}
