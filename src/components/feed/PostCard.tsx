"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react"
import {
  Repeat2,
  Share2,
  Image as ImageIcon,
  Video,
  FileText,
  Send,
  MoreHorizontal,
  X,
  Reply,
  Trash2,
  Flag,
  ChevronDown,
  Bookmark,
  EyeOff,
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import Avatar from "@/components/common/Avatar"
import { CommentBody } from "@/components/feed/CommentBody"
import { toast } from "sonner"
import { REACTIONS, REACTION_ID_TO_TYPE, REACTION_TYPE_TO_ID } from "@/lib/constants"

interface Author {
  id: string
  name: string | null
  avatar: string | null
  username?: string | null
  verified?: boolean
}

interface CommentUser {
  id: string
  name: string | null
  username?: string | null
  avatar: string | null
}

interface CommentItem {
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
  user: CommentUser
  replies?: CommentItem[]
}

interface ReactionSummaryItem {
  type: string
  count: number
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
  /** Post d'origine embarqué lors d'une republication (repost) */
  parentPost?: {
    id: string
    author: Author
    content?: string | null
    image?: string | null
    video?: string | null
    color?: string | null
    timeAgo?: string
  } | null
  /**
   * Répartition des réactions utilisées sur ce post, ex :
   * [{ type: "like", count: 12 }, { type: "love", count: 4 }]
   * Sert à afficher les icônes des réactions les plus utilisées
   * à la place du simple texte "X J'aime". Si absent, on retombe
   * sur la réaction de l'utilisateur courant (ou 👍 par défaut).
   */
  reactions?: ReactionSummaryItem[]
  onLike?: (reactionId?: number) => void
  onComment?: (text: string, files?: File[]) => void | Promise<void>
  onRepost?: () => void
  onShare?: () => void
  onMenuClick?: () => void
  /** Actions du menu « 3 points » : supprimer / sauvegarder / cacher */
  onDelete?: () => void
  onSave?: () => void
  onHide?: () => void
  isSaved?: boolean
  /** Autorise l'affichage de l'action « Supprimer » (réservé à l'auteur du post). */
  canDelete?: boolean
  className?: string
}

function getUserName(user?: CommentUser | null): string {
  return user?.name || user?.username || "Utilisateur"
}

function getUserLabel(user?: CommentUser | null): string {
  return user?.name || user?.username || "cet utilisateur"
}

function fileIsImage(file?: File | null, url?: string): boolean {
  const type = (file?.type || "").toLowerCase()

  if (type.startsWith("image/")) return true
  if (type.startsWith("video/")) return false

  return /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|jfif)$/i.test(
    (url || "").split("?")[0]
  )
}

function fileIsVideo(file?: File | null, url?: string): boolean {
  const type = (file?.type || "").toLowerCase()

  if (type.startsWith("video/")) return true

  return /\.(mp4|webm|ogv|mov|m4v|avi|mkv|3gp|mpeg|m3u8|wmv)$/i.test(
    (url || "").split("?")[0]
  )
}

function AttachmentPreview({
  url,
  file,
}: {
  url: string
  file?: File
}) {
  if (fileIsImage(file, url)) {
    return (
      <Image
        src={url}
        alt=""
        width={400}
        height={300}
        className="w-full h-full object-cover"
        sizes="(max-width: 640px) 100vw, 400px"
      />
    )
  }

  if (fileIsVideo(file, url)) {
    return (
      <video
        src={url}
        className="w-full h-full object-cover bg-black"
        muted
        playsInline
        controls
        preload="metadata"
      />
    )
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 px-1">
      <div className="flex flex-col items-center gap-1 min-w-0">
        <FileText
          size={16}
          className="text-[#A35A2A]"
        />
        <span className="text-[9px] text-[#65676B] truncate max-w-full">
          {file?.name || "Fichier"}
        </span>
      </div>
    </div>
  )
}

function formatCommentTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor(
    (now.getTime() - date.getTime()) / 1000
  )

  if (seconds < 60) return "à l'instant"

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `il y a ${minutes} min`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `il y a ${hours}h`
  }

  const days = Math.floor(hours / 24)

  if (days < 7) {
    return `il y a ${days}j`
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
}

/**
 * Résumé des réactions d'un post : icônes des réactions les plus
 * utilisées (empilées, façon Facebook) + nombre total de likes.
 * Remplace l'ancien texte statique "X J'aime".
 */
