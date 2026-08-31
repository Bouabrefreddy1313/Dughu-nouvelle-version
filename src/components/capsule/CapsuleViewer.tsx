"use client"

import { useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react"
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Flag,
  MessageCircle,
  MoreVertical,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserCircle2,
  X,
  Bookmark,
} from "lucide-react"
import Avatar from "@/components/common/Avatar"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import CapsuleComments from "./CapsuleComments"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Capsule } from "@/lib/capsule-service"
import {
  deleteCapsuleClient,
  logCapsuleViewClient,
  reportCapsuleClient,
  toggleCapsuleDislikeClient,
  toggleCapsuleLikeClient,
} from "@/hooks/queries/use-capsules"

interface CapsuleViewerProps {
  capsules: Capsule[]
  startIndex?: number
  userId?: string
  currentUserId?: string
  onClose: () => void
  onCapsuleDeleted?: (capsuleId: string) => void
}

interface ActionButtonsProps {
  capsule: Capsule
  userId?: string
  /** Nombre de « j'aime » actuel (peut être mis à jour après une réaction). */
  likesCount: number
  /** Nombre de commentaires actuel (peut être mis à jour après un ajout). */
  commentsCount: number
  likedIds: Set<string>
  dislikedIds: Set<string>
  reportedIds: Set<string>
  isMine: boolean
  menuOpen: boolean
  compact?: boolean
  onToggleLike: () => void
  onToggleDislike: () => void
  onOpenComments: () => void
  onToggleMenu: () => void
  onReport: () => void
  onDeleteRequest: () => void
}

function timeAgo(value: string) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  const difference = Math.floor((Date.now() - date.getTime()) / 1000)

  if (difference < 60) return "à l'instant"
  if (difference < 3600) return `il y a ${Math.floor(difference / 60)} min`
  if (difference < 86400) return `il y a ${Math.floor(difference / 3600)} h`

  return `il y a ${Math.floor(difference / 86400)} j`
}

