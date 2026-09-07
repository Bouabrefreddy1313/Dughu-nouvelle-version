"use client"

import { useState, useRef } from "react"
import { Play, ThumbsUp } from "lucide-react"
import type { AkwaShort } from "@/services/akwaplay/akwaplayShort.service"

interface AkwaShortCardProps {
  short: AkwaShort
  onClick: () => void
}

export default function AkwaShortCard({ short, onClick }: AkwaShortCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (videoRef.current && short.videoUrl) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative rounded-2xl overflow-hidden cursor-pointer group shadow-lg border border-[#2a2a2a] hover:border-[#985810]/50 transition-all duration-300 hover:-translate-y-1"
      style={{ aspectRatio: "9/16", backgroundColor: "#181818" }}
    >
      {/* 1. Média de fond : Vidéo ou Thumbnail */}
      {short.videoUrl ? (
        <video
          ref={videoRef}
          src={short.videoUrl}
          preload="metadata"
          muted
          playsInline
          loop
          poster={short.thumbnail || undefined}
          className="w-full h-full object-cover"
        />
      ) : short.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={short.thumbnail}
          alt={short.caption || short.title || "Capsule"}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#222222]">
          <Play size={28} className="text-[#666666]" />
        </div>
      )}

      {/* 2. Gradient sombre pour la lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />



      {/* 4. Bouton Play au centre au survol */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-[#985810]/90 flex items-center justify-center text-white shadow-lg shadow-[#985810]/30 scale-90 group-hover:scale-100 transition-transform">
          <Play size={20} className="fill-white ml-0.5" />
        </div>
      </div>

      {/* 5. Bas de carte : Auteur & Titre */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={short.author?.avatar || "/images/avatar.png"}
            alt={short.author?.name || "Auteur"}
            className="w-5 h-5 rounded-full object-cover ring-1 ring-white/30 shrink-0"
          />
          <span className="text-[11px] font-medium text-white/90 truncate">
            {short.author?.name || "Créateur"}
          </span>
        </div>

        <p className="text-xs font-semibold text-white line-clamp-2 leading-snug">
          {short.caption || short.title || "Capsule sans titre"}
        </p>

        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[#a0a0a0]">
          <span className="flex items-center gap-1">
            <ThumbsUp size={10} />
            <span>{short.likesCount || 0}</span>
          </span>
          {short.timeAgo && <span>• {short.timeAgo}</span>}
        </div>
      </div>
    </div>
  )
}
