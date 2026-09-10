"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react"
import {
  Repeat2,
  Share2,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
  Send,
  MoreHorizontal,
  Pen,
  X,
  Reply,
  Trash2,
  Flag,
  ChevronDown,
  Bookmark,
  Ban,
  Gift,
  Link2,
  Loader2,
  Eye,
  EyeOff,
  Smile,
  MessageCircle,
  Users,
  Rocket,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/helpers"
import Avatar from "@/components/common/Avatar"
import FollowButton from "@/components/common/FollowButton"
import PageLikeButton from "@/components/common/PageLikeButton"
import { EntityPreviewCard } from "@/components/feed/EntityPreviewCard"
import { CommentBody } from "@/components/feed/CommentBody"
import { PostMediaLightbox, type LightboxImageItem } from "@/components/feed/PostMediaLightbox"
import { ReactionPicker } from "@/components/feed/ReactionPicker"
import { ReactionSummary } from "@/components/feed/ReactionSummary"
import { ReactionUsersModal } from "@/components/feed/ReactionUsersModal"
import type { ReactionUserItem } from "@/types/posts/post.types"
import { usePostReactions } from "@/hooks/queries/use-post-reactions"
import { toast } from "sonner"
import { REACTIONS, REACTION_ID_TO_TYPE, REACTION_TYPE_TO_ID, POST_PRIVACY_OPTIONS, resolvePostColorCss, normalizeReactionType } from "@/lib/constants"
import { givePoints } from "@/services/posts/feed.service"
import {
  fetchComments,
  addComment,
  deleteComment,
  likeComment,
  reportComment,
} from "@/services/posts/comments.service"
import { userMessage } from "@/lib/api/api-error"
import { RepostWithTextModal } from "@/components/feed/RepostWithTextModal"
import { SharePostModal } from "@/components/feed/SharePostModal"
import { GivePointsModal } from "@/components/feed/GivePointsModal"
import { ParentPostLightbox } from "@/components/feed/ParentPostLightbox"
import { HashtagText } from "@/components/common/HashtagText"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button as UIButton } from "@/components/ui/button"