function ActionButtons({
  capsule,
  userId,
  likesCount,
  commentsCount,
  likedIds,
  dislikedIds,
  reportedIds,
  isMine,
  menuOpen,
  compact = false,
  onToggleLike,
  onToggleDislike,
  onOpenComments,
  onToggleMenu,
  onReport,
  onDeleteRequest,
}: ActionButtonsProps) {
  const buttonClass = compact
    ? "rounded-full p-2.5"
    : "rounded-full p-2 transition-colors hover:bg-white/10"

  return (
    <div
      className={cn(
        "flex flex-col items-center",
        compact ? "gap-3 text-white" : "gap-4 text-white"
      )}
    >
      <button
        type="button"
        onClick={onToggleLike}
        disabled={!userId}
        aria-label="J'aime"
        className="flex flex-col items-center gap-1 disabled:opacity-50"
      >
        <span
          className={cn(
            buttonClass,
            capsule.isLiked || likedIds.has(capsule.id)
              ? "bg-[#1877F2]"
              : "bg-transparent"
          )}
        >
          <ThumbsUp size={compact ? 22 : 24} strokeWidth={2} />
        </span>

        <span className="text-[11px] font-semibold text-white">{likesCount}</span>
      </button>

      <button
        type="button"
        onClick={onToggleDislike}
        disabled={!userId}
        aria-label="Je n'aime pas"
        className="flex flex-col items-center gap-1 disabled:opacity-50"
      >
        <span
          className={cn(
            buttonClass,
            capsule.isDisliked || dislikedIds.has(capsule.id)
              ? "bg-white/20"
              : "bg-transparent"
          )}
        >
          <ThumbsDown size={compact ? 22 : 24} strokeWidth={2} />
        </span>

        <span className="text-[11px] font-semibold text-white">{capsule.dislikesCount}</span>
      </button>

      <button
        type="button"
        onClick={onOpenComments}
        aria-label="Commentaires"
        className="flex flex-col items-center gap-1"
      >
        <span className={buttonClass}>
          <MessageCircle size={compact ? 22 : 24} strokeWidth={2} />
        </span>

        <span className="text-[11px] font-semibold text-white">{commentsCount}</span>
      </button>

      <span className="flex flex-col items-center gap-1">
        <span className={buttonClass}>
          <Eye size={compact ? 22 : 24} strokeWidth={2} />
        </span>

        <span className="text-[11px] font-semibold text-white">{capsule.viewsCount}</span>
      </span>

      <div className="relative">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Plus d'actions"
          aria-expanded={menuOpen}
          className={buttonClass}
        >
          <MoreVertical size={compact ? 22 : 24} strokeWidth={2} />
        </button>

        {menuOpen && (
          <div
            className={cn(
              "absolute z-50 w-48 overflow-hidden rounded-xl bg-white shadow-2xl",
              compact
                ? "bottom-12 right-0"
                : "right-12 top-0"
            )}
          >
            {isMine ? (
              <button
                type="button"
                onClick={onDeleteRequest}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            ) : (
              <button
                type="button"
                onClick={onReport}
                disabled={reportedIds.has(capsule.id)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                <Flag size={16} />
                {reportedIds.has(capsule.id)
                  ? "Déjà signalée"
                  : "Signaler"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CapsuleViewer({
  capsules,
  startIndex = 0,
  userId,
  currentUserId,
  onClose,
  onCapsuleDeleted,
}: CapsuleViewerProps) {
  const [index, setIndex] = useState(
    Math.min(
      Math.max(startIndex, 0),
      Math.max(capsules.length - 1, 0)
    )
  )
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set())
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  // Surcharge locale du nombre de « j'aime » par capsule (incrémenté au clic).
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  // Surcharge locale du nombre de commentaires par capsule (incrémenté à l'ajout).
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Capsule | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Point de départ du glissement tactile (mobile) pour la navigation verticale.
  const touchStartY = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)

  const capsule = capsules[index]

  const goNext = useCallback(() => {
    setIndex((currentIndex) =>
      Math.min(currentIndex + 1, capsules.length - 1)
    )
  }, [capsules.length])

  const goPrevious = useCallback(() => {
    setIndex((currentIndex) => Math.max(currentIndex - 1, 0))
  }, [])

  // ── Navigation tactile (mobile) ─────────────────────────────────────────────
  // Un glissement vertical (style Reels) change de capsule : vers le haut =
  // capsule suivante, vers le bas = capsule précédente. Les gestes démarrant
  // sur un élément interactif (bouton, lien, champ…) sont ignorés pour ne pas
  // gêner le tap.
  const onTouchStart = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const target = event.target
    if (
      target instanceof Element &&
      target.closest("button, a, input, textarea, select, [role='button'], [role='link']")
    ) {
      touchStartY.current = null
      touchStartX.current = null
      return
    }
    const touch = event.touches[0]
    if (!touch) return
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
  }, [])

  const onTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLElement>) => {
      if (touchStartY.current === null) return
      const startX = touchStartX.current ?? 0
      const startY = touchStartY.current
      touchStartX.current = null
      touchStartY.current = null
      const touch = event.changedTouches[0]
      if (!touch) return
      const deltaY = touch.clientY - startY
      const deltaX = touch.clientX - startX
      // Geste quasi vertical (|dy| > |dx|) au-delà de 60 px = navigation.
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) >= 60) {
        if (deltaY < 0) goNext()
        else goPrevious()
      }
    },
    [goNext, goPrevious]
  )

  useEffect(() => {
    if (!capsule || viewedIds.has(capsule.id)) return

    setViewedIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.add(capsule.id)
      return nextIds
    })

    void logCapsuleViewClient({
      capsuleId: capsule.id,
      userId,
    })
  }, [capsule, userId, viewedIds])

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }

      if (event.key === "ArrowDown") {
        goNext()
      }

      if (event.key === "ArrowUp") {
        goPrevious()
      }
    }

    window.addEventListener("keydown", handleKeyboard)

    return () => {
      window.removeEventListener("keydown", handleKeyboard)
    }
  }, [goNext, goPrevious, onClose])

  useEffect(() => {
    setMenuOpen(false)
    setCommentsOpen(false)
    videoRef.current?.play().catch(() => undefined)
  }, [index])

  const toggleLike = async () => {
    if (!capsule || !userId || likedIds.has(capsule.id)) return

    setLikedIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.add(capsule.id)
      return nextIds
    })

    // Incrément optimiste du compteur (valeur de base + 1)
    setLikeCounts((prev) => ({
      ...prev,
      [capsule.id]: (prev[capsule.id] ?? capsule.likesCount) + 1,
    }))

    try {
      await toggleCapsuleLikeClient({
        capsuleId: capsule.id,
        userId,
      })
    } catch (error) {
      setLikedIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(capsule.id)
        return nextIds
      })

      // Rollback du compteur
      setLikeCounts((prev) => ({
        ...prev,
        [capsule.id]: Math.max(0, (prev[capsule.id] ?? capsule.likesCount) - 1),
      }))

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer votre réaction."
      )
    }
  }

  const toggleDislike = async () => {
    if (!capsule || !userId || dislikedIds.has(capsule.id)) return

    setDislikedIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.add(capsule.id)
      return nextIds
    })

    try {
      await toggleCapsuleDislikeClient({
        capsuleId: capsule.id,
        userId,
      })
    } catch {
      setDislikedIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(capsule.id)
        return nextIds
      })

      toast.error("Impossible d'enregistrer votre réaction.")
    }
  }

  const handleReport = async () => {
    if (!capsule || !userId || reportedIds.has(capsule.id)) return

    setMenuOpen(false)

    setReportedIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.add(capsule.id)
      return nextIds
    })

    try {
      await reportCapsuleClient({
        capsuleId: capsule.id,
        userId,
        reason: "Signalement utilisateur",
      })

      toast.success("Capsule signalée. Merci.")
    } catch (error) {
      setReportedIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(capsule.id)
        return nextIds
      })

      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de signaler cette capsule."
      )
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      await deleteCapsuleClient(deleteTarget.id)

      toast.success("Capsule supprimée.")

      onCapsuleDeleted?.(deleteTarget.id)
      setDeleteTarget(null)

      if (capsules.length <= 1) {
        onClose()
        return
      }

      setIndex((currentIndex) =>
        Math.min(currentIndex, capsules.length - 2)
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer cette capsule."
      )
    }
  }

  if (!capsule) return null

  const isMine =
    Boolean(currentUserId) &&
    String(capsule.author?.id) === String(currentUserId)

  const actionButtonsProps: ActionButtonsProps = {
    capsule,
    userId,
    likesCount: likeCounts[capsule.id] ?? capsule.likesCount,
    commentsCount: commentCounts[capsule.id] ?? capsule.commentsCount,
    likedIds,
    dislikedIds,
    reportedIds,
    isMine,
    menuOpen,
    onToggleLike: toggleLike,
    onToggleDislike: toggleDislike,
    onOpenComments: () => setCommentsOpen(true),
    onToggleMenu: () => setMenuOpen((isOpen) => !isOpen),
    onReport: handleReport,
    onDeleteRequest: () => {
      setMenuOpen(false)
      setDeleteTarget(capsule)
    },
  }

  const handleCommentAdded = useCallback(() => {
    if (!capsule) return
    setCommentCounts((prev) => ({
      ...prev,
      [capsule.id]: (prev[capsule.id] ?? capsule.commentsCount) + 1,
    }))
  }, [capsule])

  return (
    <div
      className="fixed inset-0 z-[90] flex overflow-hidden overscroll-none bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse de capsules"
    >
      <aside className="hidden w-[220px] shrink-0 flex-col px-3 pt-5 text-white lg:flex">
        <h2 className="mb-5 px-2 text-[21px] font-bold">Capsules</h2>

        <button
          type="button"
          className="flex items-center gap-3 rounded-lg bg-[#242424] px-3 py-3 text-left text-[15px] font-semibold transition-colors hover:bg-[#303030]"
        >
          <Sparkles size={19} />
          Pour vous
        </button>

        <button
          type="button"
          className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] text-white/85 transition-colors hover:bg-[#1c1c1c]"
        >
          <Bookmark size={19} />
          Suivi(e)s
        </button>

       
      </aside>

      <main
        ref={containerRef}
        className="relative flex min-w-0 flex-1 touch-none items-center justify-center gap-4 px-3 sm:px-5 lg:gap-5"
        onWheel={(event) => {
          if (event.deltaY > 30) goNext()
          if (event.deltaY < -30) goPrevious()
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la visionneuse"
          className="absolute left-4 top-4 z-30 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-white/20 lg:left-6 lg:top-5"
        >
          <X size={21} />
        </button>

        <div className="relative flex h-[calc(100dvh-28px)] max-h-[760px] w-[min(86vw,680px)] min-w-0 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black">
          {capsule.video ? (
            <video
              ref={videoRef}
              key={capsule.id}
              src={capsule.video}
              poster={capsule.thumbnail || undefined}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-contain"
            />
          ) : capsule.thumbnail ? (
            <img
              src={capsule.thumbnail}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#151515]">
              <p className="text-sm text-white/60">
                Capsule sans média
              </p>
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
            aria-hidden
          />

          <div className="absolute bottom-6 left-5 right-20 z-10 text-white sm:left-6">
            <div className="flex items-center gap-3">
              <Avatar
                src={capsule.author?.avatar || undefined}
                name={capsule.author?.name || "Utilisateur"}
                size="sm"
                className="h-9 w-9 shrink-0 border-2 border-white"
              />

              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold">
                  {capsule.author?.name || "Utilisateur"}
                </p>

                <p className="text-[11px] text-white/75">
                  {timeAgo(capsule.createdAt)}
                </p>
              </div>
            </div>

            {capsule.caption && (
              <p className="mt-2 line-clamp-3 max-w-[460px] whitespace-pre-wrap break-words text-[13px] text-white/95">
                {capsule.caption}
              </p>
            )}
          </div>

          <div className="absolute bottom-20 right-3 z-20 lg:hidden">
            <ActionButtons
              {...actionButtonsProps}
              compact
            />
          </div>
        </div>

        <div className="hidden shrink-0 items-center lg:flex">
          <ActionButtons {...actionButtonsProps} />
        </div>

        <div className="hidden shrink-0 flex-col gap-4 lg:flex">
          <button
            type="button"
            onClick={goPrevious}
            disabled={index === 0}
            aria-label="Capsule précédente"
            className="rounded-full border-2 border-white/40 bg-black/40 p-2 text-white transition-colors hover:border-white/80 hover:bg-white/10 disabled:opacity-25"
          >
            <ChevronUp size={23} />
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={index === capsules.length - 1}
            aria-label="Capsule suivante"
            className="rounded-full border-2 border-white/40 bg-black/40 p-2 text-white transition-colors hover:border-white/80 hover:bg-white/10 disabled:opacity-25"
          >
            <ChevronDown size={23} />
          </button>
        </div>
      </main>

      {commentsOpen && (
        <section className="absolute inset-x-0 bottom-0 z-40 h-[76%] overflow-hidden rounded-t-3xl bg-white shadow-2xl lg:static lg:h-full lg:w-[380px] lg:shrink-0 lg:rounded-none">
          <CapsuleComments
            capsuleId={capsule.id}
            userId={userId}
            onClose={() => setCommentsOpen(false)}
            onCommentAdded={handleCommentAdded}
          />
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Supprimer la capsule ?"
        description="Cette action est irréversible. Voulez-vous vraiment supprimer cette capsule ?"
        confirmLabel="Supprimer"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
