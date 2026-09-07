"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  X,
  ChevronUp,
  ChevronDown,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Send,
  Trash2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import type { AkwaShort, AkwaShortComment } from "@/services/akwaplay/akwaplayShort.service"
import {
  fetchShortComments,
  storeShortComment,
  deleteShortComment,
  toggleShortLikeDislike,
  trackShortView,
  destroyShort,
} from "@/services/akwaplay/akwaplayShort.service"

interface AkwaShortViewerModalProps {
  shorts: AkwaShort[]
  initialIndex?: number
  currentUserId?: string | number
  onClose: () => void
  onDeleteShort?: (shortId: string | number) => void
  onShortUpdated?: (short: AkwaShort) => void
}

export default function AkwaShortViewerModal({
  shorts,
  initialIndex = 0,
  currentUserId,
  onClose,
  onDeleteShort,
  onShortUpdated,
}: AkwaShortViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [showComments, setShowComments] = useState(false)

  // Commentaires
  const [comments, setComments] = useState<AkwaShortComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  // États locaux des shorts (likes, compteurs)
  const [localShorts, setLocalShorts] = useState<AkwaShort[]>(shorts)

  const videoRef = useRef<HTMLVideoElement>(null)
  const currentShort = localShorts[currentIndex]

  // Synchronisation avec les props
  useEffect(() => {
    setLocalShorts(shorts)
  }, [shorts])

  // Changement de short -> Enregistrement vue + Reset lecture
  useEffect(() => {
    if (!currentShort) return
    setIsPlaying(true)
    if (currentUserId && currentShort.id) {
      trackShortView(currentShort.id, currentUserId)
    }
  }, [currentIndex, currentShort, currentUserId])

  // Gestion lecture vidéo
  useEffect(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.pause()
    }
  }, [isPlaying, currentIndex])

  // Chargement des commentaires quand le tiroir s'ouvre
  const loadComments = useCallback(async () => {
    if (!currentShort) return
    setCommentsLoading(true)
    try {
      const data = await fetchShortComments(currentShort.id, currentUserId || "31262")
      setComments(data)
    } catch {
      toast.error("Impossible de charger les commentaires.")
    } finally {
      setCommentsLoading(false)
    }
  }, [currentShort, currentUserId])

  useEffect(() => {
    if (showComments) {
      loadComments()
    }
  }, [showComments, loadComments])

  // Navigation vers short suivant/précédent
  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setShowComments(false)
    }
  }, [currentIndex])

  const goToNext = useCallback(() => {
    if (currentIndex < localShorts.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setShowComments(false)
    }
  }, [currentIndex, localShorts.length])

  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault()
        goToPrev()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        goToNext()
      } else if (e.key === "Escape") {
        onClose()
      } else if (e.key === " ") {
        e.preventDefault()
        setIsPlaying((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToPrev, goToNext, onClose])

  if (!currentShort) return null

  // ── Actions ──

  const handleToggleLike = async () => {
    if (!currentUserId) {
      toast.error("Veuillez vous connecter pour aimer cette capsule.")
      return
    }

    const prevLiked = currentShort.isLiked
    const prevCount = currentShort.likesCount || 0
    const nextLiked = !prevLiked
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1)

    const optimisticShort = {
      ...currentShort,
      isLiked: nextLiked,
      likesCount: nextCount,
    }

    // Mise à jour optimiste locale et parente
    setLocalShorts((prev) =>
      prev.map((s, idx) => (idx === currentIndex ? optimisticShort : s))
    )
    onShortUpdated?.(optimisticShort)

    try {
      const res = await toggleShortLikeDislike(currentShort.id, currentUserId, "like")
      if (res.success) {
        const serverLiked = res.isLiked
        const serverCount = res.likesCount !== undefined ? res.likesCount : nextCount
        const confirmedShort = {
          ...currentShort,
          isLiked: serverLiked,
          likesCount: serverCount,
        }
        setLocalShorts((prev) =>
          prev.map((s, idx) => (idx === currentIndex ? confirmedShort : s))
        )
        onShortUpdated?.(confirmedShort)
      }
    } catch {
      // Revert en cas d'erreur
      const revertedShort = {
        ...currentShort,
        isLiked: prevLiked,
        likesCount: prevCount,
      }
      setLocalShorts((prev) =>
        prev.map((s, idx) => (idx === currentIndex ? revertedShort : s))
      )
      onShortUpdated?.(revertedShort)
      toast.error("Erreur lors de la mise à jour de la réaction.")
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/akwaplay/shorts?shortId=${currentShort.id}`
    navigator.clipboard.writeText(url)
    toast.success("Lien de la capsule copié dans le presse-papiers !")
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUserId || commentSubmitting) return

    setCommentSubmitting(true)
    try {
      const res = await storeShortComment(currentShort.id, newComment.trim(), currentUserId)
      if (res.success && res.comment) {
        setComments((prev) => [res.comment!, ...prev])
        setNewComment("")
        setLocalShorts((prev) =>
          prev.map((s, idx) =>
            idx === currentIndex ? { ...s, commentsCount: (s.commentsCount || 0) + 1 } : s
          )
        )
        toast.success("Commentaire envoyé !")
      } else {
        await loadComments()
        setNewComment("")
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'envoi du commentaire.")
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string | number) => {
    if (!currentUserId) return
    try {
      await deleteShortComment(commentId, currentUserId)
      setComments((prev) => prev.filter((c) => String(c.id) !== String(commentId)))
      setLocalShorts((prev) =>
        prev.map((s, idx) =>
          idx === currentIndex ? { ...s, commentsCount: Math.max(0, (s.commentsCount || 0) - 1) } : s
        )
      )
      toast.success("Commentaire supprimé.")
    } catch {
      toast.error("Impossible de supprimer le commentaire.")
    }
  }

  const handleDeleteShort = async () => {
    if (!currentUserId) return
    if (!confirm("Voulez-vous vraiment supprimer cette capsule ?")) return

    try {
      await destroyShort(currentShort.id, currentUserId)
      toast.success("Capsule supprimée avec succès.")
      onDeleteShort?.(currentShort.id)
      if (localShorts.length <= 1) {
        onClose()
      } else {
        goToNext()
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression.")
    }
  }

  const isAuthor =
    currentUserId && String(currentShort.author?.id) === String(currentUserId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
      {/* Bouton Fermer */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-30 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
        title="Fermer (Échap)"
      >
        <X size={22} />
      </button>

      {/* Conteneur principal centré */}
      <div className="relative flex items-center justify-center h-full max-h-[95vh] w-full max-w-5xl px-4 gap-6">
        {/* Flèches de navigation Haut / Bas */}
        <div className="hidden md:flex flex-col gap-3 mr-2">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="p-3 rounded-full bg-[#242424] hover:bg-[#333333] text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Capsule précédente (Flèche Haut)"
          >
            <ChevronUp size={20} />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === localShorts.length - 1}
            className="p-3 rounded-full bg-[#242424] hover:bg-[#333333] text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Capsule suivante (Flèche Bas)"
          >
            <ChevronDown size={20} />
          </button>
        </div>

        {/* ── CADRE LECTEUR CAPSULE (9:16) ── */}
        <div className="relative h-full aspect-[9/16] max-h-[90vh] rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center group">
          {currentShort.videoUrl ? (
            <video
              ref={videoRef}
              src={currentShort.videoUrl}
              autoPlay
              playsInline
              loop
              muted={isMuted}
              onClick={() => setIsPlaying((p) => !p)}
              className="w-full h-full object-cover cursor-pointer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#181818] p-6 text-center">
              <Play size={48} className="text-[#666666] mb-3" />
              <p className="text-sm text-[#999999]">Vidéo non disponible.</p>
            </div>
          )}

          {/* Icône Play/Pause en overlay au clic */}
          {!isPlaying && (
            <div
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white">
                <Play size={28} className="ml-1 fill-white" />
              </div>
            </div>
          )}

          {/* Contrôle Mute / Unmute en haut à gauche */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsMuted((m) => !m)
            }}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition z-10"
            title={isMuted ? "Activer le son" : "Couper le son"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Overlay bas : Infos créateur & Titre */}
          <div className="absolute bottom-0 left-0 right-16 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
            <div className="flex items-center gap-2.5 mb-2 pointer-events-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentShort.author?.avatar || "/images/avatar.png"}
                alt={currentShort.author?.name || "Créateur"}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#985810]"
              />
              <span className="text-sm font-bold text-white shadow-sm truncate">
                {currentShort.author?.name || "Créateur"}
              </span>
            </div>

            <p className="text-xs text-white/95 leading-relaxed line-clamp-3 pointer-events-auto">
              {currentShort.caption || currentShort.title}
            </p>

            {currentShort.timeAgo && (
              <span className="text-[10px] text-[#a0a0a0] block mt-1">
                {currentShort.timeAgo}
              </span>
            )}
          </div>

          {/* ── COLONNE D'ACTIONS LATÉRALE (DROITE DU CADRE) ── */}
          <div className="absolute right-3 bottom-6 flex flex-col items-center gap-4 z-20">
            {/* Bouton Like */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleToggleLike}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  currentShort.isLiked
                    ? "bg-[#985810] text-white scale-110 shadow-lg shadow-[#985810]/40"
                    : "bg-black/60 backdrop-blur-sm text-white hover:bg-white/20"
                }`}
                title="J'aime"
              >
                <Heart size={20} className={currentShort.isLiked ? "fill-white" : ""} />
              </button>
              <span className="text-[11px] font-semibold text-white drop-shadow">
                {currentShort.likesCount || 0}
              </span>
            </div>

            {/* Bouton Commentaires */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setShowComments((prev) => !prev)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  showComments
                    ? "bg-[#985810] text-white"
                    : "bg-black/60 backdrop-blur-sm text-white hover:bg-white/20"
                }`}
                title="Commentaires"
              >
                <MessageCircle size={20} />
              </button>
              <span className="text-[11px] font-semibold text-white drop-shadow">
                {currentShort.commentsCount || comments.length || 0}
              </span>
            </div>

            {/* Bouton Partager */}
            <button
              onClick={handleShare}
              className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-white/20 flex items-center justify-center transition"
              title="Partager la capsule"
            >
              <Share2 size={19} />
            </button>

            {/* Bouton Supprimer (si auteur) */}
            {isAuthor && (
              <button
                onClick={handleDeleteShort}
                className="w-11 h-11 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center transition mt-1"
                title="Supprimer ma capsule"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* ── PANNEAU LATÉRAL DES COMMENTAIRES (RÉTRACTABLE) ── */}
        {showComments && (
          <div
            className="w-80 md:w-96 h-[90vh] rounded-2xl flex flex-col border border-[#2e2e2e] shadow-2xl animate-in slide-in-from-right duration-200"
            style={{ backgroundColor: "#181818" }}
          >
            {/* Header commentaires */}
            <div className="p-4 border-b border-[#282828] flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageCircle size={16} className="text-[#985810]" />
                <span>Commentaires ({comments.length})</span>
              </h4>
              <button
                onClick={() => setShowComments(false)}
                className="text-[#888888] hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Liste scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {commentsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center text-[#777777]">
                  <RefreshCw size={20} className="animate-spin text-[#985810]" />
                  <span className="text-xs">Chargement des commentaires...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-12 text-center text-[#777777]">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Aucun commentaire pour le moment.</p>
                  <p className="text-[11px] text-[#555555] mt-0.5">Soyez le premier à réagir !</p>
                </div>
              ) : (
                comments.map((c) => {
                  const isCommentAuthor =
                    currentUserId && String(c.userId || c.user?.id) === String(currentUserId)
                  return (
                    <div key={c.id} className="flex gap-2.5 group/comm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.user?.avatar || "/images/avatar.png"}
                        alt={c.user?.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-[#333333]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white truncate">
                            {c.user?.name}
                          </span>
                          <span className="text-[10px] text-[#777777]">{c.timeAgo}</span>
                        </div>
                        <p className="text-xs text-[#d0d0d0] mt-0.5 leading-relaxed break-words">
                          {c.content}
                        </p>
                      </div>

                      {isCommentAuthor && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="opacity-0 group-hover/comm:opacity-100 p-1 text-red-400 hover:text-red-300 transition shrink-0"
                          title="Supprimer mon commentaire"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Input envoi commentaire */}
            <form onSubmit={handleAddComment} className="p-3 border-t border-[#282828] flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                disabled={commentSubmitting}
                className="flex-1 px-3 py-2 rounded-xl text-xs text-white bg-[#101010] border border-[#333333] focus:border-[#985810] outline-none placeholder-[#666666]"
              />
              <button
                type="submit"
                disabled={commentSubmitting || !newComment.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#985810] text-white hover:bg-[#7d480d] transition disabled:opacity-40 flex items-center justify-center"
              >
                {commentSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
