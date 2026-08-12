"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Repeat2, Share2, Image as ImageIcon, Video, FileText, Smile, Send, MoreHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Avatar from "@/components/common/Avatar"
import { CommentBody } from "@/components/feed/CommentBody"

interface Author {
  id: string
  name: string | null
  avatar: string | null
  username?: string | null
  verified?: boolean
}

interface CommentItem {
  id: string
  content: string
  createdAt: string
  userId: string
  parentId?: string | null
  liked?: boolean
  likesCount?: number
  reactionType?: string | null
  image?: string | null
  video?: string | null
  fileType?: string | null
  file?: string | null
  user: {
    id: string
    name: string | null
    username?: string | null
    avatar: string | null
  }
  replies?: CommentItem[]
}

interface PostCardProps {
  postId?: string
  author: Author
  currentUser?: {
    id: string
    name: string | null
    avatar: string | null
  }
  timeAgo?: string
  content?: string
  image?: string
  video?: string
  color?: string | null
  likesCount?: number
  commentsCount?: number
  sharesCount?: number
  reacted?: string | null
  onLike?: (reactionId?: number) => void
  onComment?: (text: string, files?: File[]) => void
  onRepost?: () => void
  onShare?: () => void
  onMenuClick?: () => void
  className?: string
}

const REACTIONS = [
  { id: 1, name: "J'aime", icon: "👍", color: "#1877F2", anim: "emoji-anim-bounce" },
  { id: 2, name: "J'adore", icon: "😍", color: "#E4405F", anim: "emoji-anim-pulse" },
  { id: 3, name: "Haha", icon: "🤣", color: "#F5C33B", anim: "emoji-anim-shake" },
  { id: 4, name: "Wow", icon: "🤩", color: "#F5A33B", anim: "emoji-anim-spin" },
  { id: 5, name: "Triste", icon: "🥺", color: "#F5A33B", anim: "emoji-anim-float" },
  { id: 6, name: "Grrr", icon: "😤", color: "#E4405F", anim: "emoji-anim-bounce" },
]

const REACTION_TYPE_TO_ID: Record<string, number> = {
  like: 1,
  love: 2,
  haha: 3,
  wow: 4,
  sad: 5,
  angry: 6,
}

const REACTION_ID_TO_TYPE: Record<number, string> = {
  1: "like",
  2: "love",
  3: "haha",
  4: "wow",
  5: "sad",
  6: "angry",
}

function fileIsImage(file?: File | null, url?: string): boolean {
  const type = (file?.type || "").toLowerCase()
  if (type.startsWith("image/")) return true
  if (type.startsWith("video/")) return false
  return !type && /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|jfif)$/i.test((url || "").split("?")[0])
}

function fileIsVideo(file?: File | null, url?: string): boolean {
  const type = (file?.type || "").toLowerCase()
  if (type.startsWith("video/")) return true
  return /\.(mp4|webm|ogv|mov|m4v|avi|mkv|3gp|mpeg|m3u8|wmv)$/i.test((url || "").split("?")[0])
}

function AttachmentPreview({ url, file }: { url: string; file?: File }) {
  if (fileIsImage(file, url)) {
    return <img src={url} alt="" className="w-full h-full object-cover" />
  }
  if (fileIsVideo(file, url)) {
    return (
      <video src={url} className="w-full h-full object-cover bg-black" muted playsInline controls preload="metadata" />
    )
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 px-1">
      <div className="flex flex-col items-center gap-0.5 min-w-0">
        <FileText size={16} className="text-[#A35A2A] shrink-0" />
        <span className="text-[9px] text-[#65676B] truncate max-w-full">{file?.name || "Fichier"}</span>
      </div>
    </div>
  )
}

