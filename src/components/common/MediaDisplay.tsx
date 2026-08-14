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

  // Quand une vidéo est présente, on affiche la vidéo (avec sa miniature en poster
  // si elle est fournie via `image`). Le champ `image` sert alors de thumbnail,
  // pas d'affichage séparé — pas de doublon.
  const isVideo = !!video || !!fileType?.startsWith("video")
  const isImage = !isVideo && (!!image || !!fileType?.startsWith("image"))
  const mediaUrl = video || image

  const handleClick = () => {
    if (mediaUrl && !isVideo) {
      setShowFullscreen(true)
    }
  }

  const startPlayback = (e: React.MouseEvent) => {
    e.stopPropagation()
    setVideoStarted(true)
    // On laisse le navigateur lancer la lecture une fois `controls`/`autoPlay` posés
    // au rendu suivant ; on force aussi un play() explicite pour les navigateurs
    // qui n'auto-jouent pas au premier rendu du même <video>.
    requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => {})
    })
  }

  if (!isImage && !isVideo) return null

  return (
    <>
      <div className={cn("rounded-xl overflow-hidden", className)}>
        {isVideo && video && (
          <div
            className="relative bg-black flex items-center justify-center"
            style={{ minHeight: "110px", maxHeight }}
          >
            <video
              ref={videoRef}
              src={video}
              poster={image || undefined}
              controls={videoStarted}
              autoPlay={videoStarted}
              muted={videoStarted}
              playsInline
              loop
              preload="metadata"
              className="w-full object-cover"
              style={{ maxHeight }}
              onClick={(e) => e.stopPropagation()}
            />
            {!videoStarted && (
              <button
                type="button"
                aria-label="Lire la vidéo"
                onClick={startPlayback}
                className="absolute w-11 h-11 rounded-full bg-white/95 flex items-center justify-center shadow-lg hover:scale-105 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#050505">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}
          </div>
        )}
        {isImage && image && (
          <img
            src={image}
            alt=""
            className="w-full object-cover cursor-pointer"
            style={{ maxHeight }}
            onClick={handleClick}
          />
        )}
      </div>

      {showFullscreen && mediaUrl && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999]" onClick={() => setShowFullscreen(false)}>
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