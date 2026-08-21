"use client"

// ═══════════════════════════════════════════════════════════════════════════════
// FLASH VIEWER — Visionneuse plein écran des stories Flash d'un utilisateur.
//
// Endpoints utilisés (source de vérité Dughu) :
//   - GET /getUserStories?user_id={userId}&target_user_id={targetUserId}&per_page=…&page=…
//   - GET /media/download?path={filePath} (résolution d'un média fourni en chemin brut)
//
// Navigation : boutons précédent/suivant + zones tap gauche/droite + swipe
// (touchstart/touchend). Les points d'extension (create/delete/view/like/reply)
// ne sont PAS implémentés — voir src/lib/flash-service.ts (endpoints non confirmés).
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserStories } from "@/hooks/queries/use-flash"
import { timeAgo } from "@/lib/helpers"
import { resolveStoryMediaUrl } from "@/lib/dughu"

interface FlashViewerProps {
  targetUserId: string
  userId?: string
  initialIndex?: number
  onClose?: () => void
}

const STORY_INTERVAL_MS = 5000

export default function FlashViewer({ targetUserId, userId, initialIndex = 0, onClose }: FlashViewerProps) {
  const { data, isLoading, isError, refetch } = useUserStories(targetUserId, userId)
  const stories = data?.stories || []

  const [index, setIndex] = useState(initialIndex)
  // Pause manuelle / sur interaction
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const [mediaError, setMediaError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Remet l'index à 0 quand la cible change
  useEffect(() => {
    setIndex(initialIndex)
    setProgress(0)
    setMediaError(false)
    setImageLoaded(false)
    setPaused(false)
  }, [targetUserId, initialIndex])

  const total = stories.length
  const currentIndex = total > 0 ? Math.min(index, total - 1) : 0
  const currentStory = stories[currentIndex] || null

  const goNext = useCallback(() => {
    setIndex((i) => {
      const next = i + 1
      if (next >= total) {
        onClose?.()
        return i
      }
      return next
    })
    setProgress(0)
    setMediaError(false)
    setImageLoaded(false)
  }, [total, onClose])

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
    setProgress(0)
    setMediaError(false)
    setImageLoaded(false)
  }, [])

  // Défilement automatique (progress bar) quand non en pause
  useEffect(() => {
    if (paused || total <= 1 || isError || isLoading || !currentStory) return
    const step = 50
    const id = setInterval(() => {
      setProgress((p) => {
        const next = p + (step / STORY_INTERVAL_MS) * 100
        if (next >= 100) {
          clearInterval(id)
          goNext()
          return 0
        }
        return next
      })
    }, step)
    return () => clearInterval(id)
  }, [paused, total, isError, isLoading, currentStory, goNext])

  // Navigation au clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext() }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev() }
      else if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goNext, goPrev, onClose])

  const mediaUrl = currentStory?.image || currentStory?.video || ""
  const isVideo = !!currentStory?.video && !currentStory?.image
  const safeMediaUrl = mediaError ? "" : mediaUrl ? resolveStoryMediaUrl(mediaUrl) : ""

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-white/80" />
        <p className="text-white/70 text-sm">Chargement des Flash…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center gap-3 px-8 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-white/80 text-sm">Impossible de charger les Flash.</p>
        <button type="button" onClick={() => refetch()} className="text-[#F2B183] text-sm font-semibold underline underline-offset-2">
          Réessayer
        </button>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white p-2">
          <X size={24} />
        </button>
      </div>
    )
  }

  // État vide : aucune story pour cet utilisateur
  if (!currentStory || total === 0) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-white/80 text-sm">Aucun Flash à afficher pour le moment.</p>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white p-2">
          <X size={24} />
        </button>
        <button type="button" onClick={onClose} className="mt-2 text-[#F2B183] text-sm font-semibold underline underline-offset-2">
          Fermer
        </button>
      </div>
    )
  }


  return (
    <div
      className="fixed inset-0 z-[60] bg-black flex flex-col"
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; setPaused(true) }}
      onTouchEnd={(e) => {
        if (touchStartX.current !== null) {
          const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
          if (Math.abs(dx) > 50) (dx < 0 ? goNext() : goPrev())
        }
        touchStartX.current = null
        setPaused(false)
      }}
    >
      {/* Barres de progression */}
      <div className="flex gap-1 p-2 pt-4">
        {stories.map((_: any, i: number) => (
          <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full bg-white transition-all duration-150",
                i < currentIndex ? "w-full" : i === currentIndex ? "w-full" : "w-0"
              )}
              style={i === currentIndex ? { width: `${progress}%` } : undefined}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white/20 border border-white/40 ring-1 ring-white/50">
            {currentStory?.user?.avatar ? (
              <Image src={currentStory.user.avatar} alt={currentStory.user.name || ""} width={36} height={36} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold bg-[#A35A2A]">
                {currentStory?.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-white text-sm font-medium leading-tight">{currentStory?.user?.name || "Flash"}</span>
            <span className="text-white/60 text-xs">{timeAgo(currentStory?.createdAt || "")}</span>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="text-white/80 hover:text-white p-2">
          <X size={24} />
        </button>
      </div>

      {/* Contenu média / texte */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {isVideo ? (
          <video src={safeMediaUrl} className="max-w-full max-h-full object-contain rounded-lg" controls autoPlay onError={() => setMediaError(true)} />
        ) : safeMediaUrl ? (
          <>
            {!imageLoaded && !mediaError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-[#F2B183] animate-spin" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safeMediaUrl}
              alt=""
              className={cn(
                "max-w-full max-h-full object-contain rounded-lg transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setMediaError(true)
                setImageLoaded(false)
              }}
            />
          </>
        ) : currentStory?.text ? (
          <div className="w-full h-full flex items-center justify-center rounded-2xl p-8 text-center" style={{ background: currentStory?.bg || "linear-gradient(45deg,#ff9a9e 0%,#fecfef 100%)" }}>
            <p className="text-2xl font-bold text-white whitespace-pre-wrap max-w-2xl">{currentStory.text}</p>
          </div>
        ) : (
          <p className="text-white/60 text-sm">Flash sans contenu visible.</p>
        )}
      </div>

      {/* Navigation gauche/droite */}
      <button type="button" onClick={goPrev} aria-label="Précédent" className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2">
        <ChevronLeft size={30} />
      </button>
      <button type="button" onClick={goNext} aria-label="Suivant" className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2">
        <ChevronRight size={30} />
      </button>
    </div>
  )
}

