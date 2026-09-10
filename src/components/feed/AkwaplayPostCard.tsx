"use client"

import { useState } from "react"
import Link from "next/link"
import { Play, X, ThumbsUp, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/helpers"

export interface AkwaplayPostCardProps {
  id?: string | number
  videoId: string | number
  title: string
  description?: string | null
  thumbnail: string
  duration?: string | number | null
  likesCount?: number
  viewsCount?: number
  avatar?: string | null
  headerText?: string
  onDismiss?: () => void
  className?: string
  author?: any
}

function formatDurationDisplay(dur: string | number | null | undefined): string {
  if (!dur) return "00:00"
  if (typeof dur === "string") {
    if (dur.includes(":")) return dur
    const parsed = Number(dur)
    if (isNaN(parsed)) return dur
    dur = parsed
  }
  const total = Math.max(0, Math.floor(dur))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function AkwaplayPostCard({
  videoId,
  title,
  description,
  thumbnail,
  duration,
  likesCount = 0,
  viewsCount = 0,
  headerText = "Akwaplay · Suggestion pour vous",
  onDismiss,
  className,
  author,
}: AkwaplayPostCardProps) {
  const isVideoThumb = typeof thumbnail === "string" && /\.(mp4|webm|mkv|mov|m3u8)(\?|#|$)/i.test(thumbnail)
  const [currentThumb, setCurrentThumb] = useState(!isVideoThumb && thumbnail ? thumbnail : "/images/default-thumbnail.jpg")
  const [thumbError, setThumbError] = useState(false)
  const watchUrl = `/akwaplay/watch?v=${encodeURIComponent(String(videoId))}`
  const formattedDuration = formatDurationDisplay(duration)
  const authorAvatar = author?.avatar || "/images/avatar.png"

  const handleThumbError = () => {
    if (currentThumb !== "/images/default-thumbnail.jpg") {
      setCurrentThumb("/images/default-thumbnail.jpg")
    } else {
      setThumbError(true)
    }
  }

  return (
    <article
      className={cn(
        "bg-white border-b border-gray-100 sm:rounded-3xl sm:shadow-sm sm:border sm:border-gray-100 overflow-hidden transition duration-200",
        className
      )}
    >
      {/* ── Header de la carte ── */}
      <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo Akwaplay — toujours affiché */}
          <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 overflow-hidden flex items-center justify-center shrink-0 p-1">
            <img
              src="/images/akp.png"
              alt="Akwaplay"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/images/icon/akp.png"
              }}
            />
          </div>
          <div className="min-w-0">
            <h4 className="text-[14px] sm:text-[15px] font-semibold text-gray-900 truncate">
              {headerText}
            </h4>
            <p className="text-[12px] text-gray-500 truncate">
              {author?.name || author?.username ? `Par ${author.name || author.username}` : "Vidéo recommandée sur Akwaplay"}
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fermer la suggestion"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition shrink-0 ml-2"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Zone Vidéo ── */}
      <div className="px-3 sm:px-4">
        <Link
          href={watchUrl}
          className="relative block w-full aspect-video rounded-2xl overflow-hidden bg-gray-900 group cursor-pointer shadow-inner"
        >
          {!thumbError ? (
            <img
              src={currentThumb}
              alt={title}
              onError={handleThumbError}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-neutral-800 to-neutral-900 text-gray-400">
              <Play size={40} className="text-gray-500 mb-2" />
              <span className="text-xs">Aperçu vidéo</span>
            </div>
          )}

          {/* Bouton Play circulaire centré */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/55 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-xl group-hover:scale-110 group-hover:bg-[#A35A2A] transition-all duration-200">
              <Play size={24} className="fill-white translate-x-0.5" />
            </div>
          </div>

          {/* Badge de durée en bas à droite */}
          {formattedDuration && (
            <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md tracking-wider">
              {formattedDuration}
            </div>
          )}
        </Link>
      </div>

      {/* ── Zone Infos ── */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="space-y-1">
          <Link href={watchUrl} className="block group">
            <h3 className="font-bold text-gray-900 text-[15px] sm:text-[16px] leading-snug line-clamp-1 group-hover:text-[#A35A2A] transition">
              {title}
            </h3>
          </Link>
          {description && (
            <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Ligne de statistiques */}
        <div className="flex items-center gap-4 text-[13px] text-gray-600 font-medium pt-0.5">
          <div className="flex items-center gap-1.5">
            <ThumbsUp size={15} className="text-[#A35A2A]" />
            <span>{formatNumber(likesCount)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye size={15} className="text-gray-500" />
            <span>{formatNumber(viewsCount)} vue{viewsCount > 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* ── Bouton CTA ── */}
        <div className="pt-1">
          <Link
            href={watchUrl}
            className="w-full bg-[#A35A2A] hover:bg-[#8C4B20] active:scale-[0.99] text-white font-semibold py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition duration-200 shadow-sm"
          >
            <Play size={17} className="fill-white" />
            <span className="text-[14px] sm:text-[15px]">Regarder sur Akwaplay</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