function ReplyComposer({
  parentId,
  toLabel,
  avatarSrc,
  avatarName,
  value,
  onChange,
  files,
  previews,
  onFiles,
  onRemoveFile,
  onSubmit,
  onCancel,
  nested,
}: {
  parentId: string
  toLabel: string
  avatarSrc?: string | null
  avatarName?: string | null
  value: string
  onChange: (v: string) => void
  files: File[]
  previews: string[]
  onFiles: (files: File[]) => void
  onRemoveFile: (index: number) => void
  onSubmit: () => void
  onCancel: () => void
  nested?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasContent = value.trim().length > 0 || files.length > 0
  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiles(e.target.files ? Array.from(e.target.files) : [])
    e.target.value = ""
  }
  return (
    <div className="mt-2 ml-4">
      <div className="flex items-start gap-2">
        <Avatar src={avatarSrc} name={avatarName} size="xs" className="w-5 h-5 shrink-0" />
        <div className={cn("flex-1 rounded-xl px-3 py-2", nested ? "bg-white" : "bg-[#F0F2F5]")}>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[11px] text-[#65676B]">
              <span className="font-medium">Répondre à</span>{" "}
              <span className="font-semibold text-[#050505]">@{toLabel}</span>
            </p>
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit()
              if (e.key === "Escape") onCancel()
            }}
            placeholder="Écrire une réponse..."
            className="w-full bg-transparent outline-none text-[13px] text-[#050505] placeholder-[#65676B]"
            autoFocus
          />
          {previews.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {previews.map((url, i) => (
                <div
                  key={i}
                  className={cn(
                    "relative shrink-0 rounded-lg overflow-hidden bg-gray-100",
                    fileIsImage(files[i], url) || fileIsVideo(files[i], url) ? "w-16 h-16" : "w-auto min-w-[90px] max-w-[140px] h-16"
                  )}
                >
                  <AttachmentPreview url={url} file={files[i]} />
                  <button
                    onClick={() => onRemoveFile(i)}
                    className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 z-10"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,application/*,text/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              className="hidden"
              onChange={pickFiles}
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="p-1.5 rounded-full hover:bg-gray-200 transition text-[#65676B]"
              title="Joindre une image, vidéo ou fichier"
            >
              <ImageIcon size={15} />
            </button>
            <button
              onClick={onSubmit}
              disabled={!hasContent}
              className={cn(
                "px-3 py-1 rounded-full text-[12px] font-semibold transition",
                hasContent
                  ? "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              Répondre
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 rounded-full text-[12px] font-medium text-[#65676B] hover:bg-gray-100 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatCommentTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const s = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `il y a ${d}j`
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export function PostCard({
  postId,
  author,
  currentUser,
  timeAgo,
  content,
  image,
  video,
  color,
  likesCount = 0,
  commentsCount = 0,
  sharesCount = 0,
  reacted,
  onLike,
  onComment,
  onRepost,
  onShare,
  onMenuClick,
  className,
}: PostCardProps) {
  const [commentText, setCommentText] = useState("")
  const [showReactions, setShowReactions] = useState(false)
  const [selectedReaction, setSelectedReaction] = useState<number | null>(() => {
    if (!reacted) return null
    return REACTION_TYPE_TO_ID[reacted] || null
  })
  const [commentAttachments, setCommentAttachments] = useState<string[]>([])
  const [commentFiles, setCommentFiles] = useState<File[]>([])
  const [comments, setComments] = useState<CommentItem[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [showCommentReactions, setShowCommentReactions] = useState<string | null>(null)
  const [commentReactions, setCommentReactions] = useState<Record<string, number>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [replyPreview, setReplyPreview] = useState<string[]>([])
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)
  const [showAllCommentsModal, setShowAllCommentsModal] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commentHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [contentExpanded, setContentExpanded] = useState(false)
  const isLongContent = typeof content === "string" && content.length > 280

  useEffect(() => {
    if (reacted == null) {
      setSelectedReaction(null)
    } else {
      const id = REACTION_TYPE_TO_ID[reacted]
      if (id) setSelectedReaction(id)
    }
  }, [reacted])

  const loadComments = useCallback(async () => {
    if (!postId) return
    setLoadingComments(true)
    try {
      const userIdParam = currentUser?.id ? `&userId=${currentUser.id}` : ""
      const res = await fetch(`/api/comments?postId=${postId}${userIdParam}`)
      const data = await res.json()
      if (data.success) {
        setComments(data.comments || [])
        const reactionsMap: Record<string, number> = {}
        ;(data.comments || []).forEach((cm: CommentItem) => {
          if (cm.reactionType) {
            const id = REACTION_TYPE_TO_ID[cm.reactionType]
            if (id) reactionsMap[cm.id] = id
          }
          ;(cm.replies || []).forEach((r: CommentItem) => {
            if (r.reactionType) {
              const rid = REACTION_TYPE_TO_ID[r.reactionType]
              if (rid) reactionsMap[r.id] = rid
            }
          })
        })
        setCommentReactions(reactionsMap)
      }
    } catch {
      /* silent */
    } finally {
      setLoadingComments(false)
    }
  }, [postId, currentUser?.id])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  // Lecture automatique de la vidéo quand elle entre dans le viewport, pause sinon
  const videoRef = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const el = videoRef.current
    if (!el || !video) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.muted = true
            el.play().catch(() => {})
          } else {
            el.pause()
          }
        })
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      el.pause()
    }
  }, [video])

  const hasComment = commentText.trim().length > 0 || commentAttachments.length > 0

  const handleReactionSelect = (reactionId: number) => {
    setSelectedReaction(reactionId)
    setShowReactions(false)
    onLike?.(reactionId)
  }

  const handleCommentSubmit = async () => {
    if (!hasComment) return
    if (!currentUser?.id) {
      console.warn("Comment blocked: no current user")
      return
    }
    if (onComment) {
      try {
        await onComment(commentText, commentFiles)
      } catch (err) {
        console.error("onComment failed:", err)
      }
    }
    setCommentText("")
    setCommentAttachments([])
    setCommentFiles([])
    loadComments()
  }

  const handleReplySubmit = async (parentId: string, _parentComment: CommentItem) => {
    if (!replyText.trim() && replyFiles.length === 0) { setReplyingTo(null); return }
    if (!currentUser?.id) return
    try {
      const formData = new FormData()
      formData.append("content", replyText.trim())
      formData.append("postId", postId || "")
      formData.append("userId", currentUser.id)
      if (parentId) formData.append("parentId", parentId)
      replyFiles.forEach((f) => formData.append("files", f))
      const res = await fetch("/api/comments", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        setReplyFiles([])
        setReplyPreview([])
        setComments((prev) => {
          const parentTopComment = prev.find((cm) => cm.id === parentId)
          if (parentTopComment) {
            return prev.map((cm) => cm.id === parentId ? { ...cm, replies: [...(cm.replies || []), { ...data.comment, liked: false, likesCount: 0 }] } : cm)
          } else {
            return prev.map((cm) => {
              const updateReplies = (replies: CommentItem[] = []): CommentItem[] => {
                return replies.map((reply) => {
                  if (reply.id === parentId) {
                    return { ...reply, replies: [...(reply.replies || []), { ...data.comment, liked: false, likesCount: 0 }] }
                  }
                  if (reply.replies && reply.replies.length > 0) {
                    return { ...reply, replies: updateReplies(reply.replies) }
                  }
                  return reply
                })
              }
              return { ...cm, replies: updateReplies(cm.replies) }
            })
          }
        })
        setReplyingTo(null)
        setReplyText("")
        setReplyFiles([])
        setReplyPreview([])
      }
    } catch (err) {
      console.error("Reply failed:", err)
    }
  }

  const cancelReply = useCallback(() => {
    setReplyingTo(null)
    setReplyText("")
    setReplyFiles([])
    setReplyPreview([])
  }, [])

  const handleDeleteComment = async () => {
    if (!deleteCommentId || !currentUser?.id) return
    try {
      const res = await fetch(`/api/comments/${deleteCommentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      })
      const data = await res.json()
      if (data.success) {
        setComments((prev) => prev.filter((cm) => cm.id !== deleteCommentId))
        setDeleteCommentId(null)
      }
    } catch (err) {
      console.error("Delete comment failed:", err)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        const url = URL.createObjectURL(file)
        setCommentAttachments((prev) => [...prev, url])
        setCommentFiles((prev) => [...prev, file])
      })
    }
    e.target.value = ""
  }

  const removeCommentAttachment = (index: number) => {
    setCommentAttachments((prev) => prev.filter((_, i) => i !== index))
    setCommentFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const addReplyFiles = (selected: File[]) => {
    if (!selected.length) return
    setReplyFiles((prev) => [...prev, ...selected])
    setReplyPreview((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))])
  }

  const removeReplyFile = (index: number) => {
    setReplyFiles((prev) => prev.filter((_, i) => i !== index))
    setReplyPreview((prev) => prev.filter((_, i) => i !== index))
  }

  const selectedReactionDef = REACTIONS.find((r) => r.id === selectedReaction)

  let postColor: { bg?: string; text?: string } | null = null
  if (color) {
    try {
      const parsed = typeof color === "string" ? JSON.parse(color) : color
      if (parsed && (parsed.bg || parsed.background)) {
        postColor = { bg: parsed.bg || parsed.background, text: parsed.text || parsed.textColor || "#fff" }
      } else if (typeof parsed === "string") {
        postColor = { bg: parsed, text: "#fff" }
      }
    } catch {
      postColor = { bg: color, text: "#fff" }
    }
  }

  const handleMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    setShowReactions(true)
  }

  const handleMouseLeave = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }
    hideTimerRef.current = setTimeout(() => {
      setShowReactions(false)
    }, 300)
  }

  const handleCommentReactionsEnter = (commentId: string) => {
    if (commentHideTimerRef.current) {
      clearTimeout(commentHideTimerRef.current)
      commentHideTimerRef.current = null
    }
    setShowCommentReactions(commentId)
  }

  const handleCommentReactionsLeave = () => {
    if (commentHideTimerRef.current) {
      clearTimeout(commentHideTimerRef.current)
    }
    commentHideTimerRef.current = setTimeout(() => {
      setShowCommentReactions(null)
    }, 400)
  }

  const visibleComments = comments.slice(0, 2)
  const currentUserAvatar = currentUser?.avatar || author.avatar

  return (
    <article className={cn("bg-white rounded-3xl shadow-sm border border-gray-100", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar src={author.avatar} name={author.name} size="md" verified={author.verified} />
        <div className="flex-1 min-w-0">
          <a
            href={`/profile/${author.username || author.id}`}
            className="font-semibold text-[15px] text-[#050505] truncate hover:underline"
          >
            {author.name}
          </a>
          <p className="text-[12px] text-[#65676B]">{timeAgo}</p>
        </div>
        <button
          onClick={onMenuClick}
          className="p-2 rounded-full hover:bg-gray-100 transition"
          aria-label="Menu"
        >
          <MoreHorizontal size={20} className="text-[#65676B]" />
        </button>
      </div>

      {/* Body */}
      {content && postColor && postColor.bg ? (
        <div
          className="w-full min-h-[280px] py-8 px-6 flex items-center justify-center"
          style={{ background: postColor.bg, color: postColor.text }}
        >
          <p className="text-[28px] font-bold text-center whitespace-pre-wrap leading-relaxed max-w-[85%]">{content}</p>
        </div>
      ) : content && (
        <div className="px-4 py-2">
          <p
            className={cn(
              "text-[15px] text-[#050505] whitespace-pre-wrap leading-relaxed",
              !contentExpanded && isLongContent && "line-clamp-6"
            )}
          >
            {content}
          </p>
          {isLongContent && (
            <button
              onClick={() => setContentExpanded((v) => !v)}
              className="mt-1 text-[13px] font-medium text-[#A35A2A] hover:text-[#8B4A1F]"
            >
              {contentExpanded ? "Voir moins" : "Voir plus"}
            </button>
          )}
        </div>
      )}

      {image && !video && (
        <div className="w-full overflow-hidden">
          <img src={image} alt="" className="w-full max-h-[80vh] object-cover" />
        </div>
      )}

      {video && (
        <div className="w-full overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={video}
            poster={image || undefined}
            controls
            muted
            playsInline
            loop
            preload="metadata"
            className="w-full max-h-[60vh] object-cover"
          />
        </div>
      )}

      {/* Compteurs */}
      <div className="px-4 py-2 flex items-center justify-between text-[13px] text-[#65676B]">
        <div className="flex items-center gap-1">
          {selectedReactionDef ? (
            <span className="flex items-center gap-1">
              <span className="text-[14px]">{selectedReactionDef.icon}</span>
              <span>{likesCount}</span>
            </span>
          ) : (
            <span>{likesCount} J'aime</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>{comments.length > 0 ? comments.length : commentsCount} commentaires</span>
          <span>{sharesCount} partages</span>
        </div>
      </div>

      {/* Boutons d'action - Like en premier */}
      <div className="mx-2 sm:mx-4 border-t border-gray-100 flex relative">
        {/* Bouton Like avec réactions au survol - PREMIER */}
        <div
          className="flex-1 relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            onClick={() => handleReactionSelect(selectedReaction || 1)}
            className={cn(
              "w-full flex items-center justify-center gap-1 sm:gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium rounded-lg my-1 transition",
              selectedReaction ? "text-[#1877F2]" : "text-[#65676B] hover:bg-gray-50"
            )}
          >
            <span className="text-[14px] sm:text-[16px]">
              {selectedReactionDef?.icon || "👍"}
            </span>
            <span className="truncate">{selectedReactionDef?.name || "like"}</span>
          </button>

          {showReactions && (
            <div className="reactions-popup absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-full shadow-xl border border-gray-100 px-3 py-2 flex items-center gap-1 z-[9999]">
              {REACTIONS.map((r, index) => (
                <button
                  key={r.id}
                  onClick={() => handleReactionSelect(r.id)}
                  className="reaction-emoji-btn text-[24px]"
                  title={r.name}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span className={cn("emoji-pop-in", r.anim)} style={{ animationDelay: `${index * 0.05}s` }}>
                    {r.icon}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bouton Dixip */}
        <button
          onClick={() => handleReactionSelect(selectedReaction || 1)}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] transition hover:bg-gray-50 rounded-lg my-1"
        >
          <img src="/images/dixip.png" alt="Dixip" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
          <span className="truncate">Dixip</span>
        </button>

        {/* Bouton Republier */}
        <button
          onClick={onRepost}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] transition hover:bg-gray-50 rounded-lg my-1"
        >
          <Repeat2 size={16} className="sm:hidden shrink-0" />
          <Repeat2 size={18} className="hidden sm:block shrink-0" />
          <span className="truncate">Republier</span>
        </button>

        {/* Bouton Partager */}
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] transition hover:bg-gray-50 rounded-lg my-1"
        >
          <Share2 size={16} className="sm:hidden shrink-0" />
          <Share2 size={18} className="hidden sm:block shrink-0" />
          <span className="truncate">Partager</span>
        </button>
      </div>

      {/* Liste des commentaires */}
      {(visibleComments.length > 0 || loadingComments) && (
        <div className="px-4 py-2 space-y-2">
          {loadingComments && visibleComments.length === 0 ? (
            <div className="text-[12px] text-[#65676B]">Chargement des commentaires...</div>
          ) : (
            <>
              {visibleComments.map((c) => {
                const isAuthor = c.userId === author.id
                const isCurrentUser = c.userId === currentUser?.id
                const commentLikes = c.likesCount || 0
                const commentLiked = c.liked || false
                return (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar src={c.user?.avatar} name={c.user?.name} size="xs" className="w-6 h-6 shrink-0" />
                    <div className="flex-1 bg-[#F0F2F5] rounded-2xl px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-[#050505]">{c.user?.name}</p>
                        {isAuthor && (
                          <span className="text-[10px] bg-[#A35A2A] text-white px-1.5 py-0.5 rounded-full font-medium">Auteur</span>
                        )}
                        <span className="text-[11px] text-[#65676B]">{formatCommentTime(c.createdAt)}</span>
                      </div>
                      <CommentBody content={c.content} image={c.image} video={c.video} file={c.file} fileType={c.fileType} />
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={() => { setReplyingTo(c.id); setReplyText("") }}
                          className="text-[11px] font-medium text-[#65676B] hover:text-[#1877F2]"
                        >
                          Répondre
                        </button>
                        {isCurrentUser && (
                          <button
                            onClick={() => setDeleteCommentId(c.id)}
                            className="text-[11px] font-medium text-[#65676B] hover:text-red-500"
                          >
                            Supprimer
                          </button>
                        )}
                        <div
                          className="relative"
                          onMouseEnter={() => handleCommentReactionsEnter(c.id)}
                          onMouseLeave={handleCommentReactionsLeave}
                        >
                          <button
                            onClick={async () => {
                              if (!currentUser?.id) return
                              const reactionId = selectedReaction || 1
                              const res = await fetch(`/api/comments/${c.id}/like`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId: currentUser.id, type: REACTION_ID_TO_TYPE[reactionId] || "like" }),
                              })
                              const data = await res.json()
                              if (data.success) {
                                setComments((prev) => prev.map((cm) => cm.id === c.id ? { ...cm, liked: data.liked, likesCount: data.likesCount } : cm))
                                if (data.liked) {
                                  setCommentReactions((prev) => ({ ...prev, [c.id]: reactionId }))
                                } else {
                                  setCommentReactions((prev) => {
                                    const next = { ...prev }
                                    delete next[c.id]
                                    return next
                                  })
                                }
                                setShowCommentReactions(null)
                              }
                            }}
                            className={cn("text-[11px] font-medium flex items-center gap-1", commentLiked ? "text-[#E4405F]" : "text-[#65676B] hover:text-[#E4405F]")}
                          >
                            <span>👍</span>
                            {commentLikes > 0 && <span>{commentLikes}</span>}
                            {commentReactions[c.id] && (
                              <span>{REACTIONS.find((r) => r.id === commentReactions[c.id])?.icon}</span>
                            )}
                          </button>
                          {showCommentReactions === c.id && (
                            <div
                              className="absolute bottom-full left-0 mb-1 bg-white rounded-full shadow-lg border border-gray-100 px-2 py-1.5 flex items-center gap-1 z-50"
                              onMouseEnter={() => {
                                if (commentHideTimerRef.current) {
                                  clearTimeout(commentHideTimerRef.current)
                                  commentHideTimerRef.current = null
                                }
                              }}
                              onMouseLeave={handleCommentReactionsLeave}
                            >
                              {REACTIONS.map((r) => (
                                <button
                                  key={r.id}
                                  onClick={async () => {
                                    if (!currentUser?.id) return
                                    const res = await fetch(`/api/comments/${c.id}/like`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ userId: currentUser.id, type: REACTION_ID_TO_TYPE[r.id] || "like" }),
                                    })
                                    const data = await res.json()
                                    if (data.success) {
                                      setComments((prev) => prev.map((cm) => cm.id === c.id ? { ...cm, liked: data.liked, likesCount: data.likesCount } : cm))
                                      setCommentReactions((prev) => ({ ...prev, [c.id]: r.id }))
                                      setShowCommentReactions(null)
                                    }
                                  }}
                                  className="text-[18px] hover:scale-125 transition-transform"
                                  title={r.name}
                                >
                                  <span>{r.icon}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Formulaire de réponse inline */}
                      {!showAllCommentsModal && replyingTo === c.id && (
                        <ReplyComposer
                          parentId={c.id}
                          toLabel={c.user?.username || c.user?.name || ""}
                          avatarSrc={currentUserAvatar}
                          avatarName={currentUser?.name || author.name}
                          value={replyText}
                          onChange={setReplyText}
                          files={replyFiles}
                          previews={replyPreview}
                          onFiles={addReplyFiles}
                          onRemoveFile={removeReplyFile}
                          onSubmit={() => handleReplySubmit(c.id, c)}
                          onCancel={() => {
                            setReplyingTo(null)
                            setReplyText("")
                            setReplyFiles([])
                            setReplyPreview([])
                          }}
                        />
                      )}

{/* Affichage des réponses */}
                       {c.replies && c.replies.length > 0 && (
                         <div className="mt-2 ml-4 space-y-1">
                           {c.replies.slice(0, 2).map((r) => {
                             const rIsAuthor = r.userId === author.id
                             const rIsCurrentUser = r.userId === currentUser?.id
                             const replyLikes = r.likesCount || 0
                             const replyLiked = r.liked || false
                             const parentUser = c.user
                             return (
                               <div key={r.id} className="flex items-start gap-2">
                                 <Avatar src={r.user?.avatar} name={r.user?.name} size="xs" className="w-5 h-5 shrink-0" />
                                 <div className="flex-1 bg-[#F0F2F5] rounded-xl px-2 py-1.5">
                                   <div className="flex items-center gap-2 flex-wrap">
                                     <p className="text-[12px] font-semibold text-[#050505]">{r.user?.name}</p>
                                     <span className="text-[10px] text-[#65676B]">
                                       <span className="font-medium">répondu à</span>{" "}
                                       <span className="font-semibold text-[#1877F2]">
                                         @{parentUser?.username || parentUser?.name}
                                       </span>
                                     </span>
                                     {rIsAuthor && <span className="text-[9px] bg-[#A35A2A] text-white px-1.5 py-0.5 rounded-full">Auteur</span>}
                                     <span className="text-[10px] text-[#65676B]">{formatCommentTime(r.createdAt)}</span>
                                   </div>
                                   <CommentBody size="sm" content={r.content} image={r.image} video={r.video} file={r.file} fileType={r.fileType} />
                                   <div className="flex items-center gap-3 mt-1">
                                    <button
                                      onClick={async () => {
                                        if (!currentUser?.id) return
                                        const reactionId = selectedReaction || 1
                                        const res = await fetch(`/api/comments/${r.id}/like`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ userId: currentUser.id, type: REACTION_ID_TO_TYPE[reactionId] || "like" }),
                                        })
                                        const data = await res.json()
                                        if (data.success) {
                                          setComments((prev) => prev.map((cm) => cm.id === c.id ? {
                                            ...cm,
                                            replies: cm.replies?.map((reply) => reply.id === r.id ? { ...reply, liked: data.liked, likesCount: data.likesCount } : reply)
                                          } : cm))
                                        }
                                      }}
                                      className={cn("text-[10px] font-medium flex items-center gap-1", replyLiked ? "text-[#E4405F]" : "text-[#65676B] hover:text-[#E4405F]")}
                                    >
                                      <span>👍</span>
                                      {replyLikes > 0 && <span>{replyLikes}</span>}
                                    </button>
                                    <button
                                      onClick={() => { setReplyingTo(r.id); setReplyText("") }}
                                      className="text-[10px] font-medium text-[#65676B] hover:text-[#1877F2]"
                                    >
                                      Répondre
                                    </button>
                                    {rIsCurrentUser && (
                                      <button
                                        onClick={() => setDeleteCommentId(r.id)}
                                        className="text-[10px] font-medium text-[#65676B] hover:text-red-500"
                                      >
                                        Supprimer
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* Reply form for replies */}
                                  {!showAllCommentsModal && replyingTo === r.id && (
                                    <div className="mt-2 ml-4">
                                      <div className="flex items-start gap-2">
                                        <Avatar src={currentUserAvatar} name={currentUser?.name} size="xs" className="w-5 h-5 shrink-0" />
                                        <div className="flex-1 bg-white rounded-xl px-3 py-2">
                                          <div className="flex items-center gap-2 mb-1">
                                            <p className="text-[11px] text-[#65676B]">
                                              <span className="font-medium">Répondre à</span>{" "}
                                              <span className="font-semibold text-[#050505]">
                                                @{r.user?.username || r.user?.name}
                                              </span>
                                            </p>
                                          </div>
                                          <input
                                            type="text"
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                handleReplySubmit(r.id, r)
                                              }
                                              if (e.key === "Escape") {
                                                setReplyingTo(null)
                                                setReplyText("")
                                              }
                                            }}
                                            placeholder="Écrire une réponse..."
                                            className="w-full bg-transparent outline-none text-[13px] text-[#050505] placeholder-[#65676B]"
                                            autoFocus
                                          />
                                          <div className="flex items-center gap-2 mt-2">
                                            <button
                                              onClick={() => handleReplySubmit(r.id, r)}
                                              disabled={!replyText.trim()}
                                              className={cn(
                                                "px-3 py-1 rounded-full text-[12px] font-semibold transition",
                                                replyText.trim()
                                                  ? "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
                                                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                              )}
                                            >
                                              Répondre
                                            </button>
                                            <button
                                              onClick={() => { setReplyingTo(null); setReplyText("") }}
                                              className="px-3 py-1 rounded-full text-[12px] font-medium text-[#65676B] hover:bg-gray-100 transition"
                                            >
                                              Annuler
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {comments.length > 2 && (
                <button
                  onClick={() => setShowAllCommentsModal(true)}
                  className="text-[13px] font-medium text-[#A35A2A] hover:underline mt-2 block w-full text-center"
                >
                  Voir tous les commentaires ({comments.length})
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de suppression de commentaire */}
      {deleteCommentId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#050505]">Supprimer le commentaire</h3>
                <p className="text-sm text-[#65676B]">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-[14px] text-[#050505] mb-6">
              Êtes-vous sûr de vouloir supprimer ce commentaire ? Cette action ne peut pas être annulée.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setDeleteCommentId(null)}
                className="px-4 py-2 rounded-full text-[14px] font-medium text-[#65676B] hover:bg-gray-100 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteComment}
                className="px-4 py-2 rounded-full text-[14px] font-semibold bg-red-600 text-white hover:bg-red-700 transition shadow-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour voir tous les commentaires */}
      {showAllCommentsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-4 max-h-[calc(100vh-2rem)] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between p-4">
              <h3 className="text-lg font-semibold text-[#050505]">
                Publication de {author.name}
              </h3>
              <button
                onClick={() => { setShowAllCommentsModal(false); setReplyingTo(null); setReplyText("") }}
                className="p-2 rounded-full hover:bg-gray-100 transition"
              >
                <X size={20} className="text-[#65676B]" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {/* Post content preview */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Avatar src={author.avatar} name={author.name} size="xs" />
                  <p className="text-[13px] font-semibold text-[#050505]">{author.name}</p>
                </div>
                {content && postColor && postColor.bg ? (
                  <div
                    className="w-full min-h-[260px] py-8 px-6 flex items-center justify-center rounded-2xl"
                    style={{ background: postColor.bg, color: postColor.text }}
                  >
                    <p className="text-[28px] font-bold text-center whitespace-pre-wrap leading-relaxed max-w-[85%]">{content}</p>
                  </div>
                ) : content && (
                  <p className="text-[15px] text-[#050505] whitespace-pre-wrap leading-relaxed">{content}</p>
                )}
                {image && !video && (
                  <img src={image} alt="" className="w-full max-h-[70vh] object-contain rounded-2xl bg-black/5" />
                )}
                {video && (
                  <video src={video} poster={image || undefined} controls playsInline className="w-full max-h-[70vh] object-contain bg-black rounded-2xl" />
                )}
              </div>

              {/* All comments */}
              {comments.map((c) => {
                const isAuthor = c.userId === author.id
                const isCurrentUser = c.userId === currentUser?.id
                const commentLikes = c.likesCount || 0
                const commentLiked = c.liked || false
                return (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar src={c.user?.avatar} name={c.user?.name} size="xs" className="w-6 h-6 shrink-0" />
                    <div className="flex-1 bg-[#F0F2F5] rounded-2xl px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-[#050505]">{c.user?.name}</p>
                        {isAuthor && (
                          <span className="text-[10px] bg-[#A35A2A] text-white px-1.5 py-0.5 rounded-full font-medium">Auteur</span>
                        )}
                        <span className="text-[11px] text-[#65676B]">{formatCommentTime(c.createdAt)}</span>
                      </div>
                      <CommentBody content={c.content} image={c.image} video={c.video} file={c.file} fileType={c.fileType} />
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={() => { setReplyingTo(c.id); setReplyText("") }}
                          className="text-[11px] font-medium text-[#65676B] hover:text-[#1877F2]"
                        >
                          Répondre
                        </button>
                        {isCurrentUser && (
                          <button
                            onClick={() => setDeleteCommentId(c.id)}
                            className="text-[11px] font-medium text-[#65676B] hover:text-red-500"
                          >
                            Supprimer
                          </button>
                        )}
                        <div
                          className="relative"
                          onMouseEnter={() => handleCommentReactionsEnter(c.id)}
                          onMouseLeave={handleCommentReactionsLeave}
                        >
                          <button
                            onClick={async () => {
                              if (!currentUser?.id) return
                              const reactionId = selectedReaction || 1
                              const res = await fetch(`/api/comments/${c.id}/like`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId: currentUser.id, type: REACTION_ID_TO_TYPE[reactionId] || "like" }),
                              })
                              const data = await res.json()
                              if (data.success) {
                                setComments((prev) => prev.map((cm) => cm.id === c.id ? { ...cm, liked: data.liked, likesCount: data.likesCount } : cm))
                                if (data.liked) {
                                  setCommentReactions((prev) => ({ ...prev, [c.id]: reactionId }))
                                } else {
                                  setCommentReactions((prev) => {
                                    const next = { ...prev }
                                    delete next[c.id]
                                    return next
                                  })
                                }
                                setShowCommentReactions(null)
                              }
                            }}
                            className={cn("text-[11px] font-medium flex items-center gap-1", commentLiked ? "text-[#E4405F]" : "text-[#65676B] hover:text-[#E4405F]")}
                          >
                            <span>👍</span>
                            {commentLikes > 0 && <span>{commentLikes}</span>}
                            {commentReactions[c.id] && (
                              <span>{REACTIONS.find((r) => r.id === commentReactions[c.id])?.icon}</span>
                            )}
                          </button>
                          {showCommentReactions === c.id && (
                            <div
                              className="absolute bottom-full left-0 mb-1 bg-white rounded-full shadow-lg border border-gray-100 px-2 py-1.5 flex items-center gap-1 z-50"
                              onMouseEnter={() => {
                                if (commentHideTimerRef.current) {
                                  clearTimeout(commentHideTimerRef.current)
                                  commentHideTimerRef.current = null
                                }
                              }}
                              onMouseLeave={handleCommentReactionsLeave}
                            >
                              {REACTIONS.map((r) => (
                                <button
                                  key={r.id}
                                  onClick={async () => {
                                    if (!currentUser?.id) return
                                    const res = await fetch(`/api/comments/${c.id}/like`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ userId: currentUser.id, type: REACTION_ID_TO_TYPE[r.id] || "like" }),
                                    })
                                    const data = await res.json()
                                    if (data.success) {
                                      setComments((prev) => prev.map((cm) => cm.id === c.id ? { ...cm, liked: data.liked, likesCount: data.likesCount } : cm))
                                      setCommentReactions((prev) => ({ ...prev, [c.id]: r.id }))
                                      setShowCommentReactions(null)
                                    }
                                  }}
                                  className="text-[18px] hover:scale-125 transition-transform"
                                  title={r.name}
                                >
                                  <span>{r.icon}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {replyingTo === c.id && (
                        <div className="mt-2 ml-4">
                          <div className="flex items-start gap-2">
                            <Avatar src={currentUserAvatar} name={currentUser?.name} size="xs" className="w-5 h-5 shrink-0" />
                            <div className="flex-1 bg-[#F0F2F5] rounded-xl px-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-[11px] text-[#65676B]">
                                  <span className="font-medium">Répondre à</span>{" "}
                                  <span className="font-semibold text-[#050505]">
                                    @{c.user?.username || c.user?.name}
                                  </span>
                                </p>
                              </div>
                              <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleReplySubmit(c.id, c)
                                  }
                                  if (e.key === "Escape") {
                                    setReplyingTo(null)
                                    setReplyText("")
                                  }
                                }}
                                placeholder="Écrire une réponse..."
                                className="w-full bg-transparent outline-none text-[13px] text-[#050505] placeholder-[#65676B]"
                                autoFocus
                              />
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => handleReplySubmit(c.id, c)}
                                  disabled={!replyText.trim()}
                                  className={cn(
                                    "px-3 py-1 rounded-full text-[12px] font-semibold transition",
                                    replyText.trim()
                                      ? "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
                                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  )}
                                >
                                  Répondre
                                </button>
                                <button
                                  onClick={() => { setReplyingTo(null); setReplyText("") }}
                                  className="px-3 py-1 rounded-full text-[12px] font-medium text-[#65676B] hover:bg-gray-100 transition"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Replies in modal */}
                      {c.replies && c.replies.length > 0 && (
                        <div className="mt-2 ml-4 space-y-2">
                          {c.replies.map((r) => {
                            const rIsAuthor = r.userId === author.id
                            const rIsCurrentUser = r.userId === currentUser?.id
                            const replyLikes = r.likesCount || 0
                            const replyLiked = r.liked || false
                            const parentUser = c.user
                            return (
                              <div key={r.id} className="flex items-start gap-2">
                                <Avatar src={r.user?.avatar} name={r.user?.name} size="xs" className="w-5 h-5 shrink-0" />
                                <div className="flex-1 bg-white rounded-xl px-2 py-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[12px] font-semibold text-[#050505]">{r.user?.name}</p>
                                    <span className="text-[10px] text-[#65676B]">
                                      <span className="font-medium">répondu à</span>{" "}
                                      <span className="font-semibold text-[#1877F2]">
                                        @{parentUser?.username || parentUser?.name}
                                      </span>
                                    </span>
                                    {rIsAuthor && <span className="text-[9px] bg-[#A35A2A] text-white px-1.5 py-0.5 rounded-full">Auteur</span>}
                                    <span className="text-[10px] text-[#65676B]">{formatCommentTime(r.createdAt)}</span>
                                  </div>
                                  <CommentBody size="sm" content={r.content} image={r.image} video={r.video} file={r.file} fileType={r.fileType} />
                                  <div className="flex items-center gap-3 mt-1">
                                    <button
                                      onClick={async () => {
                                        if (!currentUser?.id) return
                                        const reactionId = selectedReaction || 1
                                        const res = await fetch(`/api/comments/${r.id}/like`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ userId: currentUser.id, type: REACTION_ID_TO_TYPE[reactionId] || "like" }),
                                        })
                                        const data = await res.json()
                                        if (data.success) {
                                          setComments((prev) => prev.map((cm) => cm.id === c.id ? {
                                            ...cm,
                                            replies: cm.replies?.map((reply) => reply.id === r.id ? { ...reply, liked: data.liked, likesCount: data.likesCount } : reply)
                                          } : cm))
                                        }
                                      }}
                                      className={cn("text-[10px] font-medium flex items-center gap-1", replyLiked ? "text-[#E4405F]" : "text-[#65676B] hover:text-[#E4405F]")}
                                    >
                                      <span>👍</span>
                                      {replyLikes > 0 && <span>{replyLikes}</span>}
                                    </button>
                                    <button
                                      onClick={() => { setReplyingTo(r.id); setReplyText("") }}
                                      className="text-[10px] font-medium text-[#65676B] hover:text-[#1877F2]"
                                    >
                                      Répondre
                                    </button>
                                    {rIsCurrentUser && (
                                      <button
                                        onClick={() => setDeleteCommentId(r.id)}
                                        className="text-[10px] font-medium text-[#65676B] hover:text-red-500"
                                      >
                                        Supprimer
                                      </button>
                                    )}
                                  </div>

                                  {replyingTo === r.id && (
                                    <div className="mt-2 ml-4">
                                      <div className="flex items-start gap-2">
                                        <Avatar src={currentUserAvatar} name={currentUser?.name} size="xs" className="w-5 h-5 shrink-0" />
                                        <div className="flex-1 bg-white rounded-xl px-3 py-2">
                                          <div className="flex items-center gap-2 mb-1">
                                            <p className="text-[11px] text-[#65676B]">
                                              <span className="font-medium">Répondre à</span>{" "}
                                              <span className="font-semibold text-[#050505]">
                                                @{r.user?.username || r.user?.name}
                                              </span>
                                            </p>
                                          </div>
                                          <input
                                            type="text"
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                handleReplySubmit(r.id, r)
                                              }
                                              if (e.key === "Escape") {
                                                setReplyingTo(null)
                                                setReplyText("")
                                              }
                                            }}
                                            placeholder="Écrire une réponse..."
                                            className="w-full bg-transparent outline-none text-[13px] text-[#050505] placeholder-[#65676B]"
                                            autoFocus
                                          />
                                          <div className="flex items-center gap-2 mt-2">
                                            <button
                                              onClick={() => handleReplySubmit(r.id, r)}
                                              disabled={!replyText.trim()}
                                              className={cn(
                                                "px-3 py-1 rounded-full text-[12px] font-semibold transition",
                                                replyText.trim()
                                                  ? "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
                                                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                              )}
                                            >
                                              Répondre
                                            </button>
                                            <button
                                              onClick={() => { setReplyingTo(null); setReplyText("") }}
                                              className="px-3 py-1 rounded-full text-[12px] font-medium text-[#65676B] hover:bg-gray-100 transition"
                                            >
                                              Annuler
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Barre de commentaire */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 bg-[#F0F2F5] rounded-full px-3 py-1.5">
          <Avatar src={currentUserAvatar} name={currentUser?.name || author.name} size="xs" />
          <input
            id={`comment-input-${postId}`}
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCommentSubmit() }}
            placeholder="Écrire un commentaire..."
            className="flex-1 bg-transparent outline-none text-[14px] text-[#050505] placeholder-[#65676B]"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,audio/*,application/*,text/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="p-1.5 rounded-full hover:bg-gray-200 transition text-[#65676B]"
            title="Ajouter une image"
          >
            <ImageIcon size={16} />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="p-1.5 rounded-full hover:bg-gray-200 transition text-[#65676B]"
            title="Ajouter une vidéo"
          >
            <Video size={16} />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="p-1.5 rounded-full hover:bg-gray-200 transition text-[#65676B]"
            title="Joindre un fichier"
          >
            <FileText size={16} />
          </button>
          <button
            onClick={handleCommentSubmit}
            disabled={!hasComment}
            className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-semibold transition-all duration-300 disabled:opacity-100 disabled:pointer-events-none",
              hasComment
                ? "bg-[#A35A2A] hover:bg-[#8B4A1F] text-white shadow-sm"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <span>Publier</span>
            <Send size={13} className={hasComment ? "text-yellow-400" : "text-gray-400"} />
          </button>
        </div>

        {/* Aperçu des pièces jointes */}
        {commentAttachments.length > 0 && (
          <div className="flex gap-2 mt-2 overflow-x-auto">
            {commentAttachments.map((url, i) => (
              <div
                key={i}
                className={cn(
                  "relative shrink-0 rounded-xl overflow-hidden bg-gray-100",
                  fileIsImage(commentFiles[i], url) || fileIsVideo(commentFiles[i], url) ? "w-16 h-16" : "w-auto min-w-[100px] max-w-[160px] h-16"
                )}
              >
                <AttachmentPreview url={url} file={commentFiles[i]} />
                <button
                  onClick={() => removeCommentAttachment(i)}
                  className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 z-10"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}