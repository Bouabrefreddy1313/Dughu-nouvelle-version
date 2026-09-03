"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import {
  X,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Share2,
  Send,
  Smile,
  Paperclip,
  Trash2,
  Reply,
  Flag,
  ChevronDown,
  Repeat2,
  Heart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Avatar from "@/components/common/Avatar"
import { HashtagText } from "@/components/common/HashtagText"
import { ReactionPicker } from "@/components/feed/ReactionPicker"
import { ReactionSummary, type ReactionSummaryItem } from "@/components/feed/ReactionSummary"
import { CommentBody } from "@/components/feed/CommentBody"
import {
  REACTIONS,
  REACTION_ID_TO_TYPE,
  REACTION_TYPE_TO_ID,
  POST_PRIVACY_OPTIONS,
} from "@/lib/constants"
import { toast } from "sonner"

export interface LightboxImageItem {
  url: string
  id?: string
}

export interface LightboxCommentUser {
  id: string
  name: string | null
  username?: string | null
  avatar: string | null
}

export interface LightboxCommentItem {
  id: string
  content: string
  createdAt: string
  userId: string
  isMine?: boolean
  parentId?: string | null
  liked?: boolean
  likesCount?: number
  reactionType?: string | null
  image?: string | null
  video?: string | null
  fileType?: string | null
  file?: string | null
  user: LightboxCommentUser
  replies?: LightboxCommentItem[]
}

interface PostMediaLightboxProps {
  open: boolean
  onClose: () => void
  images: LightboxImageItem[]
  initialIndex?: number
  author: {
    id: string
    name: string | null
    avatar: string | null
    username?: string | null
    verified?: boolean
    pageId?: string | null
  }
  timeAgo?: string
  content?: string
  postPrivacy?: 0 | 1 | 2 | 3
  likesCount: number
  reactions?: { type: string; count: number }[]
  selectedReaction?: number | null
  onLike?: (reactionId?: number) => void
  onOpenReactionsModal?: () => void
  onShare?: () => void
  // Commentaires
  comments: LightboxCommentItem[]
  loadingComments?: boolean
  currentUser?: {
    id: string
    name: string | null
    avatar: string | null
    dughu?: { userId?: string | number }
  } | null
  onAddComment: (text: string, files?: File[]) => Promise<void> | void
  onLikeComment?: (commentId: string, reactionId: number, isReply?: boolean) => void
  onDeleteComment?: (commentId: string, isReply?: boolean) => void
  onReportComment?: (commentId: string, isReply?: boolean) => void
  onReplyComment?: (parentId: string, text: string, files?: File[]) => Promise<void> | void
}

const EMOJI_LIST = ["👍", "❤️", "😂", "🔥", "👏", "🎉", "😮", "🙏", "💯", "😍", "✨", "💪"]

