"use client"

// ── CapsuleCard — vignette verticale d'une capsule (format 9:16) ────────────
// Utilisée dans le rail du fil d'actualité (3 capsules aléatoires) et dans la
// grille de la page /capsules. Un clic ouvre la visionneuse plein écran.

import { useRef } from "react"
import { Play, Eye } from "lucide-react"
import Avatar from "@/components/common/Avatar"
import { cn } from "@/lib/utils"
import type { Capsule } from "@/lib/capsule-service"

interface CapsuleCardProps {
  capsule: Capsule
  onOpen: (capsule: Capsule) => void
  className?: string
}

export default function CapsuleCard({ capsule, onOpen, className }: CapsuleCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const formatViews = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : String(n)

  // Lecture automatique au survol / au focus (vidéo muette)
  const startVideo = () => {
    const vid = videoRef.current
    if (!vid) return
    const p = vid.play()
    if (p) p.catch(() => {}) // blocage autoplay ignoré silencieusement
  }
  const stopVideo = () => {
    videoRef.current?.pause()
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(capsule)}
      onMouseEnter={startVideo}
      onMouseLeave={stopVideo}
      onFocus={startVideo}
      onBlur={stopVideo}
      aria-label={`Voir la capsule de ${capsule.author?.name || "utilisateur"}`}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl bg-gray-900 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#985810]",
        "aspect-[9/16]",
        className
      )}
    >
      {/* Vidéo : affichée et jouée au survol / au focus (masquée si une
          miniature existe et que la souris/clavier ne survole pas la carte) */}
      {capsule.video && (
        <video
          ref={videoRef}
          src={capsule.video}
          muted
          loop
          playsInline
          preload="metadata"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            capsule.thumbnail && "opacity-0 group-hover:opacity-100 group-focus:opacity-100"
          )}
        />
      )}

      {/* Miniature : remplacée par la vidéo au survol */}
      {capsule.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={capsule.thumbnail}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:scale-105",
            capsule.video && "group-hover:opacity-0 group-focus:opacity-0"
          )}
          loading="lazy"
        />
      ) : !capsule.video ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#985810]/40 to-[#7d480d]/60">
          <Play className="h-10 w-10 text-white/80" aria-hidden />
        </div>
      ) : null}

      {/* Voile dégradé pour la lisibilité */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent" aria-hidden />

      {/* Badge vue */}
      {capsule.viewsCount > 0 && (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
          <Eye size={12} aria-hidden />
          {formatViews(capsule.viewsCount)}
        </span>
      )}

      {/* Auteur + légende */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-2.5">
        <Avatar
          src={capsule.author?.avatar || undefined}
          name={capsule.author?.name || "Utilisateur"}
          size="sm"
          className="h-8 w-8 shrink-0 border-2 border-white/80"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-white">
            {capsule.author?.name || "Utilisateur"}
          </p>
          {capsule.caption && (
            <p className="truncate text-[11px] text-white/80">{capsule.caption}</p>
          )}
        </div>
      </div>
    </button>
  )
}
