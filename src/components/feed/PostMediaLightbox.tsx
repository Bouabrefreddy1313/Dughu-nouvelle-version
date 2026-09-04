"use client"

import { useState, useEffect, useRef } from "react"
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
  Flag,
  ChevronDown,
  Reply,
  Repeat2,
  Gift,
  Loader2,
  Pen,
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
  POST_PRIVACY_OPTIONS,
  resolvePostColorCss,
} from "@/lib/constants"
import { toast } from "sonner"
import { givePoints } from "@/services/posts/feed.service"
import { createPost, rePost } from "@/services/posts/posts.service"
import { userMessage } from "@/lib/api/api-error"
import { RepostWithTextModal } from "@/components/feed/RepostWithTextModal"
import { SharePostModal } from "@/components/feed/SharePostModal"

function formatCommentTime(dateString?: string): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "à l'instant"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days}j`
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
}

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
  images?: LightboxImageItem[]
  video?: string | null
  color?: string | null
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
  postId?: string
  shareUrl?: string | null
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

/** Liste de réactions « vide » partagée : référence STABLE entre les rendus. */
const EMPTY_REACTIONS: ReactionSummaryItem[] = []

/**
 * Compare deux listes de réactions par CONTENU (type + count) plutôt que par
 * référence. Indispensable pour la synchronisation d'état pendant le rendu :
 * une comparaison par référence bouclerait si le parent fournit un nouveau
 * tableau à chaque rendu (ex. valeur par défaut `[]` recréée à chaque appel
 * du composant quand la prop `reactions` est absente) → « Too many re-renders ».
 */
function sameReactions(
  a: ReactionSummaryItem[] | undefined,
  b: ReactionSummaryItem[] | undefined
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((item, i) => {
    const other = b[i]
    return !!other && item.type === other.type && item.count === other.count
  })
}

export function PostMediaLightbox({
  open,
  onClose,
  images = [],
  video,
  color,
  initialIndex = 0,
  author,
  timeAgo,
  content,
  postId,
  shareUrl,
  postPrivacy,
  likesCount,
  reactions = EMPTY_REACTIONS,
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
  const [hoverCommentReactionId, setHoverCommentReactionId] = useState<string | null>(null)
  // Modale de partage du post vers les réseaux sociaux (par défaut dans la lumièrebox)
  const [showShareModal, setShowShareModal] = useState(false)
  // Menu « Republier » (direct / avec commentaire) + modale de republication avec texte
  const [repostMenuOpen, setRepostMenuOpen] = useState(false)
  const [showRepostTextModal, setShowRepostTextModal] = useState(false)
  // Confirmation « Gratifier » (don de 100 points) — une simple overlay z-[9999],
  // car le Dialog shadcn (porté dans <body> à z-50) serait invisible sous la lightbox.
  const [confirmGratifyOpen, setConfirmGratifyOpen] = useState(false)
  const [sendingPoints, setSendingPoints] = useState(false)

  // La prop `reactions` peut être absente : on lui substitue une constante de
  // module (jamais recréée à chaque rendu). Sans cela, la synchronisation de
  // state ci-dessous (comparaison de références) détecterait un changement à
  // CHAQUE rendu → setState pendant le rendu → boucle « Too many re-renders ».
  const normalizedReactions = Array.isArray(reactions) ? reactions : EMPTY_REACTIONS

  const [localLikesCount, setLocalLikesCount] = useState(likesCount)
  const [localSelectedReaction, setLocalSelectedReaction] = useState(selectedReaction)
  const [localReactions, setLocalReactions] = useState<ReactionSummaryItem[]>(normalizedReactions)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchCurrentY = useRef<number | null>(null)

  // Synchronisation avec les props parent sans effet en cascade.
  // Les listes de réactions sont comparées par CONTENU (et non par référence)
  // pour rester robuste même si un parent fournit un nouveau tableau à chaque rendu.
  const [prevProps, setPrevProps] = useState({
    likesCount,
    selectedReaction,
    reactions: normalizedReactions,
    open,
    initialIndex,
  })

  if (
    prevProps.likesCount !== likesCount ||
    prevProps.selectedReaction !== selectedReaction ||
    !sameReactions(prevProps.reactions, normalizedReactions) ||
    prevProps.open !== open ||
    prevProps.initialIndex !== initialIndex
  ) {
    setPrevProps({ likesCount, selectedReaction, reactions: normalizedReactions, open, initialIndex })
    setLocalLikesCount(likesCount)
    setLocalSelectedReaction(selectedReaction)
    setLocalReactions(normalizedReactions)
    if (open && (!prevProps.open || prevProps.initialIndex !== initialIndex)) {
      setCurrentIndex(initialIndex)
      setShowMobileComments(false)
      setShowReactionsPicker(false)
    }
  }

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
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : (images.length > 0 ? images.length - 1 : 0)))
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

  if (!open) return null

  const currentImage = images && images.length > 0 ? (images[currentIndex] || images[0]) : null
  const resolvedColor = resolvePostColorCss(color)

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

  // ── Actions d'interaction : Gratifier (100 pts) · Republier · Partager ──
  const resPostId = postId || (images?.[0]?.id) || ""
  const ownPost =
    !!currentUser?.id && String(author.id) === String(currentUser?.dughu?.userId || "")
  const canGratify = !!currentUser?.id && !!resPostId && !ownPost

  const handleGratify = async () => {
    if (!currentUser?.id || !resPostId) {
      toast.error("Connectez-vous pour offrir des points")
      return
    }
    setSendingPoints(true)
    try {
      const data = await givePoints({
        postId: resPostId,
        authorId: String(author.id),
        points: 100,
        userId: currentUser.id,
        dughuUserId: String(currentUser?.dughu?.userId || ""),
      })
      if (data.success) {
        toast.success("100 points offerts à l'auteur.")
        setConfirmGratifyOpen(false)
      } else {
        toast.error(data.message || "Impossible d'offrir des points.")
      }
    } catch (error) {
      toast.error(userMessage(error, "Impossible d'offrir des points."))
    } finally {
      setSendingPoints(false)
    }
  }

  const handleRepostDirect = async () => {
    if (!currentUser?.id || !resPostId) {
      toast.error("Connectez-vous pour republier")
      return
    }
    try {
      const formData = new FormData()
      formData.append("parentId", resPostId)
      formData.append("userId", currentUser.id)
      formData.append("dughuUserId", currentUser?.dughu?.userId ? String(currentUser.dughu.userId) : "")
      const data = await createPost(formData)
      if (data.success && data.post) toast.success("Repost effectué !")
      else toast.error(data.message || "Erreur repost")
    } catch {
      toast.error("Erreur repost")
    }
  }

  const handleRepostWithText = async (text: string) => {
    if (!currentUser?.id || !resPostId) {
      toast.error("Connectez-vous pour republier")
      return
    }
    const commentary = text.trim()
    if (!commentary) {
      void handleRepostDirect()
      return
    }
    try {
      const formData = new FormData()
      formData.append("parentId", resPostId)
      formData.append("userId", currentUser.id)
      formData.append("dughuUserId", currentUser?.dughu?.userId ? String(currentUser.dughu.userId) : "")
      formData.append("postText", commentary)
      const data = await rePost(formData)
      if (data.success && data.post) toast.success("Repost publié !")
      else toast.error(data.message || "Erreur repost")
    } catch {
      toast.error("Erreur repost")
    }
  }

  const sharePreviewPost = {
    id: resPostId,
    content: content || null,
    image: images?.[0]?.url || null,
    video: typeof video === "string" ? video : null,
    author: author,
    shareUrl: shareUrl || null,
  }
  const repostPreviewParent = {
    id: resPostId,
    author: author,
    content: content || null,
    image: images?.[0]?.url || null,
    video: typeof video === "string" ? video : null,
    color: color,
    timeAgo: timeAgo,
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

          {/* Bouton Gratifier (100 points) — masqué sur son propre post */}
          {canGratify && (
            <button
              type="button"
              onClick={() => setConfirmGratifyOpen(true)}
              className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-[#65676B] hover:bg-gray-50 transition"
              aria-label="Gratifier l'auteur de ce post de 100 points"
            >
              <Image src="/images/dixip.png" alt="Gratifier" width={20} height={20} className="w-4 h-4 object-contain" />
              <span>Gratifier</span>
            </button>
          )}

          {/* Bouton Republier */}
          <div className="relative flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setRepostMenuOpen((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-[#65676B] hover:bg-gray-50 transition"
            >
              <Repeat2 size={16} />
              <span>Republier</span>
            </button>

            {repostMenuOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setRepostMenuOpen(false)
                    void handleRepostDirect()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] transition text-left"
                >
                  <Repeat2 size={14} className="text-[#65676B]" />
                  <span className="text-[13px] font-medium text-[#050505]">
                    Republier directement
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRepostMenuOpen(false)
                    setShowRepostTextModal(true)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] transition text-left"
                >
                  <Pen size={14} className="text-[#A35A2B]" />
                  <span className="text-[13px] font-medium text-[#050505]">
                    Écrire un commentaire
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Bouton Partager */}
          <button
            type="button"
            onClick={() => {
              if (onShare) onShare()
              else setShowShareModal(true)
            }}
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
            const isOwnComment = comment.isMine || comment.userId === currentUser?.id || comment.user?.id === currentUser?.id
            const isAuthor = (Boolean(comment.userId) && comment.userId === author.id) || (Boolean(comment.user?.id) && comment.user?.id === author.id)

            return (
              <div key={comment.id} className="mb-3">
                <div className="flex items-start gap-2">
                  <Avatar src={comment.user?.avatar} name={comment.user?.name} size="xs" className="w-7 h-7 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="rounded-2xl bg-[#F0F2F5] px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-[#050505]">
                          {comment.user?.name || "Utilisateur"}
                        </p>

                        {isAuthor && (
                          <span className="text-[10px] bg-[#A35A2A] text-white px-1.5 py-0.5 rounded-full font-medium">
                            Auteur
                          </span>
                        )}

                        <span className="text-[11px] text-[#65676B]">
                          {formatCommentTime(comment.createdAt)}
                        </span>
                      </div>

                      <div className="mt-1">
                        <CommentBody
                          content={comment.content}
                          image={comment.image}
                          video={comment.video}
                          file={comment.file}
                          fileType={comment.fileType}
                        />
                      </div>

                      {/* Actions de commentaire : 👍 • Répondre • Supprimer / Signaler */}
                      <div className="flex items-center gap-0.5 mt-2 -ml-2">
                        <div
                          className="relative"
                          onMouseEnter={() => setHoverCommentReactionId(comment.id)}
                          onMouseLeave={() => setHoverCommentReactionId(null)}
                        >
                          <button
                            type="button"
                            onClick={() => onLikeComment?.(comment.id, 1, false)}
                            className={cn(
                              "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
                              comment.liked
                                ? "text-[#E4405F] hover:bg-red-50"
                                : "text-[#65676B] hover:bg-red-50 hover:text-[#E4405F]"
                            )}
                          >
                            <span>👍</span>
                            {comment.likesCount ? <span>{comment.likesCount}</span> : null}
                          </button>

                          {hoverCommentReactionId === comment.id && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white rounded-full shadow-xl border border-gray-100 px-2 py-1 flex items-center gap-0.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                              {REACTIONS.map((reaction) => (
                                <button
                                  type="button"
                                  key={reaction.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onLikeComment?.(comment.id, reaction.id, false)
                                    setHoverCommentReactionId(null)
                                  }}
                                  className="text-[20px] hover:scale-125 transition-transform"
                                  title={reaction.name}
                                >
                                  {reaction.icon}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <span className="text-[#D1D5DB] text-[11px]" aria-hidden>
                          •
                        </span>

                        <button
                          type="button"
                          onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                          className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-[#65676B] hover:bg-[#A35A2A]/10 hover:text-[#A35A2A] transition-colors"
                        >
                          <Reply size={12} />
                          <span>Répondre</span>
                        </button>

                        <span className="text-[#D1D5DB] text-[11px]" aria-hidden>
                          •
                        </span>

                        {isOwnComment ? (
                          <button
                            type="button"
                            onClick={() => onDeleteComment?.(comment.id, false)}
                            className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-[#65676B] hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={12} />
                            <span>Supprimer</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onReportComment?.(comment.id, false)}
                            className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-[#65676B] hover:bg-orange-50 hover:text-[#E4405F] transition-colors"
                          >
                            <Flag size={12} />
                            <span>Signaler</span>
                          </button>
                        )}
                      </div>

                      {/* Zone de réponse */}
                      {isReplying && (
                        <div className="mt-2 flex items-center gap-2 pl-1">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitReply(comment.id)
                            }}
                            placeholder={`Répondre à ${comment.user?.name || "l'auteur"}...`}
                            className="flex-1 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs text-[#050505] outline-none focus:ring-1 focus:ring-[#A35A2A]"
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
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setExpandedReplies((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#65676B] hover:text-[#A35A2A] transition-colors"
                          >
                            <span className="text-[#9CA3AF]">—</span>
                            <span>
                              {areRepliesExpanded
                                ? "Masquer les réponses"
                                : replies.length === 1
                                ? "Voir 1 réponse"
                                : `Voir ${replies.length} réponses`}
                            </span>
                            <ChevronDown
                              size={12}
                              className={cn("transition-transform duration-200", areRepliesExpanded && "rotate-180")}
                            />
                          </button>

                          {areRepliesExpanded && (
                            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                              {replies.map((reply) => {
                                const isOwnReply = reply.isMine || reply.userId === currentUser?.id || reply.user?.id === currentUser?.id
                                const isReplyAuthor = (Boolean(reply.userId) && reply.userId === author.id) || (Boolean(reply.user?.id) && reply.user?.id === author.id)

                                return (
                                  <div key={reply.id} className="flex items-start gap-2">
                                    <Avatar src={reply.user?.avatar} name={reply.user?.name} size="xs" className="w-6 h-6 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="rounded-2xl bg-[#F0F2F5] px-3 py-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-[12px] font-semibold text-[#050505]">
                                            {reply.user?.name || "Utilisateur"}
                                          </p>
                                          {isReplyAuthor && (
                                            <span className="text-[9px] bg-[#A35A2A] text-white px-1.5 py-0.2 rounded-full font-medium">
                                              Auteur
                                            </span>
                                          )}
                                          <span className="text-[10px] text-[#65676B]">
                                            {formatCommentTime(reply.createdAt)}
                                          </span>
                                        </div>
                                        <div className="mt-0.5">
                                          <CommentBody
                                            content={reply.content}
                                            image={reply.image}
                                            video={reply.video}
                                            file={reply.file}
                                            fileType={reply.fileType}
                                            size="sm"
                                          />
                                        </div>

                                        <div className="flex items-center gap-0.5 mt-1.5 -ml-2">
                                          <button
                                            type="button"
                                            onClick={() => onLikeComment?.(reply.id, 1, true)}
                                            className={cn(
                                              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                                              reply.liked ? "text-[#E4405F]" : "text-[#65676B] hover:text-[#E4405F]"
                                            )}
                                          >
                                            <span>👍</span>
                                            {reply.likesCount ? <span>{reply.likesCount}</span> : null}
                                          </button>

                                          <span className="text-[#D1D5DB] text-[10px]" aria-hidden>•</span>

                                          <button
                                            type="button"
                                            onClick={() => setReplyingTo(comment.id)}
                                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-[#65676B] hover:text-[#A35A2A]"
                                          >
                                            <Reply size={10} />
                                            <span>Répondre</span>
                                          </button>

                                          <span className="text-[#D1D5DB] text-[10px]" aria-hidden>•</span>

                                          {isOwnReply ? (
                                            <button
                                              type="button"
                                              onClick={() => onDeleteComment?.(reply.id, true)}
                                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-[#65676B] hover:text-red-600"
                                            >
                                              <Trash2 size={10} />
                                              <span>Supprimer</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => onReportComment?.(reply.id, true)}
                                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-[#65676B] hover:text-[#E4405F]"
                                            >
                                              <Flag size={10} />
                                              <span>Signaler</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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

        {/* Le post / média principal au centre/droite */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-8 overflow-auto">
          {currentImage ? (
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
          ) : video ? (
            <div className="relative w-full max-w-4xl max-h-[85vh] md:max-h-[92vh] flex items-center justify-center">
              <video
                src={video}
                controls
                autoPlay
                playsInline
                className="max-h-[85vh] md:max-h-[92vh] max-w-full w-auto h-auto object-contain rounded-xl drop-shadow-2xl"
              />
            </div>
          ) : (
            <div
              className={cn(
                "w-full max-w-2xl min-h-[260px] sm:min-h-[380px] p-8 sm:p-12 rounded-3xl flex items-center justify-center text-center shadow-2xl transition-all animate-in zoom-in-95",
                !resolvedColor?.bg && "bg-white/10 backdrop-blur-md text-white border border-white/15"
              )}
              style={
                resolvedColor?.bg
                  ? { background: resolvedColor.bg, color: resolvedColor.text || "#FFFFFF" }
                  : undefined
              }
            >
              <p className="text-xl sm:text-3xl font-bold whitespace-pre-wrap leading-relaxed break-words">
                <HashtagText text={content || ""} hashtagClassName="text-inherit underline" />
              </p>
            </div>
          )}
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
              onClick={() => {
                if (onShare) onShare()
                else setShowShareModal(true)
              }}
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

      {/* Modale de confirmation « Gratifier » (overlay simple : le Dialog shadcn,
          porté dans <body> à z-50, serait invisible sous la lightbox z-[9999]). */}
      {confirmGratifyOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
          onClick={() => {
            if (!sendingPoints) setConfirmGratifyOpen(false)
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl animate-[scaleIn_0.18s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Gratifier l'auteur"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A35A2B]/10">
                <Gift size={20} className="text-[#A35A2B]" />
              </span>
              <h3 className="text-base font-semibold leading-tight text-[#050505]">
                Gratifier l'auteur
              </h3>
            </div>
            <p className="mt-3 text-sm text-[#65676B]">
              Voulez-vous vraiment offrir <strong>100 points</strong> à{" "}
              <strong>{author.name || "cet utilisateur"}</strong> pour cette publication ?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmGratifyOpen(false)}
                disabled={sendingPoints}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-[#65676B] hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleGratify()}
                disabled={sendingPoints}
                className="px-4 py-2 rounded-lg bg-[#A35A2B] text-white text-sm font-medium hover:bg-[#8B4A1F] transition"
              >
                {sendingPoints ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Envoi...
                  </span>
                ) : (
                  "Confirmer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de republication avec texte d'accompagnement */}
      {showRepostTextModal && (
        <RepostWithTextModal
          isOpen={showRepostTextModal}
          setIsOpen={setShowRepostTextModal}
          onClose={() => setShowRepostTextModal(false)}
          onSubmit={(text) => {
            void handleRepostWithText(text)
            setShowRepostTextModal(false)
          }}
          parentPost={repostPreviewParent}
        />
      )}

      {/* Modale de partage vers les réseaux sociaux */}
      {showShareModal && (
        <SharePostModal
          isOpen={showShareModal}
          setIsOpen={setShowShareModal}
          onClose={() => setShowShareModal(false)}
          post={sharePreviewPost}
        />
      )}
    </div>
  )
}