function LikesSummary({
  reactions,
  likesCount,
  fallbackReactionId,
}: {
  reactions?: ReactionSummaryItem[]
  likesCount: number
  fallbackReactionId?: number | null
}) {
  if (!likesCount || likesCount <= 0) return null

  let topTypes: string[] = []

  if (reactions && reactions.length > 0) {
    topTypes = [...reactions]
      .filter((reaction) => reaction.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((reaction) => reaction.type)
  }

  // Toujours inclure la réaction de l'utilisateur courant en premier
  const myType = fallbackReactionId
    ? REACTION_ID_TO_TYPE[fallbackReactionId] || "like"
    : null
  if (myType) {
    topTypes = [myType, ...topTypes.filter((t) => t !== myType)]
  }

  if (topTypes.length === 0) topTypes = ["like"]

  const icons = topTypes
    .map(
      (type) =>
        REACTIONS.find((reaction) => reaction.id === REACTION_TYPE_TO_ID[type])
          ?.icon
    )
    .filter(Boolean) as string[]

  if (icons.length === 0) icons.push("👍")

  return (
    <button
      type="button"
      className="flex items-center gap-1.5 hover:underline"
    >
      <div className="flex items-center -space-x-1.5">
        {icons.map((icon, index) => (
          <span
            key={`${icon}-${index}`}
            className="w-[22px] h-[22px] rounded-full bg-white ring-2 ring-white shadow-sm flex items-center justify-center text-[14px] leading-none"
            style={{ zIndex: icons.length - index }}
          >
            {icon}
          </span>
        ))}
      </div>

      <span>{likesCount}</span>
    </button>
  )
}

/**
 * Carte embarquée du post d'origine dans une republication (repost).
 * Affiche l'auteur, le texte (éventuellement coloré) et les médias du post
 * republié, avec le rendu compact et bien délimité du reste du fil.
 */
function ParentPostCard({
  parentPost,
}: {
  parentPost: NonNullable<React.ComponentProps<typeof PostCard>["parentPost"]>
}) {
  const content = parentPost.content
  let bgColor: string | null = null
  let textColor = "#050505"

  if (parentPost.color) {
    try {
      const parsed =
        typeof parentPost.color === "string" ? JSON.parse(parentPost.color) : parentPost.color
      if (parsed && typeof parsed === "object") {
        bgColor = parsed.bg || parsed.background || null
        textColor = parsed.text || parsed.textColor || "#FFFFFF"
      } else {
        bgColor = parsed
        textColor = "#FFFFFF"
      }
    } catch {
      bgColor = parentPost.color
      textColor = "#FFFFFF"
    }
  }

  return (
    <div className="mx-3 sm:mx-4 mt-1 rounded-2xl border border-gray-100 bg-[#F7F8FA] overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <Avatar
          src={parentPost.author.avatar}
          name={parentPost.author.name}
          size="sm"
          verified={parentPost.author.verified}
        />
        <div className="min-w-0">
          <a
            href={`/profile/${parentPost.author.username || parentPost.author.id}`}
            className="block text-[13px] font-semibold text-[#050505] truncate hover:underline"
          >
            {parentPost.author.name}
          </a>
          {parentPost.timeAgo ? (
            <p className="text-[11px] text-[#65676B]">{parentPost.timeAgo}</p>
          ) : null}
        </div>
      </div>

      {content ? (
        bgColor ? (
          <div
            className="w-full min-h-[120px] py-6 px-4 flex items-center justify-center"
            style={{ background: bgColor, color: textColor }}
          >
            <p className="text-[20px] font-bold text-center whitespace-pre-wrap leading-relaxed">
              {content}
            </p>
          </div>
        ) : (
          <p className="px-3 pb-2 pt-1 text-[14px] text-[#050505] whitespace-pre-wrap leading-relaxed">
            {content}
          </p>
        )
      ) : null}

      {parentPost.image && !parentPost.video && (
        <div className="w-full overflow-hidden">
          <Image
            src={parentPost.image}
            alt=""
            width={600}
            height={300}
            className="w-full max-h-[300px] object-cover"
            sizes="(max-width: 640px) 100vw, 600px"
          />
        </div>
      )}

      {parentPost.video && (
        <div className="w-full overflow-hidden bg-black">
          <video
            src={parentPost.video}
            controls
            muted
            playsInline
            loop
            preload="metadata"
            className="w-full max-h-[300px] object-cover"
          />
        </div>
      )}
    </div>
  )
}

/**
 * Bouton d'action uniforme pour les commentaires/réponses
 * (Répondre / Supprimer / Signaler), avec icône + pill au survol.
 */
function CommentActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  onClick: () => void
  variant?: "default" | "danger" | "warning"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
        variant === "danger" &&
          "text-[#65676B] hover:bg-red-50 hover:text-red-600",
        variant === "warning" &&
          "text-[#65676B] hover:bg-orange-50 hover:text-[#E4405F]",
        variant === "default" &&
          "text-[#65676B] hover:bg-[#A35A2A]/10 hover:text-[#A35A2A]"
      )}
    >
      <Icon size={12} />
      {label}
    </button>
  )
}

