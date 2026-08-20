"use client"

import { useState } from "react"
import { Film, X, Play } from "lucide-react"
import Card from "@/components/common/Card"
import { resolveMediaUrl } from "@/lib/dughu"

export interface ProfileVideo {
  id: string
  url?: string | null
  thumb?: string | null
  views?: number
  createdAt?: string
}

interface ProfileVideosProps {
  videos?: ProfileVideo[]
  onSeeAll?: () => void
}

function VideoThumb({ src }: { src: string }) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div className="w-full h-full bg-[#F0F0F0] flex items-center justify-center">
        <Film size={20} className="text-[#B0B0B0]" />
      </div>
    )
  }

  return (
    <video
      src={src}
      muted
      playsInline
      preload="metadata"
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  )
}

export function ProfileVideos({ videos = [], onSeeAll }: ProfileVideosProps) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  const resolvedVideos = videos.map((v) => ({
    ...v,
    resolvedUrl: v.url ? resolveMediaUrl(v.url) : null,
  }))

  const visible = resolvedVideos.slice(0, 9)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[16px] font-bold text-[#2D2D2D] flex items-center gap-2">
          <Film size={16} className="text-[#A35A2A]" />
          Vidéos
        </h3>
        {onSeeAll && visible.length > 0 && (
          <button
            onClick={onSeeAll}
            className="text-[12px] font-semibold text-[#A35A2A] hover:underline"
          >
            Voir toutes les vidéos
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-[#65676B]">Aucune vidéo pour le moment.</div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {visible.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setLightbox(i)}
              className="relative aspect-square overflow-hidden hover:opacity-90 transition rounded-md bg-black"
              aria-label="Voir la vidéo"
            >
              <VideoThumb src={v.resolvedUrl || ""} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                  <Play size={16} className="text-white fill-white ml-0.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {lightbox !== null && visible[lightbox] && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            aria-label="Fermer"
          >
            <X size={28} />
          </button>
          <div className="max-w-full max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <video src={visible[lightbox].resolvedUrl || ""} controls autoPlay className="w-full max-h-[85vh] rounded-xl bg-black" />
          </div>
        </div>
      )}
    </Card>
  )
}
