"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"

interface MediaDisplayProps {
  image?: string | null
  video?: string | null
  fileType?: string | null
  className?: string
  maxHeight?: string
}

export function MediaDisplay({ image, video, fileType, className, maxHeight = "180px" }: MediaDisplayProps) {
  const [videoStarted, setVideoStarted] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Quand une vidéo est présente, on affiche UNIQUEMENT la vidéo : le thumbnail
  // (première image / champ image des commentaires Dughu) n'est jamais affiché.
  // Un bouton de lecture est affiché tant que l'utilisateur n'a pas cliqué.
  const isVideo = !!video || !!fileType?.startsWith("video")
  const isImage = !isVideo && (!!image || !!fileType?.startsWith("image"))
  const mediaUrl = video || image

  const handleClick = () => {
    if (mediaUrl) {
      setShowFullscreen(true)
    }
  }

  if (!isImage && !isVideo) return null

  return (
    <>
      <div className={cn("rounded-xl overflow-hidden cursor-pointer", className)} onClick={handleClick}>
        {isVideo && video && !videoStarted && (
          <div
            className="relative flex items-center justify-center bg-black"
            style={{ minHeight: "110px", maxHeight }}
          >
            <button
              type="button"
              aria-label="Lire la vidéo"
              onClick={(e) => {
                e.stopPropagation()
                setVideoStarted(true)
              }}
              className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center shadow-lg hover:scale-105 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#050505">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        )}
        {isVideo && video && videoStarted && (
          <video
            ref={videoRef}
            src={video}
            controls
            autoPlay
            muted
            playsInline
            loop
            preload="none"
            className="w-full object-cover bg-black"
            style={{ maxHeight }}
          />
        )}
        {isImage && image && (
          <img
            src={image}
            alt=""
            className="w-full object-cover"
            style={{ maxHeight }}
          />
        )}
      </div>

      {showFullscreen && mediaUrl && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999]" onClick={() => setShowFullscreen(false)}>
          {isVideo && video && (
            <video
              src={video}
              controls
              autoPlay
              className="max-w-full max-h-full object-contain"
            />
          )}
          {isImage && image && (
            <img src={image} alt="" className="max-w-full max-h-full object-contain" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setShowFullscreen(false) }}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition"
            aria-label="Fermer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}