function ReplyComposer({
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
}: {
  toLabel: string
  avatarSrc?: string | null
  avatarName?: string | null
  value: string
  onChange: (value: string) => void
  files: File[]
  previews: string[]
  onFiles: (files: File[]) => void
  onRemoveFile: (index: number) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasContent = value.trim().length > 0 || files.length > 0

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = event.target.files
      ? Array.from(event.target.files)
      : []

    onFiles(selectedFiles)
    event.target.value = ""
  }

  return (
    <div className="mt-3 ml-2 sm:ml-4 animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="flex items-start gap-2">
        <Avatar
          src={avatarSrc}
          name={avatarName}
          size="xs"
          className="w-6 h-6 shrink-0"
        />

        <div className="flex-1 rounded-2xl bg-[#F0F2F5] px-3 py-2 ring-1 ring-[#A35A2A]/20">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[13px] text-[#65676B] whitespace-nowrap">
              Répondre à
            </span>

            <span className="text-[13px] font-semibold text-[#A35A2A] whitespace-nowrap">
              {toLabel}
            </span>

            <input
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  onSubmit()
                }

                if (event.key === "Escape") {
                  onCancel()
                }
              }}
              placeholder="Écrire une réponse..."
              className="flex-1 min-w-[120px] bg-transparent outline-none text-[13px] text-[#050505] placeholder-[#65676B]"
              autoFocus
            />
          </div>

          {previews.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {previews.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className={cn(
                    "relative shrink-0 rounded-lg overflow-hidden bg-gray-100",
                    fileIsImage(files[index], url) ||
                      fileIsVideo(files[index], url)
                      ? "w-16 h-16"
                      : "w-auto min-w-[90px] max-w-[140px] h-16"
                  )}
                >
                  <AttachmentPreview
                    url={url}
                    file={files[index]}
                  />

                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <input
              ref={videoInputRef}
              type="file"
              multiple
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/*,text/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="p-1.5 rounded-full text-[#65676B] hover:bg-gray-200 transition"
              title="Joindre une image"
            >
              <ImageIcon size={15} />
            </button>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="p-1.5 rounded-full text-[#65676B] hover:bg-gray-200 transition"
              title="Joindre une vidéo"
            >
              <Video size={15} />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-full text-[#65676B] hover:bg-gray-200 transition"
              title="Joindre un fichier"
            >
              <FileText size={15} />
            </button>

            <button
              type="button"
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
              type="button"
              onClick={onCancel}
              className="px-3 py-1 rounded-full text-[12px] text-[#65676B] hover:bg-gray-100 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReplyContent({
  content,
  parentName,
  image,
  video,
  file,
  fileType,
}: {
  content: string
  parentName: string
  image?: string | null
  video?: string | null
  file?: string | null
  fileType?: string | null
}) {
  const normalizedContent = content.trim()
  const normalizedParentName = parentName.trim()

  const startsWithParentName =
    normalizedContent.toLowerCase().startsWith(
      normalizedParentName.toLowerCase()
    )

  if (!startsWithParentName || !normalizedParentName) {
    return (
      <CommentBody
        size="sm"
        content={content}
        image={image}
        video={video}
        file={file}
        fileType={fileType}
      />
    )
  }

  const remainingText = normalizedContent.slice(
    normalizedParentName.length
  )

  return (
    <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
      <span className="font-semibold text-[#A35A2A]">
        {normalizedParentName}
      </span>

      <span className="text-[#050505]">
        {remainingText}
      </span>

      {image || video || file ? (
        <div className="mt-1">
          <CommentBody
            size="sm"
            content=""
            image={image}
            video={video}
            file={file}
            fileType={fileType}
          />
        </div>
      ) : null}
    </div>
  )
}

function ModalPostPreview({
  author,
  timeAgo,
  content,
  image,
  video,
  color,
}: {
  author: Author
  timeAgo?: string
  content?: string
  image?: string
  video?: string
  color?: string | null
}) {
  let postColor: {
    background?: string
    text?: string
  } | null = null

  if (color) {
    try {
      const parsed =
        typeof color === "string" ? JSON.parse(color) : color

      if (parsed && typeof parsed === "object") {
        postColor = {
          background: parsed.bg || parsed.background,
          text: parsed.text || parsed.textColor || "#FFFFFF",
        }
      } else if (typeof parsed === "string") {
        postColor = {
          background: parsed,
          text: "#FFFFFF",
        }
      }
    } catch {
      postColor = {
        background: color,
        text: "#FFFFFF",
      }
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-gray-100 bg-white">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar
          src={author.avatar}
          name={author.name}
          size="md"
          verified={author.verified}
        />

        <div className="flex-1 min-w-0">
          <a
            href={`/profile/${author.username || author.id}`}
            className="font-semibold text-[15px] text-[#050505] truncate hover:underline"
          >
            {author.name}
          </a>

          {timeAgo && (
            <p className="text-[12px] text-[#65676B]">
              {timeAgo}
            </p>
          )}
        </div>
      </div>

      {content && postColor?.background ? (
        <div
          className="w-full min-h-[180px] py-6 px-5 flex items-center justify-center"
          style={{
            background: postColor.background,
            color: postColor.text,
          }}
        >
          <p className="text-[22px] font-bold text-center whitespace-pre-wrap leading-relaxed max-w-[85%]">
            {content}
          </p>
        </div>
      ) : content ? (
        <div className="px-4 py-2">
          <p className="text-[15px] text-[#050505] whitespace-pre-wrap leading-relaxed">
            {content}
          </p>
        </div>
      ) : null}

      {image && !video && (
        <div className="w-full overflow-hidden">
          <Image
            src={image}
            alt=""
            width={800}
            height={450}
            className="w-full max-h-[50vh] object-cover"
            sizes="(max-width: 640px) 100vw, 800px"
          />
        </div>
      )}

      {video && (
        <div className="w-full overflow-hidden bg-black">
          <video
            src={video}
            poster={image || undefined}
            controls
            muted
            playsInline
            preload="metadata"
            className="w-full max-h-[50vh] object-cover"
          />
        </div>
      )}

      {!content && !image && !video && (
        <div className="px-4 py-6 text-center">
          <p className="text-[13px] text-[#65676B]">
            Publication sans contenu
          </p>
        </div>
      )}
    </div>
  )
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
  parentPost,
  likesCount = 0,
  commentsCount = 0,
  sharesCount = 0,
  reacted,
  reactions,
  onLike,
  onComment,
  onRepost,
  onShare,
  onMenuClick,
  onDelete,
  onSave,
  onHide,
  isSaved,
  canDelete,
  className,
}: PostCardProps) {
  const [commentText, setCommentText] = useState("")
  const [commentFiles, setCommentFiles] = useState<File[]>([])
  const [commentPreviews, setCommentPreviews] = useState<string[]>([])
  const [comments, setComments] = useState<CommentItem[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [replyPreviews, setReplyPreviews] = useState<string[]>([])
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)
  const [deleteCommentIsReply, setDeleteCommentIsReply] = useState(false)
  const [showAllCommentsModal, setShowAllCommentsModal] =
    useState(false)
  const [expandedReplies, setExpandedReplies] = useState<
    Record<string, boolean>
  >({})
  const [showReactions, setShowReactions] = useState(false)
  const [showCommentReactions, setShowCommentReactions] =
    useState<string | null>(null)
  const [selectedReaction, setSelectedReaction] = useState<number | null>(
    reacted ? REACTION_TYPE_TO_ID[reacted] || null : null
  )
  const [commentReactions, setCommentReactions] = useState<
    Record<string, number>
  >({})
  const [contentExpanded, setContentExpanded] = useState(false)
  const [postMenuOpen, setPostMenuOpen] = useState(false)

  const postMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (postMenuRef.current && !postMenuRef.current.contains(e.target as Node)) {
        setPostMenuOpen(false)
      }
    }
    if (postMenuOpen) {
      document.addEventListener("mousedown", handler)
      return () => document.removeEventListener("mousedown", handler)
    }
  }, [postMenuOpen])

  useEffect(() => {
    setSelectedReaction(reacted ? REACTION_TYPE_TO_ID[reacted] || null : null)
  }, [reacted])

  const commentImageRef = useRef<HTMLInputElement>(null)
  const commentVideoRef = useRef<HTMLInputElement>(null)
  const commentDocRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hideReactionsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideCommentReactionsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHideReactionsTimer = () => {
    if (hideReactionsTimer.current) {
      clearTimeout(hideReactionsTimer.current)
      hideReactionsTimer.current = null
    }
  }

  const hideReactionsWithDelay = () => {
    clearHideReactionsTimer()
    hideReactionsTimer.current = setTimeout(() => {
      setShowReactions(false)
    }, 180)
  }

  const showCommentReactionPicker = (id: string) => {
    if (hideCommentReactionsTimer.current) {
      clearTimeout(hideCommentReactionsTimer.current)
      hideCommentReactionsTimer.current = null
    }
    setShowCommentReactions(id)
  }

  const hideCommentReactionPicker = () => {
    if (hideCommentReactionsTimer.current) {
      clearTimeout(hideCommentReactionsTimer.current)
    }
    hideCommentReactionsTimer.current = setTimeout(() => {
      setShowCommentReactions(null)
    }, 180)
  }

  const currentUserAvatar = currentUser?.avatar || author.avatar
  const hasComment =
    commentText.trim().length > 0 || commentFiles.length > 0

  const isLongContent =
    typeof content === "string" && content.length > 280

  const loadComments = useCallback(async () => {
    if (!postId) return

    setLoadingComments(true)

    try {
      const userIdQuery = currentUser?.id
        ? `&userId=${currentUser.id}`
        : ""

      const response = await fetch(
        `/api/comments?postId=${postId}${userIdQuery}`
      )

      const data = await response.json()

      if (!data.success) {
        setComments([])
        return
      }

      const loadedComments: CommentItem[] = data.comments || []
      const reactionsMap: Record<string, number> = {}

      const collectReactions = (items: CommentItem[]) => {
        items.forEach((item) => {
          if (item.reactionType) {
            const reactionId =
              REACTION_TYPE_TO_ID[item.reactionType]

            if (reactionId) {
              reactionsMap[item.id] = reactionId
            }
          }

          if (item.replies?.length) {
            collectReactions(item.replies)
          }
        })
      }

      collectReactions(loadedComments)

      setComments(loadedComments)
      setCommentReactions(reactionsMap)
    } catch {
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }, [postId, currentUser?.id])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  useEffect(() => {
    const currentVideo = videoRef.current

    if (!currentVideo || !video) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            currentVideo.muted = true
            currentVideo.play().catch(() => {})
          } else {
            currentVideo.pause()
          }
        })
      },
      { threshold: 0.3 }
    )

    observer.observe(currentVideo)

    return () => {
      observer.disconnect()
      currentVideo.pause()
    }
  }, [video])

  const clearReply = useCallback(() => {
    setReplyingTo(null)
    setReplyText("")
    setReplyFiles([])
    setReplyPreviews([])
  }, [])

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((previous) => ({
      ...previous,
      [commentId]: !previous[commentId],
    }))
  }

  const openReplyComposer = (commentId: string) => {
    setReplyingTo(commentId)
    setReplyText("")
    setReplyFiles([])
    setReplyPreviews([])

    setExpandedReplies((previous) => ({
      ...previous,
      [commentId]: true,
    }))
  }

  const handleCommentFiles = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = event.target.files
      ? Array.from(event.target.files)
      : []

    selectedFiles.forEach((file) => {
      setCommentFiles((previous) => [...previous, file])
      setCommentPreviews((previous) => [
        ...previous,
        URL.createObjectURL(file),
      ])
    })

    event.target.value = ""
  }

  const addReplyFiles = (files: File[]) => {
    if (!files.length) return

    setReplyFiles((previous) => [...previous, ...files])
    setReplyPreviews((previous) => [
      ...previous,
      ...files.map((file) => URL.createObjectURL(file)),
    ])
  }

  const removeReplyFile = (index: number) => {
    setReplyFiles((previous) =>
      previous.filter((_, fileIndex) => fileIndex !== index)
    )

    setReplyPreviews((previous) =>
      previous.filter((_, previewIndex) => previewIndex !== index)
    )
  }

  const removeCommentFile = (index: number) => {
    setCommentFiles((previous) =>
      previous.filter((_, fileIndex) => fileIndex !== index)
    )

    setCommentPreviews((previous) =>
      previous.filter((_, previewIndex) => previewIndex !== index)
    )
  }

  const handleCommentSubmit = async () => {
    if (!hasComment || !currentUser?.id) return

    try {
      await onComment?.(commentText, commentFiles)

      setCommentText("")
      setCommentFiles([])
      setCommentPreviews([])

      await loadComments()
    } catch (error) {
      console.error("Comment failed:", error)
    }
  }

  const handleReplySubmit = async (
    parentId: string,
    parentComment: CommentItem
  ) => {
    if (!replyText.trim() && replyFiles.length === 0) return
    if (!currentUser?.id) return

    const parentName = getUserLabel(parentComment.user)
    const replyContent = `${parentName} ${replyText.trim()}`.trim()

    try {
      const formData = new FormData()

      formData.append("content", replyContent)
      formData.append("postId", postId || "")
      formData.append("userId", currentUser.id)
      formData.append("parentId", parentId)

      replyFiles.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/comments", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!data.success) return

      const newReply: CommentItem = {
        ...data.comment,
        content: replyContent,
        liked: false,
        likesCount: 0,
        replies: [],
      }

      // Le parent logique est la réponse à laquelle on répond (parentId) :
      // en mode local le backend renvoie le même id ; en mode Dughu il renvoie
      // l'id du commentaire racine mais on imbrique immédiatement sous la réponse.
      const targetParentId = parentId

      const addReply = (
        items: CommentItem[]
      ): CommentItem[] => {
        return items.map((item) => {
          if (item.id === targetParentId) {
            return {
              ...item,
              replies: [...(item.replies || []), newReply],
            }
          }

          if (item.replies?.length) {
            return {
              ...item,
              replies: addReply(item.replies),
            }
          }

          return item
        })
      }

      setComments((previous) => addReply(previous))
      clearReply()

      setExpandedReplies((previous) => ({
        ...previous,
        [targetParentId]: true,
      }))
    } catch (error) {
      console.error("Reply failed:", error)
    }
  }

  const handleDeleteComment = async () => {
    if (!deleteCommentId || !currentUser?.id) return

    try {
      const response = await fetch(
        `/api/comments/${deleteCommentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: currentUser.id,
            isReply: deleteCommentIsReply,
          }),
        }
      )

      const data = await response.json()

      if (!data.success) return

      const removeComment = (
        items: CommentItem[]
      ): CommentItem[] => {
        return items
          .filter((item) => item.id !== deleteCommentId)
          .map((item) => ({
            ...item,
            replies: item.replies
              ? removeComment(item.replies)
              : [],
          }))
      }

      setComments((previous) => removeComment(previous))
      setDeleteCommentId(null)
      setDeleteCommentIsReply(false)
    } catch (error) {
      console.error("Delete comment failed:", error)
    }
  }

  const handleCommentReaction = async (
    commentId: string,
    reactionId: number,
    isReply = false
  ) => {
    if (!currentUser?.id) return

    const currentReactionId = commentReactions[commentId] || null
    let newReactionId: number | null
    if (!currentReactionId) newReactionId = reactionId
    else if (currentReactionId === reactionId) newReactionId = null
    else newReactionId = reactionId
    const countDelta = newReactionId ? (currentReactionId ? 0 : 1) : -1

    const updateInTree = (
      items: CommentItem[],
      fn: (item: CommentItem) => CommentItem
    ): CommentItem[] =>
      items.map((item) => {
        if (item.id === commentId) return fn(item)
        if (item.replies?.length) {
          return { ...item, replies: updateInTree(item.replies, fn) }
        }
        return item
      })

    // Mise à jour optimiste (compteur en live + emoji sur le bouton)
    setComments((previous) =>
      updateInTree(previous, (item) => ({
        ...item,
        liked: !!newReactionId,
        likesCount: Math.max(0, (item.likesCount || 0) + countDelta),
      }))
    )

    setCommentReactions((previous) => {
      const next = { ...previous }
      if (newReactionId) next[commentId] = newReactionId
      else delete next[commentId]
      return next
    })

    setShowCommentReactions(null)

    const revert = () => {
      setComments((previous) =>
        updateInTree(previous, (item) => ({
          ...item,
          liked: !!currentReactionId,
          likesCount: Math.max(0, (item.likesCount || 0) - countDelta),
        }))
      )
      setCommentReactions((previous) => {
        const next = { ...previous }
        if (currentReactionId) next[commentId] = currentReactionId
        else delete next[commentId]
        return next
      })
    }

    try {
      const response = await fetch(
        `/api/comments/${commentId}/like`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: currentUser.id,
            type: REACTION_ID_TO_TYPE[reactionId] || "like",
            isReply,
          }),
        }
      )

      const data = await response.json()

      if (!data.success) {
        toast.error(data.message || "Impossible de réagir au commentaire")
        revert()
        return
      }

      if (typeof data.likesCount === "number") {
        setComments((previous) =>
          updateInTree(previous, (item) => ({
            ...item,
            likesCount: data.likesCount,
          }))
        )
      }

      if (newReactionId) {
        const reactionDef = REACTIONS.find((r) => r.id === newReactionId)
        toast.success(`Réaction ${reactionDef?.name || "J'aime"} ajoutée`)
      }
    } catch (error) {
      console.error("Reaction failed:", error)
      toast.error("Erreur réseau lors de la réaction")
      revert()
    }
  }

  const handleReportComment = async (
    commentId: string,
    isReply = false
  ) => {
    if (!currentUser?.id) {
      toast.error("Connectez-vous pour signaler")
      return
    }
    try {
      const response = await fetch(
        `/api/comments/${commentId}/report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: currentUser.id,
            reason: isReply
              ? "Réponse signalée"
              : "Commentaire signalé",
          }),
        }
      )
      const data = await response.json()
      if (data.success) {
        toast.success("Commentaire signalé, merci !")
      } else {
        toast.error(data.message || "Impossible de signaler ce commentaire")
      }
    } catch {
      toast.error("Erreur réseau lors du signalement")
    }
  }

  const renderReplyComposer = (
    parentComment: CommentItem
  ) => {
    if (replyingTo !== parentComment.id) return null

    return (
      <ReplyComposer
        toLabel={getUserLabel(parentComment.user)}
        avatarSrc={currentUserAvatar}
        avatarName={currentUser?.name || author.name}
        value={replyText}
        onChange={setReplyText}
        files={replyFiles}
        previews={replyPreviews}
        onFiles={addReplyFiles}
        onRemoveFile={removeReplyFile}
        onSubmit={() =>
          handleReplySubmit(parentComment.id, parentComment)
        }
        onCancel={clearReply}
      />
    )
  }

  const renderReply = (
    reply: CommentItem,
    parentComment: CommentItem,
    inModal = false
  ) => {
    const replyName = getUserName(reply.user)
    const parentName = getUserLabel(parentComment.user)
    const reactionId = commentReactions[reply.id]
    const replyChildren = reply.replies || []
    const childrenVisible = expandedReplies[reply.id] === true
    const isOwnReply = reply.isMine ?? reply.userId === currentUser?.id

    return (
      <div
        key={reply.id}
        className={cn(
          "relative ml-2 sm:ml-5 pl-3 sm:pl-4 border-l-2 border-[#D9DEE5]",
          inModal ? "mt-4" : "mt-3"
        )}
      >
        <span className="absolute -left-[7px] top-3 w-3 h-3 rounded-full bg-white border-2 border-[#D9DEE5]" />

        <div className="flex items-start gap-2">
          <Avatar
            src={reply.user?.avatar}
            name={reply.user?.name}
            size="xs"
            className="w-6 h-6 shrink-0"
          />

          <div className="flex-1 rounded-2xl bg-white border border-[#E5E7EB] px-3 py-2">
            <div className="flex items-center gap-1 text-[11px] text-[#65676B] mb-1">
              <span className="font-semibold text-[#050505]">
                {replyName}
              </span>

              <span className="text-[#9CA3AF]">—</span>

              <span>a répondu à</span>

              <span className="font-semibold text-[#A35A2A]">
                {parentName}
              </span>
            </div>

            <span className="text-[10px] text-[#65676B]">
              {formatCommentTime(reply.createdAt)}
            </span>

            <ReplyContent
              content={reply.content}
              parentName={parentName}
              image={reply.image}
              video={reply.video}
              file={reply.file}
              fileType={reply.fileType}
            />

            <div className="flex items-center gap-0.5 mt-2 -ml-2">
              <div
                className="relative"
                onMouseEnter={() => showCommentReactionPicker(reply.id)}
                onMouseLeave={hideCommentReactionPicker}
              >
                <button
                  type="button"
                  onClick={() =>
                    handleCommentReaction(
                      reply.id,
                      reactionId || 1,
                      true
                    )
                  }
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors",
                    reply.liked
                      ? "text-[#E4405F] hover:bg-red-50"
                      : "text-[#65676B] hover:bg-red-50 hover:text-[#E4405F]"
                  )}
                >
                  <span>
                    {reactionId
                      ? REACTIONS.find(
                          (reaction) => reaction.id === reactionId
                        )?.icon
                      : "👍"}
                  </span>

                  {reply.likesCount ? (
                    <span>{reply.likesCount}</span>
                  ) : null}
                </button>

                {showCommentReactions === reply.id && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white rounded-full shadow-xl border border-gray-100 px-2 py-1 flex items-center gap-0.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {REACTIONS.map((reaction) => (
                      <button
                        type="button"
                        key={reaction.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCommentReaction(reply.id, reaction.id, true)
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

              <span className="text-[#D1D5DB] text-[10px]" aria-hidden>
                •
              </span>

              <CommentActionButton
                icon={Reply}
                label="Répondre"
                onClick={() => openReplyComposer(reply.id)}
              />

              <span className="text-[#D1D5DB] text-[10px]" aria-hidden>
                •
              </span>

              {isOwnReply ? (
                <CommentActionButton
                  icon={Trash2}
                  label="Supprimer"
                  variant="danger"
                  onClick={() => {
                    setDeleteCommentId(reply.id)
                    setDeleteCommentIsReply(true)
                  }}
                />
              ) : (
                <CommentActionButton
                  icon={Flag}
                  label="Signaler"
                  variant="warning"
                  onClick={() => handleReportComment(reply.id, true)}
                />
              )}
            </div>

            {renderReplyComposer(reply)}

            {replyChildren.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => toggleReplies(reply.id)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-[#65676B] hover:text-[#A35A2A] transition-colors"
                >
                  <span className="text-[#9CA3AF]">—</span>

                  <span>
                    {childrenVisible
                      ? "Masquer les réponses"
                      : replyChildren.length === 1
                        ? "Voir 1 réponse"
                        : `Voir ${replyChildren.length} réponses`}
                  </span>

                  <ChevronDown
                    size={12}
                    className={cn(
                      "transition-transform duration-200",
                      childrenVisible && "rotate-180"
                    )}
                  />
                </button>

                {childrenVisible && (
                  <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    {replyChildren.map((childReply) =>
                      renderReply(childReply, reply, inModal)
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderComment = (
    comment: CommentItem,
    inModal = false
  ) => {
    const commentReplies = comment.replies || []
    const repliesVisible = expandedReplies[comment.id] === true
    const reactionId = commentReactions[comment.id]
    const isOwnComment = comment.isMine ?? comment.userId === currentUser?.id

    return (
      <div
        key={comment.id}
        className={cn(
          "flex items-start gap-2",
          inModal ? "mb-4" : "mb-3"
        )}
      >
        <Avatar
          src={comment.user?.avatar}
          name={comment.user?.name}
          size="xs"
          className="w-7 h-7 shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-[#F0F2F5] px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[13px] font-semibold text-[#050505]">
                {comment.user?.name}
              </p>

              {comment.userId === author.id && (
                <span className="text-[10px] bg-[#A35A2A] text-white px-1.5 py-0.5 rounded-full font-medium">
                  Auteur
                </span>
              )}

              <span className="text-[11px] text-[#65676B]">
                {formatCommentTime(comment.createdAt)}
              </span>
            </div>

            <CommentBody
              content={comment.content}
              image={comment.image}
              video={comment.video}
              file={comment.file}
              fileType={comment.fileType}
            />

            <div className="flex items-center gap-0.5 mt-2 -ml-2">
              <div
                className="relative"
                onMouseEnter={() => showCommentReactionPicker(comment.id)}
                onMouseLeave={hideCommentReactionPicker}
              >
                <button
                  type="button"
                  onClick={() =>
                    handleCommentReaction(
                      comment.id,
                      reactionId || 1
                    )
                  }
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
                    comment.liked
                      ? "text-[#E4405F] hover:bg-red-50"
                      : "text-[#65676B] hover:bg-red-50 hover:text-[#E4405F]"
                  )}
                >
                  <span>
                    {reactionId
                      ? REACTIONS.find(
                          (reaction) => reaction.id === reactionId
                        )?.icon
                      : "👍"}
                  </span>

                  {comment.likesCount ? (
                    <span>{comment.likesCount}</span>
                  ) : null}
                </button>

                {showCommentReactions === comment.id && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white rounded-full shadow-xl border border-gray-100 px-2 py-1 flex items-center gap-0.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {REACTIONS.map((reaction) => (
                      <button
                        type="button"
                        key={reaction.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCommentReaction(comment.id, reaction.id)
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

              <CommentActionButton
                icon={Reply}
                label="Répondre"
                onClick={() => openReplyComposer(comment.id)}
              />

              <span className="text-[#D1D5DB] text-[11px]" aria-hidden>
                •
              </span>

              {isOwnComment ? (
                <CommentActionButton
                  icon={Trash2}
                  label="Supprimer"
                  variant="danger"
                  onClick={() => {
                    setDeleteCommentId(comment.id)
                    setDeleteCommentIsReply(false)
                  }}
                />
              ) : (
                <CommentActionButton
                  icon={Flag}
                  label="Signaler"
                  variant="warning"
                  onClick={() => handleReportComment(comment.id)}
                />
              )}
            </div>

            {renderReplyComposer(comment)}

            {commentReplies.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => toggleReplies(comment.id)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-[#65676B] hover:text-[#A35A2A] transition-colors"
                >
                  <span className="text-[#9CA3AF]">—</span>

                  <span>
                    {repliesVisible
                      ? "Masquer les réponses"
                      : commentReplies.length === 1
                        ? "Voir 1 réponse"
                        : `Voir ${commentReplies.length} réponses`}
                  </span>

                  <ChevronDown
                    size={12}
                    className={cn(
                      "transition-transform duration-200",
                      repliesVisible && "rotate-180"
                    )}
                  />
                </button>

                {repliesVisible && (
                  <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    {commentReplies.map((reply) =>
                      renderReply(reply, comment, inModal)
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const visibleComments = comments.slice(0, 2)

  const selectedReactionDefinition = REACTIONS.find(
    (reaction) => reaction.id === selectedReaction
  )

  let postColor: {
    background?: string
    text?: string
    isImage?: boolean
    overlayColor?: string
  } | null = null

  if (color) {
    try {
      const parsed =
        typeof color === "string" ? JSON.parse(color) : color

      if (parsed && typeof parsed === "object") {
        postColor = {
          background: parsed.bg || parsed.background,
          text: parsed.text || parsed.textColor || "#FFFFFF",
          isImage: parsed.isImage || false,
          overlayColor: parsed.color_1 || undefined,
        }
      } else if (typeof parsed === "string") {
        postColor = {
          background: parsed,
          text: "#FFFFFF",
        }
      }
    } catch {
      postColor = {
        background: color,
        text: "#FFFFFF",
      }
    }
  }

  return (
    <article
      className={cn(
        "bg-white rounded-3xl shadow-sm border border-gray-100",
        className
      )}
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar
          src={author.avatar}
          name={author.name}
          size="md"
          verified={author.verified}
        />

        <div className="flex-1 min-w-0">
          <a
            href={`/profile/${author.username || author.id}`}
            className="font-semibold text-[15px] text-[#050505] truncate hover:underline"
          >
            {author.name}
          </a>

          <p className="text-[12px] text-[#65676B]">
            {timeAgo}
          </p>
        </div>

        <div className="relative shrink-0" ref={postMenuRef}>
          <button
            type="button"
            onClick={() => {
              // Sans actions de menu définies, on conserve l'ancien comportement
              if (!onDelete && !onSave && !onHide) {
                onMenuClick?.()
                return
              }
              setPostMenuOpen((v) => !v)
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Menu"
          >
            <MoreHorizontal
              size={20}
              className="text-[#65676B]"
            />
          </button>

          {postMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-150">
              {onDelete && canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setPostMenuOpen(false)
                    onDelete()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] transition text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <Trash2 size={16} className="text-[#E4405F]" />
                  </span>
                  <span className="text-[13px] font-medium text-[#050505]">Supprimer</span>
                </button>
              )}
              {onSave && (
                <button
                  type="button"
                  onClick={() => {
                    setPostMenuOpen(false)
                    onSave()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] transition text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                    <Bookmark
                      size={16}
                      className={cn("text-[#A35A2A]", isSaved && "fill-[#A35A2A]")}
                    />
                  </span>
                  <span className="text-[13px] font-medium text-[#050505]">
                    {isSaved ? "Retirer des favoris" : "Sauvegarder"}
                  </span>
                </button>
              )}
              {onHide && (
                <button
                  type="button"
                  onClick={() => {
                    setPostMenuOpen(false)
                    onHide()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] transition text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <EyeOff size={16} className="text-[#65676B]" />
                  </span>
                  <span className="text-[13px] font-medium text-[#050505]">Cacher</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {content && postColor?.background ? (
        <div
          className="w-full min-h-[280px] py-8 px-6 flex items-center justify-center relative overflow-hidden"
          style={
            postColor.isImage
              ? {
                  backgroundImage: `url(${postColor.background})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  color: postColor.text,
                }
              : {
                  background: postColor.background,
                  color: postColor.text,
                }
          }
        >
          {/* Voile pour lisibilité sur fond image */}
          {postColor.isImage && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: postColor.overlayColor || "rgba(0,0,0,0.3)",
                opacity: 0.35,
              }}
            />
          )}
          <p className="relative z-10 text-[28px] font-bold text-center whitespace-pre-wrap leading-relaxed max-w-[85%]">
            {content}
          </p>
        </div>
      ) : content ? (
        <div className="px-4 py-2">
          <p
            className={cn(
              "text-[15px] text-[#050505] whitespace-pre-wrap leading-relaxed",
              !contentExpanded &&
                isLongContent &&
                "line-clamp-6"
            )}
          >
            {content}
          </p>

          {isLongContent && (
            <button
              type="button"
              onClick={() =>
                setContentExpanded((previous) => !previous)
              }
              className="mt-1 text-[13px] font-medium text-[#A35A2A] hover:text-[#8B4A1F]"
            >
              {contentExpanded ? "Voir moins" : "Voir plus"}
            </button>
          )}
        </div>
      ) : null}

      {image && !video && (
        <div className="w-full overflow-hidden">
          <Image
            src={image}
            alt=""
            width={1200}
            height={675}
            className="w-full max-h-[80vh] object-cover"
            sizes="100vw"
          />
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

      {parentPost && <ParentPostCard parentPost={parentPost} />}

      <div className="px-4 py-2 flex items-center justify-between text-[13px] text-[#65676B]">
        <LikesSummary
          reactions={reactions}
          likesCount={likesCount}
          fallbackReactionId={selectedReaction}
        />

        <div className="flex items-center gap-3">
          <span>
            {comments.length || commentsCount} commentaires
          </span>

          <span>{sharesCount} partages</span>
        </div>
      </div>

      <div className="mx-2 sm:mx-4 border-t border-gray-100 flex relative">
        <div
          className="flex-1 relative"
          onMouseEnter={() => {
            clearHideReactionsTimer()
            setShowReactions(true)
          }}
          onMouseLeave={hideReactionsWithDelay}
        >
          <button
            type="button"
            onClick={() => {
              const reactionId = selectedReaction || 1
              setSelectedReaction(reactionId)
              onLike?.(reactionId)
            }}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium rounded-lg my-1 transition",
              selectedReaction
                ? "text-[#1877F2]"
                : "text-[#65676B] hover:bg-gray-50"
            )}
          >
            <span className="text-[16px]">
              {selectedReactionDefinition?.icon || "👍"}
            </span>

            <span>
              {selectedReactionDefinition?.name || "J'aime"}
            </span>
          </button>

          {showReactions && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-full shadow-xl border border-gray-100 px-3 py-2 flex items-center gap-1 z-50">
              {REACTIONS.map((reaction) => (
                <button
                  type="button"
                  key={reaction.id}
                  onClick={() => {
                    setSelectedReaction(reaction.id)
                    setShowReactions(false)
                    onLike?.(reaction.id)
                  }}
                  className="text-[24px] hover:scale-125 transition-transform"
                  title={reaction.name}
                >
                  {reaction.icon}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onLike?.(selectedReaction || 1)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] hover:bg-gray-50 rounded-lg my-1"
        >
          <Image
            src="/images/dixip.png"
            alt="Gracier"
            width={20}
            height={20}
            className="w-5 h-5 object-contain"
          />
          Gracier
        </button>

        <button
          type="button"
          onClick={onRepost}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] hover:bg-gray-50 rounded-lg my-1"
        >
          <Repeat2 size={18} />
          Republier
        </button>

        <button
          type="button"
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] hover:bg-gray-50 rounded-lg my-1"
        >
          <Share2 size={18} />
          Partager
        </button>
      </div>

      {(visibleComments.length > 0 || loadingComments) && (
        <div className="px-4 py-3">
          {loadingComments && visibleComments.length === 0 ? (
            <p className="text-[12px] text-[#65676B]">
              Chargement des commentaires...
            </p>
          ) : (
            <>
              {visibleComments.map((comment) =>
                renderComment(comment)
              )}

              {comments.length > 2 && (
                <button
                  type="button"
                  onClick={() => setShowAllCommentsModal(true)}
                  className="w-full text-center text-[13px] font-medium text-[#A35A2A] hover:underline mt-3"
                >
                  Voir tous les commentaires ({comments.length})
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 bg-[#F0F2F5] rounded-full px-3 py-1.5">
          <Avatar
            src={currentUserAvatar}
            name={currentUser?.name || author.name}
            size="xs"
          />

          <input
            id={`comment-input-${postId}`}
            type="text"
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleCommentSubmit()
              }
            }}
            placeholder="Écrire un commentaire..."
            className="flex-1 bg-transparent outline-none text-[14px] text-[#050505] placeholder-[#65676B]"
          />

          <input
            ref={commentImageRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleCommentFiles}
          />

          <input
            ref={commentVideoRef}
            type="file"
            multiple
            accept="video/*"
            className="hidden"
            onChange={handleCommentFiles}
          />

          <input
            ref={commentDocRef}
            type="file"
            multiple
            accept="application/*,text/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            className="hidden"
            onChange={handleCommentFiles}
          />

          <button
            type="button"
            onClick={() => commentImageRef.current?.click()}
            className="p-1.5 rounded-full text-[#65676B] hover:bg-gray-200 transition"
            title="Ajouter une image"
          >
            <ImageIcon size={16} />
          </button>

          <button
            type="button"
            onClick={() => commentVideoRef.current?.click()}
            className="p-1.5 rounded-full text-[#65676B] hover:bg-gray-200 transition"
            title="Ajouter une vidéo"
          >
            <Video size={16} />
          </button>

          <button
            type="button"
            onClick={() => commentDocRef.current?.click()}
            className="p-1.5 rounded-full text-[#65676B] hover:bg-gray-200 transition"
            title="Joindre un fichier"
          >
            <FileText size={16} />
          </button>

          <button
            type="button"
            onClick={handleCommentSubmit}
            disabled={!hasComment}
            className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-semibold transition",
              hasComment
                ? "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            Publier
            <Send size={13} />
          </button>
        </div>

        {commentPreviews.length > 0 && (
          <div className="flex gap-2 mt-2 overflow-x-auto">
            {commentPreviews.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className={cn(
                  "relative shrink-0 rounded-xl overflow-hidden bg-gray-100",
                  fileIsImage(commentFiles[index], url) ||
                    fileIsVideo(commentFiles[index], url)
                    ? "w-16 h-16"
                    : "w-auto min-w-[100px] max-w-[160px] h-16"
                )}
              >
                <AttachmentPreview
                  url={url}
                  file={commentFiles[index]}
                />

                <button
                  type="button"
                  onClick={() => removeCommentFile(index)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteCommentId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#050505]">
              Supprimer le commentaire
            </h3>

            <p className="mt-2 text-sm text-[#65676B]">
              Cette action ne peut pas être annulée.
            </p>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setDeleteCommentId(null)
                  setDeleteCommentIsReply(false)
                }}
                className="px-4 py-2 rounded-full text-sm text-[#65676B] hover:bg-gray-100"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleDeleteComment}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-red-600 text-white hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {showAllCommentsModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 p-3 sm:p-6">
          <div className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold text-[#050505]">
                  Commentaires
                </h3>

                <p className="text-[12px] text-[#65676B]">
                  Publication de {author.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAllCommentsModal(false)
                  clearReply()
                }}
                className="rounded-full p-2 hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X
                  size={20}
                  className="text-[#65676B]"
                />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <ModalPostPreview
                author={author}
                timeAgo={timeAgo}
                content={content}
                image={image}
                video={video}
                color={color}
              />

              {comments.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#65676B]">
                  Aucun commentaire pour le moment.
                </p>
              ) : (
                comments.map((comment) =>
                  renderComment(comment, true)
                )
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}