interface Author {
  id: string
  name: string | null
  avatar: string | null
  username?: string | null
  verified?: boolean
  isFollowing?: boolean
  /** Nombre d'interactions de l'auteur (chiffre « Interactions » de son profil Dughu,
      propagé par mapPost depuis l'objet user embarqué du post). */
  interactionsCount?: number
  /** Défini quand l'auteur est une page (espace) → lien vers /espaces/[pageId] */
  pageId?: string | null
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
  isFollowing?: boolean;
  isFollowLoading?: boolean;
  onToggleFollow?: () => void;
  isPageLiked?: boolean;
  isPageLikeLoading?: boolean;
  onTogglePageLike?: () => void;
  postId?: string
  author: Author
  group?: {
    id: string
    name: string
    slug?: string | null
    avatar?: string | null
  } | null
  currentUser?: {
    id: string
    name: string | null
    avatar: string | null
    /** Identité Dughu de l'utilisateur connecté (modération, points, etc.). */
    dughu?: { userId?: string | number }
  }
  timeAgo?: string
  content?: string
  image?: string
  /** Toutes les images d'un post multi-images (grille d'affichage). */
  images?: { url: string; id?: string }[]
  video?: string
  /** URL du post vocal (fichier audio téléversé). */
  audio?: string
  /** Lien canonique de partage du post (fourni par l'API). */
  shareUrl?: string | null
  color?: string | null
  likesCount?: number
  commentsCount?: number
  sharesCount?: number
  /** Nombre total d'interactions du post (J'aime + Commentaires + Partages).
   * Si absent, le composant le calcule automatiquement depuis les compteurs
   * reçus (localLikesCount + commentsCount + sharesCount). */
  interactionsCount?: number
  viewsCount?: number
  views_count?: number
  reacted?: string | null
  /**
   * Confidentialité du post :
   *  - 0 : Public (tout le monde peut voir)
   *  - 1 : Abonnés (amis acceptés et abonnés)
   *  - 2 : Réseau (réseau uniquement)
   *  - 3 : Amis (amis acceptés uniquement)
   */
  postPrivacy?: 0 | 1 | 2 | 3
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
  /** Liste des personnes ayant réagi (fournie par l'API quand elle est présente).
   * Sert au modal des réactions. Jamais de liste factice : si absente,
   * le modal affiche les compteurs et l'utilisateur courant uniquement. */
  users?: ReactionUserItem[]
  onLike?: (reactionId?: number) => void
  onComment?: (text: string, files?: File[]) => void | Promise<void>
  /** Republier directement, sans texte d'accompagnement. */
  onRepost?: () => void
  /** Republier en ajoutant un texte d'accompagnement (commentaire) au post partagé. */
  onRepostWithText?: (text: string) => void
  onShare?: () => void
  onMenuClick?: () => void
  /** Actions du menu « 3 points » : supprimer / sauvegarder / cacher / bloquer */
  onDelete?: () => void
  onSave?: () => void
  onHide?: () => void
  /** Bloquer (ou débloquer si isBlocked) l'auteur du post via /api/block_user. */
  onBlock?: () => void
  /** L'auteur est déjà bloqué : le libellé devient « Débloquer ». */
  isBlocked?: boolean
  isSaved?: boolean
  /** Autorise l'affichage de l'action « Supprimer » (réservé à l'auteur du post). */
  canDelete?: boolean
  /** Booster la publication (réservé à l'auteur) via /api/boostPost. */
  onBoost?: () => void
  /** Autorise l'affichage de l'action « Booster » (réservé à l'auteur du post). */
  canBoost?: boolean
  /** L'auteur a un Flash actif : affiche un anneau autour de sa photo de profil. */
  hasActiveFlash?: boolean
  /** Les Flash de l'auteur ont déjà été vus : l'anneau devient gris au lieu du dégradé marron. */
  flashViewed?: boolean
  /** Clic sur la photo de profil d'un auteur ayant un Flash → ouvre le visualiseur de Flash. */
  onOpenAuthorFlash?: (author: Author) => void
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
 * Petit badge de confidentialité affiché à côté du temps écoulé du post.
 * Chaque niveau possède sa propre icône (définie dans POST_PRIVACY_OPTIONS) :
 * 0 = Public (globe), 1 = Abonnés (rss), 2 = Réseau (network), 3 = Amis (usercheck).
 */
function PrivacyBadge({ postPrivacy }: { postPrivacy?: 0 | 1 | 2 | 3 }) {
  const option =
    POST_PRIVACY_OPTIONS.find((p) => p.id === postPrivacy) ?? POST_PRIVACY_OPTIONS[0]
  const Icon = option.icon
  return (
    <span className="inline-flex items-center gap-1 text-[#65676B]" title={option.title}>
      <Icon size={12} />
    </span>
  )
}

/**
 * Carte embarquée du post d'origine dans une republication (repost).
 * Affiche l'auteur, le texte (éventuellement coloré) et les médias du post
 * republié, avec le rendu compact et bien délimité du reste du fil.
 * Un clic sur la carte redirige / fait défiler vers le post d'origine avec surbrillance.
 */
function ParentPostCard({
  parentPost,
  currentUser,
}: {
  parentPost: NonNullable<React.ComponentProps<typeof PostCard>["parentPost"]>
  currentUser?: React.ComponentProps<typeof PostCard>["currentUser"]
}) {
  const [showModal, setShowModal] = useState(false)
  const content = parentPost.content
  const resolved = resolvePostColorCss(parentPost.color)
  const bgColor = resolved?.bg ?? null
  const textColor = resolved?.text ?? "#050505"

  const handleNavigateToOrigin = (e: React.MouseEvent) => {
    // Si le clic provient d'un élément interactif interne (lien, bouton, vidéo, etc.), ne pas intercepter
    const target = e.target as HTMLElement
    if (target.closest("a, button, video, input, textarea")) {
      return
    }

    // Ouvre directement la vue immersive où l'on voit le post à droite et les commentaires à gauche
    setShowModal(true)
  }

  return (
    <>
      <div
        onClick={handleNavigateToOrigin}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleNavigateToOrigin(e as unknown as React.MouseEvent)
          }
        }}
        title="Cliquer pour accéder à la publication d'origine"
        className="group mx-3 sm:mx-4 mt-1 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-[#F7F8FA] dark:bg-[#252525] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[#E7D8C4] hover:bg-[#F2F4F8] dark:hover:bg-[#2F2F2F] hover:shadow-sm active:scale-[0.99]"
      >
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              src={parentPost.author.avatar}
              name={parentPost.author.name}
              size="sm"
              verified={parentPost.author.verified}
            />
            <div className="min-w-0">
              {parentPost.author.pageId ? (
                <EntityPreviewCard
                  type="page"
                  pageData={{
                    pageId: parentPost.author.pageId,
                    name: parentPost.author.name,
                    avatar: parentPost.author.avatar,
                    verified: parentPost.author.verified,
                  }}
                  currentUser={currentUser}
                >
                  <a
                    href={`/espaces/${parentPost.author.pageId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block text-[13px] font-semibold text-[#050505] dark:text-[#F3F4F6] truncate hover:underline"
                  >
                    {parentPost.author.name}
                  </a>
                </EntityPreviewCard>
              ) : (
                <EntityPreviewCard
                  type="user"
                  userData={{
                    id: parentPost.author.id,
                    name: parentPost.author.name,
                    avatar: parentPost.author.avatar,
                    username: parentPost.author.username,
                    verified: parentPost.author.verified,
                  }}
                  currentUser={currentUser}
                >
                  <a
                    href={`/profile/${parentPost.author.username || parentPost.author.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block text-[13px] font-semibold text-[#050505] dark:text-[#F3F4F6] truncate hover:underline"
                  >
                    {parentPost.author.name}
                  </a>
                </EntityPreviewCard>
              )}
              {parentPost.timeAgo ? (
                <p className="text-[11px] text-[#65676B] dark:text-[#A1A1AA]">{parentPost.timeAgo}</p>
              ) : null}
            </div>
          </div>

          <span className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-[#8A4D23] bg-[#C47830]/10 px-2 py-0.5 rounded-full group-hover:bg-[#C47830]/20 transition-colors">
            <Repeat2 size={12} className="shrink-0" />
            <span className="hidden sm:inline">Repartagé</span>
          </span>
        </div>

        {content ? (
          bgColor ? (
            <div
              className="w-full min-h-[120px] py-6 px-4 flex items-center justify-center"
              style={{ background: bgColor, color: textColor }}
            >
              <p className="text-[20px] font-bold text-center whitespace-pre-wrap leading-relaxed break-words">
                <HashtagText text={content} hashtagClassName="text-inherit underline" />
              </p>
            </div>
          ) : (
            <p className="px-3 pb-2 pt-1 text-[14px] text-[#050505] dark:text-[#F3F4F6] whitespace-pre-wrap leading-relaxed break-words">
              <HashtagText text={content} />
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
              className="w-full max-h-[300px] object-cover transition-transform duration-300 group-hover:scale-[1.01]"
              sizes="(max-width: 640px) 100vw, 600px"
            />
          </div>
        )}

        {parentPost.video && (
          <div
            className="w-full overflow-hidden bg-black"
            onClick={(e) => e.stopPropagation()}
          >
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

      {showModal && (
        <ParentPostLightbox
          open={showModal}
          onClose={() => setShowModal(false)}
          parentPost={parentPost}
          currentUser={currentUser}
        />
      )}
    </>
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
    <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
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
  const resolved = resolvePostColorCss(color)
  const postColor = resolved ? { background: resolved.bg, text: resolved.text } : null

  return (
    <div className="mb-5 rounded-2xl border border-gray-100 bg-white">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar
          src={author.avatar}
          name={author.name}
          size="md"
          verified={author.verified}
        />

        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="min-w-0">
            <a
              href={author.pageId ? `/espaces/${author.pageId}` : `/profile/${author.username || author.id}`}
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
      </div>

      {content && postColor?.background ? (
        <div
          className="w-full min-h-[180px] py-6 px-5 flex items-center justify-center"
          style={{
            background: postColor.background,
            color: postColor.text,
          }}
        >
          <p className="text-[22px] font-bold text-center whitespace-pre-wrap leading-relaxed max-w-[85%] break-words truncate">
            <HashtagText text={content} hashtagClassName="text-inherit underline" />
          </p>
        </div>
      ) : content ? (
        <div className="px-4 py-2">
          <p className="text-[15px] text-[#050505] whitespace-pre-wrap leading-relaxed truncate">
            <HashtagText text={content} />
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

const EMOJI_LIST = [
  "😀", "😍", "😂", "🥰", "😊", "😎", "🤔", "😴",
  "😢", "😭", "😡", "😯", "😱", "🤯", "🥳", "😇",
  "🔥", "❤️", "💯", "👍", "👎", "👏", "🙌", "💪",
  "🎉", "✨", "⭐", "💡", "👀", "🤝", "✅", "❌",
]

export function PostCard({
  postId,
  author,
  group,
  currentUser,
  timeAgo,
  content,
  image,
  images,
  video,
  audio,
  color,
  parentPost,
  likesCount = 0,
  commentsCount = 0,
  sharesCount = 0,
  interactionsCount,
  viewsCount,
  views_count,
  reacted,
  reactions,
  users,
  postPrivacy = 0,
  onLike,
  onComment,
  onRepost,
  onRepostWithText,
  shareUrl,
  onMenuClick,
  isFollowing = false,
  isFollowLoading = false,
  onToggleFollow,
  isPageLiked = false,
  isPageLikeLoading = false,
  onTogglePageLike,
  onDelete,
  onSave,
  onHide,
  onBlock,
  isBlocked,
  isSaved,
  canDelete,
  onBoost,
  canBoost,
  hasActiveFlash = false,
  flashViewed = false,
  onOpenAuthorFlash,
  className,
}: PostCardProps) {
  const finalViewsCount = viewsCount ?? views_count
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
  const [localLikesCount, setLocalLikesCount] = useState(likesCount)
  const [localSelectedReaction, setLocalSelectedReaction] = useState<number | null>(() => {
    const norm = normalizeReactionType(reacted)
    return norm ? REACTION_TYPE_TO_ID[norm] || null : null
  })
  // `reactions` peut être null quand l'API ne fournit pas de répartition : on garde
  // toujours un tableau pour éviter `is not iterable` / `.filter of null` dans les composants.

  const [localReactions, setLocalReactions] = useState<ReactionSummaryItem[]>(
    Array.isArray(reactions) ? reactions : []
  )
  // Interactions affichées sous le nom de l'auteur : c'est le nombre
  // d'interactions de l'auteur du post (même chiffre « Interactions » que son
  // profil Dughu). Priorité à la prop explicite, sinon champ propagé par
  // mapPost depuis l'objet user embarqué (getTotalInteractions / NbrPostsTotal).
  const authorInteractions =
    interactionsCount ??
    (Number.isFinite(Number(author.interactionsCount))
      ? Number(author.interactionsCount)
      : 0)
  const [commentReactions, setCommentReactions] = useState<
    Record<string, number>
  >({})
  const [contentExpanded, setContentExpanded] = useState(false)
  const [postMenuOpen, setPostMenuOpen] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  // Menu de choix "Republier" + modal de republication avec texte d'accompagnement
  const [repostMenuOpen, setRepostMenuOpen] = useState(false)
  const [repostModalOpen, setRepostModalOpen] = useState(false)
  // Modal de partage du post vers les réseaux sociaux
  const [shareModalOpen, setShareModalOpen] = useState(false)
  // Modal « Donner des points » (menu 3 points → gift)
  const [givePointsOpen, setGivePointsOpen] = useState(false)
  // Envoi rapide de 100 points via le bouton « Gratifier »
  const [sendingPoints, setSendingPoints] = useState(false)
  // Modal de confirmation avant d'envoyer 100 points
  const [confirmPointsOpen, setConfirmPointsOpen] = useState(false)

  // États pour la Lightbox immersive et les réactions
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showReactionUsersModal, setShowReactionUsersModal] = useState(false)
  // Liste des personnes ayant réagi : chargée LAZY à l'ouverture du modal
  // (GET /api/reactions → GET /getPostReactions/{postId}/{userId} de l'API Dughu).
  // L'utilisateur qui consulte (ID Dughu prioritaire, sinon ID local).
  const reactionUsersViewerId = String(currentUser?.dughu?.userId ?? currentUser?.id ?? "")
  const reactionUsersQuery = usePostReactions(postId, reactionUsersViewerId || undefined, showReactionUsersModal)
  const fetchedReactionUsers = reactionUsersQuery.data?.users
  const fetchedReactionSummary = reactionUsersQuery.data?.summary
  // Priorité aux données fetchées quand elles sont disponibles (elles sont plus
  // fraîches et complètes), sinon repli sur les données embarquées du payload.

  const modalReactionUsers: ReactionUserItem[] = (fetchedReactionUsers && fetchedReactionUsers.length > 0
    ? fetchedReactionUsers
    : (Array.isArray(users) ? users : []))
  const modalReactionSummary: { type: string; count: number }[] =
    (fetchedReactionSummary && fetchedReactionSummary.length > 0
      ? fetchedReactionSummary
      : (Array.isArray(localReactions) ? localReactions : []))
  const likeLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const postMenuRef = useRef<HTMLDivElement | null>(null)
  const emojiPickerRef = useRef<HTMLDivElement | null>(null)
  const repostMenuRef = useRef<HTMLDivElement | null>(null)
  const repostModalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setLocalLikesCount(likesCount)
  }, [likesCount])

  useEffect(() => {
    const norm = normalizeReactionType(reacted)
    setLocalSelectedReaction(norm ? REACTION_TYPE_TO_ID[norm] || null : null)
  }, [reacted])

  const [prevReactionsProp, setPrevReactionsProp] = useState(reactions)
  if (prevReactionsProp !== reactions) {
    setPrevReactionsProp(reactions)
    setLocalReactions(Array.isArray(reactions) ? reactions : [])
  }

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
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handler)
      return () => document.removeEventListener("mousedown", handler)
    }
  }, [showEmojiPicker])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        repostMenuOpen &&
        repostMenuRef.current &&
        !repostMenuRef.current.contains(e.target as Node)
      ) {
        setRepostMenuOpen(false)
      }
      if (
        repostModalOpen &&
        repostModalRef.current &&
        !repostModalRef.current.contains(e.target as Node)
      ) {
        setRepostModalOpen(false)
      }
    }
    if (repostMenuOpen || repostModalOpen) {
      document.addEventListener("mousedown", handler)
      return () => document.removeEventListener("mousedown", handler)
    }
  }, [repostMenuOpen, repostModalOpen])

  // Images normalisées pour la Lightbox
  const lightboxImages: LightboxImageItem[] = useMemo(() => {
    if (images && images.length > 0) {
      return images.map((img) => ({ url: img.url, id: img.id }))
    }
    if (image && !video) {
      return [{ url: image }]
    }
    return []
  }, [images, image, video])

  // Gestion optimiste du like et du changement de réaction
  const handleLikeAction = useCallback((reactionId?: number) => {
    const target = reactionId ?? (localSelectedReaction ? localSelectedReaction : 1)
    const prevReaction = localSelectedReaction
    const prevType = prevReaction ? REACTION_ID_TO_TYPE[prevReaction] : null
    const targetType = REACTION_ID_TO_TYPE[target]

    setShowReactions(false)

    if (prevReaction && prevReaction === target) {
      // Annule la réaction (unlike)
      setLocalSelectedReaction(null)
      setLocalLikesCount((c) => Math.max(0, c - 1))
      if (prevType) {
        setLocalReactions((list) =>
          (list || [])
            .map((r) => (r.type === prevType ? { ...r, count: Math.max(0, r.count - 1) } : r))
            .filter((r) => r.count > 0)
        )
      }
      onLike?.(target)
    } else {
      // Applique la nouvelle réaction ou modification
      setLocalSelectedReaction(target)
      if (!prevReaction) {
        setLocalLikesCount((c) => c + 1)
      }
      setLocalReactions((list) => {
        const copy = [...(list || [])]
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
      onLike?.(target)
    }
  }, [localSelectedReaction, onLike])

  // Long press mobile sur le bouton like pour ouvrir le sélecteur
  const handleLikeTouchStart = () => {
    likeLongPressTimer.current = setTimeout(() => {
      setShowReactions(true)
    }, 380)
  }

  const handleLikeTouchEnd = () => {
    if (likeLongPressTimer.current) {
      clearTimeout(likeLongPressTimer.current)
      likeLongPressTimer.current = null
    }
  }

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
    }, 200)
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
  // Le post appartient à l'utilisateur connecté : on masque les actions de
  // modération (bloquer / donner des points) qui n'ont pas de sens sur son propre contenu.
  const ownPost =
    !!currentUser?.id &&
    String(author.id) === String(currentUser.dughu?.userId || "")
  const canBlock = !!onBlock && !ownPost
  const canGivePoints = !!currentUser?.id && !!postId && !ownPost
  // « Copier le lien » est disponible dès qu'on a un identifiant de post.
  const canCopyLink = !!postId

  // Copie le lien du post dans le presse-papiers (shareUrl de l'API, sinon lien
  // construit sur le post courant via /home?post=…).
  const handleCopyLink = async () => {
    const url =
      shareUrl ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/home?post=${encodeURIComponent(postId || "")}`
        : "")
    if (!url) {
      toast.error("Impossible de générer le lien de la publication.")
      setPostMenuOpen(false)
      return
    }
    let ok = false
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
        ok = true
      } else {
        const el = document.createElement("textarea")
        el.value = url
        el.style.position = "fixed"
        el.style.opacity = "0"
        document.body.appendChild(el)
        el.select()
        document.execCommand("copy")
        document.body.removeChild(el)
        ok = true
      }
    } catch {
      ok = false
    }
    if (ok) toast.success("Lien copié !")
    else toast.error("Impossible de copier le lien")
    setPostMenuOpen(false)
  }

  /**
   * Offre 100 points à l'auteur du post en un clic (bouton « Gratifier »).
   * Appelle POST /api/points/give (qui encapsule POST /points/give de l'API Dughu).
   * Appelée depuis la modale de confirmation.
   */
  const handleGivePoints = async () => {
    if (!canGivePoints) return

    setSendingPoints(true)
    try {
      const data = await givePoints({
        postId,
        authorId: String(author.id),
        points: 100,
        userId: currentUser!.id,
        dughuUserId: String(currentUser?.dughu?.userId || ""),
      })
      if (data.success) {
        toast.success("100 points offerts à l'auteur.")
        setConfirmPointsOpen(false)
      } else {
        toast.error(data.message || "Impossible d'offrir des points.")
      }
    } catch (error) {
      toast.error(userMessage(error, "Impossible d'offrir des points."))
    } finally {
      setSendingPoints(false)
    }
  }

  // Preview du post republié dans le composer : si le post est lui-même un
  // repost, on réutilise l'original embarqué ; sinon on utilise le post courant.
  const repostPreviewParent = parentPost ?? {
    id: postId || "",
    author,
    content: content || null,
    image,
    video,
    color,
    timeAgo,
  }
  // Données du post passé au modal de partage
  const sharePreviewPost = {
    id: postId || "",
    content: content || null,
    image,
    video,
    author: {
      id: author.id,
      name: author.name,
      avatar: author.avatar,
      username: author.username,
    },
    shareUrl: shareUrl || null,
  }
  const hasComment =
    commentText.trim().length > 0 || commentFiles.length > 0

  const isLongContent =
    typeof content === "string" && content.length > 280

  const loadComments = useCallback(async () => {
    if (!postId) return

    setLoadingComments(true)

    try {
      const data = await fetchComments({
        postId,
        userId: currentUser?.id,
        dughuUserId: (currentUser as { dughu?: { userId?: string } })?.dughu?.userId,
      })

      if (!data.success) {
        setComments([])
        return
      }

      const loadedComments: CommentItem[] = (data.comments || []) as CommentItem[]
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
            currentVideo.play().catch(() => { })
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

  // Soumission du composer de republication avec texte d'accompagnement.
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

  const handleLightboxAddComment = async (text: string, files?: File[]) => {
    if (!text.trim() && (!files || files.length === 0)) return
    if (!currentUser?.id) {
      toast.error("Connectez-vous pour commenter")
      return
    }
    try {
      await onComment?.(text, files)
      await loadComments()
    } catch (error) {
      console.error("Lightbox comment failed:", error)
      toast.error("Erreur lors de l'ajout du commentaire")
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

      const data = await addComment(formData)

      if (!data.success) return

      const newReply = {
        ...(data.comment as Partial<CommentItem>),
        content: replyContent,
        liked: false,
        likesCount: 0,
        replies: [],
      } as CommentItem

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
      const data = await deleteComment(deleteCommentId, {
        userId: currentUser.id,
        isReply: deleteCommentIsReply,
      })

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
      const data = await likeComment(commentId, {
        userId: currentUser.id,
        type: REACTION_ID_TO_TYPE[reactionId] || "like",
        isReply,
      })

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
        toast.success("Vous avez réagi à ce post")
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
      const data = await reportComment(commentId, {
        userId: currentUser.id,
        reason: isReply ? "Réponse signalée" : "Commentaire signalé",
      })
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
          "relative ml-2 sm:ml-5 pl-3 sm:pl-4 border-l-2 border-[#D9DEE5] dark:border-white/10",
          inModal ? "mt-4" : "mt-3"
        )}
      >
        <span className="absolute -left-[7px] top-3 w-3 h-3 rounded-full bg-white dark:bg-[#1E1E1E] border-2 border-[#D9DEE5] dark:border-white/20" />

        <div className="flex items-start gap-2">
          <Avatar
            src={reply.user?.avatar}
            name={reply.user?.name}
            size="xs"
            className="w-6 h-6 shrink-0"
          />

          <div className="flex-1 rounded-2xl bg-white dark:bg-[#252525] border border-[#E5E7EB] dark:border-white/10 px-3 py-2">
            <div className="flex items-center gap-1 text-[11px] text-[#65676B] dark:text-[#A1A1AA] mb-1">
              <span className="font-semibold text-[#050505] dark:text-[#F3F4F6]">
                {replyName}
              </span>

              <span className="text-[#9CA3AF]">—</span>

              <span>a répondu à</span>

              <span className="font-semibold text-[#A35A2A] dark:text-[#B46D1C]">
                {parentName}
              </span>
            </div>

            <span className="text-[10px] text-[#65676B] dark:text-[#A1A1AA]">
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
          <div className="rounded-2xl bg-[#F0F2F5] dark:bg-[#2A2A2A] px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[13px] font-semibold text-[#050505] dark:text-[#F3F4F6]">
                {comment.user?.name}
              </p>

              {comment.userId === author.id && (
                <span className="text-[10px] bg-[#A35A2A] text-white px-1.5 py-0.5 rounded-full font-medium">
                  Auteur
                </span>
              )}

              <span className="text-[11px] text-[#65676B] dark:text-[#A1A1AA]">
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
    (reaction) => reaction.id === localSelectedReaction
  )

  let postColor: {
    background?: string
    text?: string
    isImage?: boolean
    overlayColor?: string
  } | null = null

  if (color) {
    // Résolution commune des IDs numériques, hex, dégradés et JSON.
    const resolved = resolvePostColorCss(color)
    if (resolved) {
      postColor = {
        background: resolved.bg,
        text: resolved.text,
      }
    }

    // Préserve le support des fonds "image" (isImage / overlayColor)
    // lorsque `color` est un JSON enrichi.
    if (typeof color === "string") {
      try {
        const parsed = JSON.parse(color)
        if (parsed && typeof parsed === "object" && parsed.isImage) {
          postColor = {
            ...(postColor || {}),
            background: parsed.bg || parsed.background || postColor?.background,
            text: parsed.text || parsed.textColor || postColor?.text || "#FFFFFF",
            isImage: true,
            overlayColor: parsed.color_1 || parsed.overlayColor || undefined,
          }
        }
      } catch {
        // pas du JSON : ignoré, la résolution commune a déjà fait le travail
      }
    }
  }

  return (
    <article
      id={postId ? `post-${postId}` : undefined}
      data-post-id={postId}
      className={cn(
        // Mobile : edge-to-edge, séparateur subtil border-b, pas de shadow ni d'arrondi
        "bg-white dark:bg-[#1E1E1E] border-b border-gray-100 dark:border-white/10",
        // sm+ (tablette/desktop) : rendu carte avec arrondi, shadow et bordure complète
        "sm:rounded-3xl sm:shadow-sm sm:border sm:border-gray-100 dark:sm:border-white/10",
        className
      )}
    >

      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {hasActiveFlash ? (
          <button
            type="button"
            onClick={() => onOpenAuthorFlash?.(author)}
            aria-label={`Voir les Flash de ${author.name || "cet utilisateur"}`}
            title="Voir ses Flash"
            className={cn(
              "group relative shrink-0 rounded-full p-[3px] transition hover:opacity-90 hover:shadow-md",
              flashViewed
                ? "bg-gray-300 dark:bg-white/20 hover:shadow-gray-400/30"
                : "bg-gradient-to-br from-[#E08543] to-[#A35A2A] hover:shadow-[#A35A2A]/30"
            )}
          >
            <span className="block rounded-full bg-white dark:bg-[#1E1E1E] p-[2px]">
              <Avatar
                src={author.avatar}
                name={author.name}
                size="md"
                verified={author.verified}
              />
            </span>
          </button>
        ) : (
          <Avatar
            src={author.avatar}
            name={author.name}
            size="md"
            verified={author.verified}
          />
        )}

        <div className="flex-1 min-w-0">
          {author.pageId ? (
            <EntityPreviewCard
              type="page"
              pageData={{
                pageId: author.pageId,
                name: author.name,
                avatar: author.avatar,
                verified: author.verified,
              }}
              currentUser={currentUser}
            >
              <a
                href={`/espaces/${author.pageId}`}
                className="font-semibold text-[15px] text-[#050505] dark:text-[#F3F4F6] truncate hover:underline"
              >
                {author.name}
              </a>
            </EntityPreviewCard>
          ) : (
            <EntityPreviewCard
              type="user"
              userData={{
                id: author.id,
                name: author.name,
                avatar: author.avatar,
                username: author.username,
                verified: author.verified,
                isFollowing: isFollowing,
                isFollowLoading: isFollowLoading,
                onToggleFollow: onToggleFollow,
              }}
              currentUser={currentUser}
            >
              <a
                href={`/profile/${author.username || author.id}`}
                className="font-semibold text-[15px] text-[#050505] dark:text-[#F3F4F6] truncate hover:underline"
              >
                {author.name}
              </a>
            </EntityPreviewCard>
          )}

          {/* Interactions de l'auteur (chiffre « Interactions » de son profil
              Dughu, propagé par mapPost), affiché juste sous son nom. */}
          <span className="block text-[12px] leading-tight text-[#65676B] dark:text-[#A1A1AA]">
            interactions : {formatNumber(authorInteractions)}
          </span>

          <div className="flex items-center gap-1.5 text-[12px] text-[#65676B] dark:text-[#A1A1AA]">
            {timeAgo && <span>{timeAgo}</span>}
            {timeAgo && <span aria-hidden>•</span>}
            <PrivacyBadge postPrivacy={postPrivacy} />
          </div>
        </div>

        {onToggleFollow &&
          !isFollowing &&
          currentUser?.dughu?.userId != null &&
          String(currentUser.dughu.userId) !== String(author.id) && (
            <FollowButton
              isFollowing={isFollowing}
              isLoading={isFollowLoading}
              onClick={onToggleFollow}
              className="mr-1"
            />
          )}

        {onTogglePageLike && !isPageLiked && (
          <PageLikeButton
            isLiked={isPageLiked}
            isLoading={isPageLikeLoading}
            onClick={() => onTogglePageLike()}
            className="mr-1"
          />
        )}

        <div className="relative shrink-0" ref={postMenuRef}>
          <button
            type="button"
            onClick={() => {
              if (!onDelete && !onSave && !onHide && !canBlock && !canGivePoints && !canCopyLink && !(onBoost && canBoost)) {
                onMenuClick?.()
                return
              }
              setPostMenuOpen((v) => !v)
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition"
            aria-label="Menu"
          >
            <MoreHorizontal
              size={20}
              className="text-[#65676B] dark:text-[#A1A1AA]"
            />
          </button>

          {postMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-[#252525] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 py-2 z-50 animate-in fade-in zoom-in duration-150">
              {onBoost && canBoost && (
                <button
                  type="button"
                  onClick={() => {
                    setPostMenuOpen(false)
                    onBoost()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] dark:hover:bg-[#2F2F2F] transition text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/15 flex items-center justify-center shrink-0">
                    <Rocket size={16} className="text-[#A35A2A] dark:text-[#B46D1C]" />
                  </span>
                  <span className="text-[13px] font-medium text-[#050505] dark:text-[#F3F4F6]">Booster</span>
                </button>
              )}
              {onDelete && canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setPostMenuOpen(false)
                    onDelete()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] dark:hover:bg-[#2F2F2F] transition text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                    <Trash2 size={16} className="text-[#E4405F]" />
                  </span>
                  <span className="text-[13px] font-medium text-[#050505] dark:text-[#F3F4F6]">Supprimer</span>
                </button>
              )}
              {onSave && (
                <button
                  type="button"
                  onClick={() => {
                    setPostMenuOpen(false)
                    onSave()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] dark:hover:bg-[#2F2F2F] transition text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/15 flex items-center justify-center shrink-0">
                    <Bookmark
                      size={16}
                      className={cn("text-[#A35A2A] dark:text-[#B46D1C]", isSaved && "fill-[#A35A2A] dark:fill-[#B46D1C]")}
                    />
                  </span>
                  <span className="text-[13px] font-medium text-[#050505] dark:text-[#F3F4F6]">
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
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] dark:hover:bg-[#2F2F2F] transition text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                    <EyeOff size={16} className="text-[#65676B] dark:text-[#A1A1AA]" />
                  </span>
                  <span className="text-[13px] font-medium text-[#050505] dark:text-[#F3F4F6]">Cacher</span>
                </button>
              )}
              {canBlock && (
                <button
                  type="button"
                  onClick={() => {
                    setPostMenuOpen(false)
                    onBlock?.()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] dark:hover:bg-[#2F2F2F] transition text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                    <Ban size={16} className="text-[#E4405F]" />
                  </span>
                  <span className="text-[13px] font-medium text-[#050505] dark:text-[#F3F4F6]">
                    {isBlocked ? "Débloquer" : "Bloquer"}
                  </span>
                </button>
              )}
              {canGivePoints && (
                <button
                  type="button"
                  onClick={() => {
                    setPostMenuOpen(false)
                    setGivePointsOpen(true)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] dark:hover:bg-[#2F2F2F] transition text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/15 flex items-center justify-center shrink-0">
                    <Gift size={16} className="text-[#A35A2A] dark:text-[#B46D1C]" />
                  </span>
                  <span className="text-[13px] font-medium text-[#050505] dark:text-[#F3F4F6]">
                    Donner des points
                  </span>
                </button>
              )}
              {canCopyLink && (
                <button
                  type="button"
                  onClick={() => {
                    setPostMenuOpen(false)
                    void handleCopyLink()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] dark:hover:bg-[#2F2F2F] transition text-left"
                >
                  <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                    <Link2 size={16} className="text-[#65676B] dark:text-[#A1A1AA]" />
                  </span>
                  <span className="text-[13px] font-medium text-[#050505] dark:text-[#F3F4F6]">
                    Copier le lien
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {group && (
        <div className="px-4 pb-3">
          <EntityPreviewCard
            type="group"
            groupData={{
              id: group.id,
              name: group.name,
              slug: group.slug,
              avatar: group.avatar,
            }}
          >
            <Link
              href="/groups"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#C47830]/12 px-3 py-1.5 text-xs font-semibold text-[#8A4D23] transition hover:bg-[#C47830]/20"
            >
              <Users size={14} aria-hidden="true" />
              <span className="truncate">{group.name}</span>
            </Link>
          </EntityPreviewCard>
        </div>
      )}

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
          {postColor.isImage && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: postColor.overlayColor || "rgba(0,0,0,0.3)",
                opacity: 0.35,
              }}
            />
          )}
          <p className="relative z-10 min-w-0 max-w-full text-[28px] font-bold text-center whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere] [word-break:break-word]">
            <HashtagText
              text={content}
              hashtagClassName="text-inherit underline"
            />
          </p>

        </div>
      ) : content ? (
        <div className="min-w-0 w-full max-w-full overflow-hidden px-4 py-2">
          <p
            className={cn(
              "min-w-0 max-w-full text-[15px] text-[#050505] dark:text-[#F3F4F6] whitespace-pre-wrap leading-relaxed",
              "[overflow-wrap:anywhere] [word-break:break-word]",
              !contentExpanded && isLongContent && "line-clamp-6"
            )}
          >
            <HashtagText text={content} />
          </p>

          {isLongContent && (
            <button
              type="button"
              onClick={() => setContentExpanded((previous) => !previous)}
              className="mt-1 text-[13px] font-medium text-[#A35A2A]"
            >
              {contentExpanded ? "Voir moins" : "Voir plus"}
            </button>
          )}
        </div>

      ) : null}

      {images && images.length > 1 ? (
        <div className="grid grid-cols-2 gap-0.5 bg-black cursor-pointer">
          {images.slice(0, 4).map((img, index) => (
            <div
              key={`${img.url}-${index}`}
              onClick={() => {
                setLightboxIndex(index)
                setLightboxOpen(true)
              }}
              className={cn(
                "relative overflow-hidden bg-black group/gridimg hover:opacity-95 transition-opacity",
                images.length === 3 && index === 0 && "row-span-2",
                images.length !== 3 && "aspect-square",
                images.length === 3 && index !== 0 && "aspect-square"
              )}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 500px"
                className="object-cover group-hover/gridimg:scale-[1.02] transition-transform duration-300"
              />
              {index === 3 && images.length > 4 && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-xl font-semibold">
                  +{images.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : image && !video ? (
        <div
          onClick={() => {
            setLightboxIndex(0)
            setLightboxOpen(true)
          }}
          className={cn(
            "w-full overflow-hidden cursor-pointer group/singleimg",
            group && "relative aspect-[4/3] sm:aspect-video bg-black"
          )}
        >
          {group ? (
            <Image
              src={image}
              alt=""
              fill
              className="object-cover group-hover/singleimg:scale-[1.01] transition-transform duration-300"
              sizes="(max-width: 767px) 100vw, 820px"
            />
          ) : (
            <Image
              src={image}
              alt=""
              width={1200}
              height={675}
              className="w-full max-h-[80vh] object-cover group-hover/singleimg:opacity-98 transition-opacity"
              sizes="100vw"
            />
          )}
        </div>
      ) : null}

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

      {audio && !image && !video ? (
        <div className="flex items-center gap-3 bg-[#F7F8FA] px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A35A2A]/10">
            <Mic size={18} className="text-[#A35A2A]" />
          </span>
          <audio controls src={audio} preload="metadata" className="w-full min-w-0" />
        </div>
      ) : null}

      {parentPost && <ParentPostCard parentPost={parentPost} currentUser={currentUser} />}

      <div className="px-4 py-2 flex items-center justify-between text-[13px] text-[#65676B]">
        <ReactionSummary
          reactions={localReactions}
          likesCount={localLikesCount}
          fallbackReactionId={localSelectedReaction}
          onClick={() => setShowReactionUsersModal(true)}
        />

        <div className="flex items-center gap-4 ml-auto">
          {finalViewsCount !== undefined && finalViewsCount !== null && (
            <div
              className="flex items-center gap-1.5 text-[#65676B]"
              title={`${finalViewsCount} vue${Number(finalViewsCount) > 1 ? "s" : ""}`}
            >
              <Eye size={16} className="text-[#65676B]" />
              <span>{formatNumber(Number(finalViewsCount) || 0)}</span>
            </div>
          )}

          {commentsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllCommentsModal(true)}
              className="flex items-center gap-1.5 hover:underline"
              title="Commentaires"
            >
              <MessageCircle size={16} className="text-[#65676B]" />
              <span>{commentsCount}</span>
            </button>
          )}

          {sharesCount > 0 && (
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="flex items-center gap-1.5 hover:underline"
              title="Partages"
            >
              <Share2 size={16} className="text-[#65676B]" />
              <span>{sharesCount}</span>
            </button>
          )}
        </div>
      </div>

      <div className="mx-2 sm:mx-4 border-t border-gray-100 dark:border-white/10 flex relative">
        <div
          className="flex-1 relative min-w-0"
          onMouseEnter={() => {
            clearHideReactionsTimer()
            setShowReactions(true)
          }}
          onMouseLeave={hideReactionsWithDelay}
        >
          <button
            type="button"
            onClick={() => handleLikeAction()}
            onTouchStart={handleLikeTouchStart}
            onTouchEnd={handleLikeTouchEnd}
            className={cn(
              "w-full flex items-center justify-center gap-1 sm:gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium rounded-lg my-1 transition",
              localSelectedReaction
                ? "text-[#A35A2A] dark:text-[#B46D1C]"
                : "text-[#65676B] dark:text-[#A1A1AA] hover:bg-gray-50 dark:hover:bg-[#2A2A2A]"
            )}
          >
            <span className="text-[16px] sm:text-[18px] shrink-0">
              {selectedReactionDefinition?.icon || "👍"}
            </span>
            <span className="hidden sm:inline">{selectedReactionDefinition?.name || "J'aime"}</span>
          </button>

          {showReactions && (
            <ReactionPicker
              selectedReactionId={localSelectedReaction}
              onSelect={handleLikeAction}
              onClose={() => setShowReactions(false)}
              align="left"
              className="bottom-full mb-2"
            />
          )}
        </div>

        {canGivePoints && (
          <button
            type="button"
            onClick={() => setConfirmPointsOpen(true)}
            className="flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] dark:text-[#A1A1AA] hover:bg-gray-50 dark:hover:bg-[#2A2A2A] rounded-lg my-1 transition"
            aria-label="Gratifier l'auteur de ce post de 100 points"
          >
            <Image
              src="/images/dixip.png"
              alt="Gratifier"
              width={20}
              height={20}
              className="w-5 h-5 object-contain"
            />
            <span className="hidden sm:inline">Gratifier</span>
          </button>
        )}

        <div className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setRepostMenuOpen((v) => !v)}
            className="flex w-full items-center justify-center gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] dark:text-[#A1A1AA] hover:bg-gray-50 dark:hover:bg-[#2A2A2A] rounded-lg my-1"
          >
            <Repeat2 size={18} />
            <span className="hidden sm:inline">Republier</span>
          </button>

          {repostMenuOpen && (
            <div
              ref={repostMenuRef}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white dark:bg-[#252525] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 py-1.5 z-50 animate-in fade-in zoom-in duration-150"
            >
              <button
                type="button"
                onClick={() => {
                  setRepostMenuOpen(false)
                  onRepost?.()
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] dark:hover:bg-[#2F2F2F] transition text-left"
              >
                <Repeat2 size={14} className="text-[#65676B] dark:text-[#A1A1AA]" />
                <span className="text-[13px] font-medium text-[#050505] dark:text-[#F3F4F6]">
                  Republier directement
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRepostMenuOpen(false)
                  setRepostModalOpen(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F2F5] dark:hover:bg-[#2F2F2F] transition text-left"
              >
                <Pen size={14} className="text-[#A35A2B] dark:text-[#B46D1C]" />
                <span className="text-[13px] font-medium text-[#050505] dark:text-[#F3F4F6]">
                  Écrire un commentaire
                </span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShareModalOpen(true)}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 text-[13px] sm:text-[15px] font-medium text-[#65676B] dark:text-[#A1A1AA] hover:bg-gray-50 dark:hover:bg-[#2A2A2A] rounded-lg my-1"
        >
          <Share2 size={18} />
          <span className="hidden sm:inline">Partager</span>
        </button>
      </div>

      {shareModalOpen && (
        <SharePostModal
          isOpen={shareModalOpen}
          setIsOpen={setShareModalOpen}
          onClose={() => setShareModalOpen(false)}
          post={sharePreviewPost}
        />
      )}

      {repostModalOpen && (
        <RepostWithTextModal
          isOpen={repostModalOpen}
          setIsOpen={setRepostModalOpen}
          onClose={() => setRepostModalOpen(false)}
          onSubmit={(text) => {
            onRepostWithText?.(text)
            setRepostModalOpen(false)
          }}
          parentPost={repostPreviewParent}
        />
      )}

      {givePointsOpen && (
        <GivePointsModal
          isOpen={givePointsOpen}
          setIsOpen={setGivePointsOpen}
          onClose={() => setGivePointsOpen(false)}
          postId={postId}
          author={author}
          currentUser={currentUser}
        />
      )}

      {/* Modale de confirmation du bouton « Gratifier » */}
      <Dialog open={confirmPointsOpen} onOpenChange={setConfirmPointsOpen}>
        <DialogContent showCloseButton className="max-w-sm max-h-[90vh] overflow-y-auto mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50">
                <Gift size={18} className="text-[#A35A2B]" />
              </span>
              Gratifier l'auteur
            </DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment offrir <strong>100 points</strong> à{" "}
              <strong>{author.name || "cet utilisateur"}</strong> pour cette publication ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <UIButton
              variant="outline"
              onClick={() => setConfirmPointsOpen(false)}
              disabled={sendingPoints}
            >
              Annuler
            </UIButton>
            <UIButton
              className="bg-[#A35A2B] text-white hover:bg-[#8B4A1F]"
              onClick={() => void handleGivePoints()}
              disabled={sendingPoints}
            >
              {sendingPoints ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Envoi...
                </span>
              ) : (
                "Confirmer"
              )}
            </UIButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-white/10">
        <div className="relative flex items-center gap-2 bg-[#F0F2F5] dark:bg-[#2A2A2A] rounded-full px-3 py-1.5">
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
            className="flex-1 bg-transparent outline-none text-[14px] text-[#050505] dark:text-[#F3F4F6] placeholder-[#65676B] dark:placeholder-[#8E9094]"
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
            className="p-1.5 rounded-full text-[#65676B] hover:bg-gray-200 transition hidden sm:flex"
            title="Ajouter une image"
          >
            <ImageIcon size={16} />
          </button>

          <button
            type="button"
            onClick={() => commentVideoRef.current?.click()}
            className="p-1.5 rounded-full text-[#65676B] hover:bg-gray-200 transition hidden sm:flex"
            title="Ajouter une vidéo"
          >
            <Video size={16} />
          </button>

          <button
            type="button"
            onClick={() => commentDocRef.current?.click()}
            className="p-1.5 rounded-full text-[#65676B] hover:bg-gray-200 transition hidden sm:flex"
            title="Joindre un fichier"
          >
            <FileText size={16} />
          </button>

          <div ref={emojiPickerRef} className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className={cn(
                "p-1.5 rounded-full transition flex items-center justify-center",
                showEmojiPicker
                  ? "bg-[#A35A2A]/10 text-[#A35A2A]"
                  : "text-[#65676B] hover:bg-gray-200"
              )}
              title="Choisir un émoji"
            >
              <Smile size={18} />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 w-64 rounded-2xl bg-white shadow-2xl border border-gray-200 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setCommentText((prev) => prev + emoji)
                      }}
                      className="flex items-center justify-center w-7 h-7 text-[18px] hover:bg-gray-100 rounded-lg transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

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

      {/* Lightbox / Media Viewer immersif pour les images */}
      {lightboxImages.length > 0 && (
        <PostMediaLightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={lightboxImages}
          initialIndex={lightboxIndex}
          author={author}
          timeAgo={timeAgo}
          content={content}
          postId={postId}
          shareUrl={shareUrl || null}
          postPrivacy={postPrivacy}
          likesCount={localLikesCount || 0}
          reactions={localReactions}
          selectedReaction={localSelectedReaction}
          onLike={handleLikeAction}
          onOpenReactionsModal={() => setShowReactionUsersModal(true)}
          onShare={() => setShareModalOpen(true)}
          comments={comments}
          loadingComments={loadingComments}
          currentUser={currentUser}
          onAddComment={handleLightboxAddComment}
          onLikeComment={(cId, rId, isReply) => handleCommentReaction(cId, rId, isReply)}
          onDeleteComment={(cId, isReply) => {
            setDeleteCommentId(cId)
            setDeleteCommentIsReply(!!isReply)
          }}
          onReportComment={(cId, isReply) => handleReportComment(cId, isReply)}
          onReplyComment={async (parentId, text) => {
            const parent = comments.find((c) => c.id === parentId)
            if (parent) {
              setReplyingTo(parentId)
              setReplyText(text)
              await handleReplySubmit(parentId, parent)
            }
          }}
        />
      )}

      {/* Modale / Bottom Sheet des personnes ayant réagi */}
      <ReactionUsersModal
        open={showReactionUsersModal}
        onClose={() => setShowReactionUsersModal(false)}
        reactionsSummary={modalReactionSummary}
        totalCount={localLikesCount || 0}
        loading={reactionUsersQuery.isLoading}
        error={reactionUsersQuery.isError}
        users={Array.isArray(modalReactionUsers) ? modalReactionUsers : []}
        currentUserReaction={localSelectedReaction ? REACTION_ID_TO_TYPE[localSelectedReaction] : null}
        currentUser={currentUser}
      />
    </article>
  )
}