export function PostMediaLightbox({
  open,
  onClose,
  images,
  initialIndex = 0,
  author,
  timeAgo,
  content,
  postPrivacy,
  likesCount,
  reactions = [],
  selectedReaction,
  onLike,
  onOpenReactionsModal,
  onShare,
  comments,
  loadingComments = false,
  currentUser,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  onReportComment,
  onReplyComment,
}: PostMediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [showMobileComments, setShowMobileComments] = useState(false)
  const [showReactionsPicker, setShowReactionsPicker] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentFiles, setCommentFiles] = useState<File[]>([])
  const [commentPreviews, setCommentPreviews] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})

  const [localLikesCount, setLocalLikesCount] = useState(likesCount)
  const [localSelectedReaction, setLocalSelectedReaction] = useState(selectedReaction)
  const [localReactions, setLocalReactions] = useState<ReactionSummaryItem[]>(
    Array.isArray(reactions) ? reactions : []
  )

  const fileInputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchCurrentY = useRef<number | null>(null)

  // Synchronise avec les props parent
  useEffect(() => {
    setLocalLikesCount(likesCount)
  }, [likesCount])

  useEffect(() => {
    setLocalSelectedReaction(selectedReaction)
  }, [selectedReaction])

  useEffect(() => {
    setLocalReactions(Array.isArray(reactions) ? reactions : [])
  }, [reactions])

  // Synchronise index initial lors de l'ouverture
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex)
      setShowMobileComments(false)
      setShowReactionsPicker(false)
    }
  }, [open, initialIndex])

  // Verrouille le défilement de la page derrière
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showMobileComments) setShowMobileComments(false)
        else onClose()
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose, images.length, showMobileComments])

  if (!open || images.length === 0) return null

  const currentImage = images[currentIndex] || images[0]

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setCommentFiles((prev) => [...prev, ...files])
    const newPreviews = files.map((f) => URL.createObjectURL(f))
    setCommentPreviews((prev) => [...prev, ...newPreviews])
  }

  const removeFile = (idx: number) => {
    setCommentFiles((prev) => prev.filter((_, i) => i !== idx))
    setCommentPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  const submitComment = async () => {
    const text = commentText.trim()
    if (!text && commentFiles.length === 0) return
    try {
      await onAddComment(text, commentFiles)
      setCommentText("")
      setCommentFiles([])
      setCommentPreviews([])
      setShowEmojiPicker(false)
    } catch {
      toast.error("Erreur lors de l'envoi du commentaire")
    }
  }

  const submitReply = async (parentId: string) => {
    const text = replyText.trim()
    if (!text) return
    try {
      await onReplyComment?.(parentId, text)
      setReplyText("")
      setReplyingTo(null)
      setExpandedReplies((prev) => ({ ...prev, [parentId]: true }))
    } catch {
      toast.error("Erreur lors de la réponse")
    }
  }

  // Sélection de réaction optimiste
  const handleSelectReaction = (reactionId: number) => {
    setShowReactionsPicker(false)
    const prevReaction = localSelectedReaction
    const prevType = prevReaction ? REACTION_ID_TO_TYPE[prevReaction] : null
    const targetType = REACTION_ID_TO_TYPE[reactionId]

    if (prevReaction === reactionId) {
      // Retrait de la réaction
      setLocalSelectedReaction(null)
      setLocalLikesCount((c) => Math.max(0, c - 1))
      if (prevType) {
        setLocalReactions((list) =>
          list
            .map((r) => (r.type === prevType ? { ...r, count: Math.max(0, r.count - 1) } : r))
            .filter((r) => r.count > 0)
        )
      }
    } else {
      // Nouvelle réaction ou changement
      setLocalSelectedReaction(reactionId)
      if (!prevReaction) {
        setLocalLikesCount((c) => c + 1)
      }
      setLocalReactions((list) => {
        const copy = [...list]
        if (prevType) {
          const pIdx = copy.findIndex((r) => r.type === prevType)
          if (pIdx >= 0) {
            copy[pIdx] = { ...copy[pIdx], count: Math.max(0, copy[pIdx].count - 1) }
          }
        }
        if (targetType) {
          const nIdx = copy.findIndex((r) => r.type === targetType)
          if (nIdx >= 0) {
            copy[nIdx] = { ...copy[nIdx], count: copy[nIdx].count + 1 }
          } else {
            copy.push({ type: targetType, count: 1 })
          }
        }
        return copy.filter((r) => r.count > 0)
      })
    }

    onLike?.(reactionId)
  }

  // Clic simple sur le bouton like
  const handleSimpleLikeClick = () => {
    handleSelectReaction(localSelectedReaction ? localSelectedReaction : 1)
  }

  // Long press mobile pour le sélecteur
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowReactionsPicker(true)
    }, 380)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Définition de la réaction sélectionnée
  const selectedReactionDef = REACTIONS.find((r) => r.id === localSelectedReaction)

  const privacyOption = POST_PRIVACY_OPTIONS.find((p) => p.id === postPrivacy)
  const PrivacyIcon = privacyOption?.icon

  // Rendu de la zone de commentaires (partagée entre desktop et mobile Bottom Sheet)
  const renderCommentsContent = () => (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* En-tête du post */}
      <div className="p-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar src={author.avatar} name={author.name} size="md" verified={author.verified} />
          <div className="min-w-0 flex-1">
            <a
              href={author.pageId ? `/espaces/${author.pageId}` : `/profile/${author.username || author.id}`}
              className="font-semibold text-sm text-[#050505] hover:underline truncate block"
            >
              {author.name}
            </a>
            <div className="flex items-center gap-1.5 text-xs text-[#65676B] mt-0.5">
              {timeAgo && <span>{timeAgo}</span>}
              {PrivacyIcon && (
                <>
                  <span aria-hidden>•</span>
                  <span title={privacyOption?.title} className="inline-flex items-center">
                    <PrivacyIcon size={12} />
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Contenu textuel */}
        {content && (
          <p className="mt-3 text-sm text-[#050505] whitespace-pre-wrap leading-relaxed">
            <HashtagText text={content} />
          </p>
        )}

        {/* Compteurs de réactions et commentaires */}
        {(localLikesCount > 0 || comments.length > 0) && (
          <div className="flex items-center justify-between text-xs text-[#65676B] mt-3 pt-2.5 border-t border-gray-100">
            {localLikesCount > 0 ? (
              <ReactionSummary
                reactions={localReactions}
                likesCount={localLikesCount}
                fallbackReactionId={localSelectedReaction}
                onClick={onOpenReactionsModal}
              />
            ) : <div />}

            {comments.length > 0 && (
              <span className="font-medium text-[#65676B]">
                {comments.length} commentaire{comments.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Boutons d'interaction */}
        <div className="flex items-center justify-around border-t border-gray-100 mt-2.5 pt-1 relative">
          {/* Bouton Like / Réaction */}
          <div
            className="relative flex-1"
            onMouseEnter={() => setShowReactionsPicker(true)}
            onMouseLeave={() => setShowReactionsPicker(false)}
          >
            <button
              type="button"
              onClick={handleSimpleLikeClick}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition hover:bg-gray-50",
                selectedReactionDef ? "text-[#A35A2A]" : "text-[#65676B]"
              )}
            >
              <span className="text-base">{selectedReactionDef?.icon || "👍"}</span>
              <span>{selectedReactionDef?.name || "J'aime"}</span>
            </button>

            {showReactionsPicker && (
              <ReactionPicker
                selectedReactionId={localSelectedReaction}
                onSelect={handleSelectReaction}
                onClose={() => setShowReactionsPicker(false)}
                align="left"
                className="bottom-full mb-1"
              />
            )}
          </div>

          {/* Bouton Partager */}
          <button
            type="button"
            onClick={onShare}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-[#65676B] hover:bg-gray-50 transition"
          >
            <Share2 size={16} />
            <span>Partager</span>
          </button>
        </div>
      </div>

      {/* Liste des commentaires */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingComments ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 bg-gray-200 rounded-full" />
                  <div className="h-4 w-4/5 bg-gray-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="py-12 text-center text-[#65676B]">
            <MessageCircle size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">Aucun commentaire pour le moment.</p>
            <p className="text-xs text-gray-400 mt-0.5">Soyez le premier à réagir !</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isReplying = replyingTo === comment.id
            const replies = comment.replies || []
            const areRepliesExpanded = expandedReplies[comment.id]

            return (
              <div key={comment.id} className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <Avatar src={comment.user?.avatar} name={comment.user?.name} size="sm" className="shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="bg-[#F0F2F5] rounded-2xl px-3.5 py-2 inline-block max-w-full">
                      <p className="text-xs font-bold text-[#050505] leading-snug truncate">
                        {comment.user?.name || "Utilisateur"}
                      </p>
                      <p className="text-sm text-[#050505] break-words whitespace-pre-wrap mt-0.5">
                        <CommentBody
                          content={comment.content}
                          image={comment.image}
                          video={comment.video}
                          file={comment.file}
                          fileType={comment.fileType}
                        />
                      </p>
                    </div>

                    {/* Actions de commentaire */}
                    <div className="flex items-center gap-3 text-[11px] text-[#65676B] px-2 mt-1">
                      <span>{comment.createdAt}</span>
                      <button
                        type="button"
                        onClick={() => onLikeComment?.(comment.id, 1, false)}
                        className={cn("font-semibold hover:underline", comment.liked && "text-[#A35A2A]")}
                      >
                        J&apos;aime {comment.likesCount ? `(${comment.likesCount})` : ""}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                        className="font-semibold hover:underline"
                      >
                        Répondre
                      </button>
                      {comment.isMine && (
                        <button
                          type="button"
                          onClick={() => onDeleteComment?.(comment.id, false)}
                          className="hover:text-red-500 transition"
                          title="Supprimer"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {/* Zone de réponse */}
                    {isReplying && (
                      <div className="mt-2 flex items-center gap-2 pl-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitReply(comment.id)
                          }}
                          placeholder={`Répondre à ${comment.user?.name || "l'auteur"}...`}
                          className="flex-1 bg-gray-100 rounded-full px-3 py-1.5 text-xs text-[#050505] outline-none focus:ring-1 focus:ring-[#A35A2A]"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => submitReply(comment.id)}
                          className="p-1.5 rounded-full bg-[#A35A2A] text-white hover:bg-[#8B4A1F] transition text-xs"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                    )}

                    {/* Réponses imbriquées */}
                    {replies.length > 0 && (
                      <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-2">
                        {!areRepliesExpanded && (
                          <button
                            type="button"
                            onClick={() => setExpandedReplies((prev) => ({ ...prev, [comment.id]: true }))}
                            className="text-xs font-semibold text-[#A35A2A] hover:underline flex items-center gap-1"
                          >
                            <span>Voir {replies.length} réponse{replies.length > 1 ? "s" : ""}</span>
                            <ChevronDown size={12} />
                          </button>
                        )}
                        {areRepliesExpanded && replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2 pt-1">
                            <Avatar src={reply.user?.avatar} name={reply.user?.name} size="xs" className="shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="bg-[#F0F2F5] rounded-2xl px-3 py-1.5 inline-block max-w-full">
                                <p className="text-[11px] font-bold text-[#050505] truncate">
                                  {reply.user?.name || "Utilisateur"}
                                </p>
                                <p className="text-xs text-[#050505] break-words whitespace-pre-wrap">
                                  <CommentBody
                                    content={reply.content}
                                    image={reply.image}
                                    video={reply.video}
                                    file={reply.file}
                                    fileType={reply.fileType}
                                    size="sm"
                                  />
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Barre de saisie de commentaire sticky en bas */}
      <div className="p-3 border-t border-gray-100 bg-white shrink-0">
        {/* Prévisualisations de fichiers */}
        {commentPreviews.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {commentPreviews.map((url, idx) => (
              <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                <Image src={url} alt="" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 bg-[#F0F2F5] rounded-full px-3 py-1.5">
          <Avatar src={currentUser?.avatar} name={currentUser?.name} size="xs" className="shrink-0" />
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submitComment()
              }
            }}
            placeholder="Écrire un commentaire..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-[#050505] placeholder-[#65676B] outline-none"
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 text-[#65676B] hover:text-[#A35A2A] transition"
            title="Ajouter une image/vidéo"
          >
            <Paperclip size={16} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="p-1 text-[#65676B] hover:text-[#A35A2A] transition"
              title="Emoji"
            >
              <Smile size={16} />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 p-2 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-wrap gap-1 w-44 z-50 animate-in fade-in zoom-in-95 duration-150">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setCommentText((prev) => prev + emoji)
                    }}
                    className="w-7 h-7 text-lg hover:bg-gray-100 rounded-lg flex items-center justify-center transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={submitComment}
            disabled={!commentText.trim() && commentFiles.length === 0}
            className={cn(
              "p-1.5 rounded-full transition",
              commentText.trim() || commentFiles.length > 0
                ? "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
                : "text-gray-400 cursor-not-allowed"
            )}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col md:flex-row bg-black/95 backdrop-blur-md transition-all duration-200 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse de publication"
    >
      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP : PANNEAU COMMENTAIRES À GAUCHE (w-[380px] - xl:w-[440px])
          ═══════════════════════════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-[380px] xl:w-[440px] h-full z-20 shrink-0 border-r border-gray-800/60 shadow-2xl">
        {renderCommentsContent()}
      </aside>

      {/* ═══════════════════════════════════════════════════════════════
          ZONE CENTRALE / DROITE : IMAGE IMMERSIVE PLEIN ÉCRAN
          ═══════════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 h-full flex flex-col justify-between relative select-none overflow-hidden"
        onClick={(e) => {
          // Clic sur l'arrière-plan ferme la lightbox
          if (e.target === e.currentTarget) onClose()
        }}
      >
        {/* Barre supérieure flottante (contrôles fermer & pagination) */}
        <div className="absolute top-0 inset-x-0 p-3 sm:p-4 flex items-center justify-between z-30 pointer-events-none">
          <div className="pointer-events-auto">
            {images.length > 1 && (
              <span className="px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold backdrop-blur-md">
                {currentIndex + 1} / {images.length}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition hover:scale-105"
            aria-label="Fermer la visionneuse"
          >
            <X size={20} />
          </button>
        </div>

        {/* Flèches de navigation multi-images (si > 1 image) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition hover:scale-110 z-30"
              aria-label="Image précédente"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition hover:scale-110 z-30"
              aria-label="Image suivante"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* L'image principale au centre */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-8">
          <div className="relative w-full h-full max-w-full max-h-full flex items-center justify-center">
            <Image
              src={currentImage.url}
              alt=""
              width={1600}
              height={1200}
              priority
              className="max-h-[85vh] md:max-h-[92vh] max-w-full w-auto h-auto object-contain rounded-lg drop-shadow-2xl transition-all duration-300 ease-out animate-in zoom-in-95"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MOBILE SEULEMENT : BARRE INFÉRIEURE FLOTTANTE & BOTTOM SHEET
            ═══════════════════════════════════════════════════════════════ */}
        <div className="md:hidden p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20">
          <div className="flex items-center justify-between py-1 px-1 text-white gap-2">
            {/* Bouton Like mobile */}
            <div className="relative">
              <button
                type="button"
                onClick={handleSimpleLikeClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-full bg-white/15 backdrop-blur-md active:scale-95 transition",
                  selectedReactionDef ? "text-amber-400 font-bold" : "text-white"
                )}
              >
                <span className="text-base">{selectedReactionDef?.icon || "👍"}</span>
                <span>{localLikesCount > 0 ? localLikesCount : "J'aime"}</span>
              </button>

              {showReactionsPicker && (
                <ReactionPicker
                  selectedReactionId={localSelectedReaction}
                  onSelect={handleSelectReaction}
                  onClose={() => setShowReactionsPicker(false)}
                  align="left"
                  className="bottom-full mb-2"
                />
              )}
            </div>

            {/* Résumé des réactions mobile cliquable */}
            {localLikesCount > 0 && (
              <button
                type="button"
                onClick={onOpenReactionsModal}
                className="flex items-center gap-1 bg-white/15 hover:bg-white/25 rounded-full px-2.5 py-1.5 backdrop-blur-md text-xs transition"
              >
                <ReactionSummary
                  reactions={localReactions}
                  likesCount={localLikesCount}
                  fallbackReactionId={localSelectedReaction}
                  size="sm"
                  className="text-white hover:text-white"
                />
              </button>
            )}

            {/* Bouton Ouvrir Bottom Sheet Commentaires */}
            <button
              type="button"
              onClick={() => setShowMobileComments(true)}
              className="flex items-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md transition active:scale-95"
            >
              <MessageCircle size={16} />
              <span>Commentaires ({comments.length})</span>
            </button>

            {/* Bouton Partager */}
            <button
              type="button"
              onClick={onShare}
              className="p-2.5 rounded-full bg-white/15 backdrop-blur-md text-white hover:bg-white/25 active:scale-95 transition"
              aria-label="Partager"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE : BOTTOM SHEET COULISSANT DES COMMENTAIRES (AVEC SWIPE DOWN)
          ═══════════════════════════════════════════════════════════════ */}
      {showMobileComments && (
        <div
          className="fixed inset-0 z-[10000] flex flex-col justify-end bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={() => setShowMobileComments(false)}
        >
          <div
            className="w-full h-[82vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête avec tirette de fermeture et geste swipe down */}
            <div
              className="flex flex-col items-center pt-2.5 pb-1 border-b border-gray-100 shrink-0 cursor-grab active:cursor-grabbing select-none"
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY
              }}
              onTouchMove={(e) => {
                touchCurrentY.current = e.touches[0].clientY
              }}
              onTouchEnd={() => {
                if (touchStartY.current !== null && touchCurrentY.current !== null) {
                  const deltaY = touchCurrentY.current - touchStartY.current
                  if (deltaY > 60) {
                    setShowMobileComments(false)
                  }
                }
                touchStartY.current = null
                touchCurrentY.current = null
              }}
            >
              <button
                type="button"
                onClick={() => setShowMobileComments(false)}
                className="w-12 h-1.5 rounded-full bg-gray-300 mb-2 hover:bg-gray-400 transition"
                aria-label="Fermer le volet des commentaires"
              />
              <div className="w-full flex items-center justify-between px-4 pb-2">
                <span className="font-bold text-sm text-[#050505]">
                  Commentaires ({comments.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowMobileComments(false)}
                  className="p-1 text-[#65676B] hover:text-[#050505] rounded-full hover:bg-gray-100 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Contenu complet scrollable */}
            {renderCommentsContent()}
          </div>
        </div>
      )}
    </div>
  )
}
