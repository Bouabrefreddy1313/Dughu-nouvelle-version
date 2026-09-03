/**
 * Fonctions utilitaires et mappers défensifs pour le module Akwaplay (Vidéos).
 */

import type {
  AkwaVideo,
  AkwaComment,
  AkwaCommentReply,
  AkwaCategory,
  AkwaAuthor,
  AkwaChannel,
} from "@/types/akwaplay/akwaplay.types"

/**
 * Formate une durée en secondes sous forme mm:ss ou hh:mm:ss.
 * @example formatVideoDuration(65) => "01:05"
 * @example formatVideoDuration(3665) => "01:01:05"
 */
export function formatVideoDuration(seconds: number | string | undefined | null): string {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  const paddedMins = String(minutes).padStart(2, "0")
  const paddedSecs = String(secs).padStart(2, "0")

  if (hours > 0) {
    const paddedHours = String(hours).padStart(2, "0")
    return `${paddedHours}:${paddedMins}:${paddedSecs}`
  }

  return `${paddedMins}:${paddedSecs}`
}

/**
 * Formate le nombre de vues en notation lisible (française).
 * @example formatViewsCount(850) => "850 vues"
 * @example formatViewsCount(1400) => "1,4 k vues"
 * @example formatViewsCount(2500000) => "2,5 M de vues"
 */
export function formatViewsCount(views: number | string | undefined | null): string {
  const count = Math.max(0, Math.floor(Number(views) || 0))

  if (count === 0) return "0 vue"
  if (count === 1) return "1 vue"

  if (count >= 1_000_000) {
    const val = (count / 1_000_000).toFixed(1).replace(".", ",")
    return `${val.endsWith(",0") ? val.slice(0, -2) : val} M de vues`
  }

  if (count >= 1_000) {
    const val = (count / 1_000).toFixed(1).replace(".", ",")
    return `${val.endsWith(",0") ? val.slice(0, -2) : val} k vues`
  }

  return `${count} vues`
}

/**
 * Formate une date relative (ex : "il y a 2 jours", "il y a 3 semaines").
 */
export function formatRelativeTime(dateString: string | undefined | null): string {
  if (!dateString) return "récemment"

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return String(dateString)

  const now = new Date()
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))

  if (diffInSeconds < 60) return "à l'instant"

  const minutes = Math.floor(diffInSeconds / 60)
  if (minutes < 60) return `il y a ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days} jour${days > 1 ? "s" : ""}`

  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`

  const months = Math.floor(days / 30)
  if (months < 12) return `il y a ${months} mois`

  const years = Math.floor(days / 365)
  return `il y a ${years} an${years > 1 ? "s" : ""}`
}

/**
 * Normalise un auteur brut provenant de l'API.
 */
export function parseDurationToSeconds(duration: unknown): number {
  if (typeof duration === "number") return Math.max(0, duration)
  if (typeof duration === "string") {
    const trimmed = duration.trim()
    if (trimmed.includes(":")) {
      const parts = trimmed.split(":").map((p) => Number(p) || 0)
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
      if (parts.length === 2) return parts[0] * 60 + parts[1]
    }
    const parsed = Number(trimmed)
    return isNaN(parsed) ? 0 : Math.max(0, parsed)
  }
  return 0
}

/**
 * Normalise un auteur brut provenant de l'API.
 */
export function normalizeAkwaAuthor(raw: any): AkwaAuthor {
  if (!raw || typeof raw !== "object") {
    return {
      id: "unknown",
      name: "Utilisateur",
      username: null,
      avatar: "/images/avatar.png",
      verified: false,
    }
  }

  const firstName = raw.first_name ?? raw.firstName ?? ""
  const lastName = raw.last_name ?? raw.lastName ?? ""
  const fullName = `${firstName} ${lastName}`.trim()
  const fallbackUsername = raw.username ?? raw.user_name ?? "Créateur"
  const defaultName = fullName || fallbackUsername

  return {
    id: raw.id ?? raw.user_id ?? raw.userId ?? "unknown",
    name: raw.name ?? defaultName,
    username: raw.username ?? raw.user_name ?? null,
    avatar:
      raw.profile_photo_url ??
      raw.avatar ??
      raw.photo ??
      raw.profile_picture ??
      "/images/avatar.png",
    verified: Boolean(raw.verified ?? raw.is_verified ?? raw.verified_icon_formatted),
    subscribersCount: Number(raw.subscribers_count ?? raw.subscribersCount ?? 0),
    isSubscribed: Boolean(raw.is_subscribed ?? raw.isSubscribed),
  }
}

/**
 * Normalise une catégorie brute de l'API.
 */
export function normalizeAkwaCategory(raw: any): AkwaCategory {
  if (!raw || typeof raw !== "object") {
    return { id: 0, name: "Tous" }
  }

  return {
    id: raw.id ?? raw.category_id ?? 0,
    name: raw.name ?? raw.title ?? raw.category_name ?? "Catégorie",
    slug: raw.slug ?? "",
    icon: raw.icon ?? undefined,
    description: raw.description ?? undefined,
    videosCount: Number(raw.videos_count ?? raw.videosCount ?? 0),
  }
}

/**
 * Normalise un objet vidéo brut provenant des divers endpoints Akwaplay.
 */
export function normalizeAkwaVideo(raw: any): AkwaVideo {
  if (!raw || typeof raw !== "object") {
    throw new Error("Donnée vidéo invalide.")
  }

  const id = raw.id ?? raw.video_id ?? raw.videoId
  const duration = parseDurationToSeconds(raw.duration ?? raw.video_duration)
  const createdAt = raw.created_at ?? raw.createdAt ?? new Date().toISOString()
  const authorData = raw.user ?? raw.author ?? raw.creator ?? raw

  const thumbnail =
    raw.signed_thumbnail_path ||
    raw.thumbnail_path ||
    raw.thumbnail ||
    raw.thumb ||
    raw.cover ||
    "/images/default-thumbnail.jpg"

  const videoUrl =
    raw.signed_video_path ||
    raw.video_path ||
    raw.video_url ||
    raw.videoUrl ||
    raw.url ||
    null

  return {
    id,
    title: String(raw.title ?? raw.video_title ?? "Sans titre"),
    description: raw.description ?? raw.video_description ?? null,
    thumbnail,
    videoUrl,
    streamUrl: raw.stream_url ?? raw.streamUrl ?? (id ? `/api/akwa_video_stream/${id}` : null),
    duration,
    durationFormatted: typeof raw.duration === "string" && raw.duration.includes(":") ? raw.duration : formatVideoDuration(duration),
    viewsCount: Number(raw.views ?? raw.views_count ?? raw.viewsCount ?? 0),
    likesCount: Number(raw.likes_count ?? raw.likes ?? raw.likesCount ?? 0),
    dislikesCount: Number(raw.dislikes_count ?? raw.dislikes ?? raw.dislikesCount ?? 0),
    commentsCount: Number(raw.comments_count ?? raw.comments ?? raw.commentsCount ?? 0),
    sharesCount: Number(raw.shares_count ?? raw.sharesCount ?? 0),
    isLiked: Boolean(raw.is_liked ?? raw.isLiked ?? raw.liked),
    isDisliked: Boolean(raw.is_disliked ?? raw.isDisliked ?? raw.disliked),
    isFavorite: Boolean(raw.is_favorite ?? raw.isFavorite ?? raw.favorite ?? raw.is_favorited),
    privacy: raw.privacy ?? 0,
    categoryId: raw.category_id ?? raw.categoryId ?? null,
    category: raw.category ? normalizeAkwaCategory(raw.category) : null,
    userId: raw.user_id ?? raw.userId ?? authorData?.id ?? "",
    author: normalizeAkwaAuthor(authorData),
    createdAt,
    timeAgo: raw.time_ago ?? formatRelativeTime(createdAt),
    progress: Number(raw.progress ?? raw.last_position ?? 0),
  }
}

/**
 * Normalise une réponse de commentaire de vidéo.
 */
export function normalizeAkwaCommentReply(raw: any, currentUserId?: string | number): AkwaCommentReply {
  const userId = raw.user_id ?? raw.userId ?? raw.user?.id
  const createdAt = raw.created_at ?? raw.createdAt ?? new Date().toISOString()

  return {
    id: raw.id ?? raw.reply_id ?? raw.replyId,
    commentId: raw.comment_id ?? raw.commentId,
    userId,
    user: normalizeAkwaAuthor(raw.user ?? raw.author),
    content: String(raw.content ?? raw.text ?? ""),
    likesCount: Number(raw.likes_count ?? raw.likesCount ?? 0),
    isLiked: Boolean(raw.is_liked ?? raw.isLiked ?? raw.liked),
    createdAt,
    timeAgo: formatRelativeTime(createdAt),
    isMine: currentUserId != null && String(userId) === String(currentUserId),
  }
}

/**
 * Normalise un commentaire de vidéo et ses réponses optionnelles.
 */
export function normalizeAkwaComment(raw: any, currentUserId?: string | number): AkwaComment {
  const userId = raw.user_id ?? raw.userId ?? raw.user?.id
  const createdAt = raw.created_at ?? raw.createdAt ?? new Date().toISOString()
  const rawReplies = Array.isArray(raw.replies) ? raw.replies : []

  return {
    id: raw.id ?? raw.comment_id ?? raw.commentId,
    videoId: raw.video_id ?? raw.videoId,
    userId,
    user: normalizeAkwaAuthor(raw.user ?? raw.author),
    content: String(raw.content ?? raw.text ?? ""),
    likesCount: Number(raw.likes_count ?? raw.likesCount ?? 0),
    isLiked: Boolean(raw.is_liked ?? raw.isLiked ?? raw.liked),
    repliesCount: Number(raw.replies_count ?? raw.repliesCount ?? rawReplies.length),
    replies: rawReplies.map((r: any) => normalizeAkwaCommentReply(r, currentUserId)),
    createdAt,
    timeAgo: formatRelativeTime(createdAt),
    isMine: currentUserId != null && String(userId) === String(currentUserId),
  }
}

/**
 * Valide et normalise l'identifiant d'une chaîne (slug) :
 * Minuscules, sans espaces, caractères alphanumériques, tirets et underscores uniquement.
 */
export function formatChannelIdentifiant(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/\s+/g, "-") // Remplace les espaces par des tirets
    .replace(/[^a-z0-9-_]/g, "") // Supprime les caractères non autorisés
}

/**
 * Normalise un objet chaîne brut provenant de l'API.
 */
export function normalizeAkwaChannel(raw: any): AkwaChannel {
  if (!raw || typeof raw !== "object") {
    throw new Error("Donnée de chaîne invalide.")
  }

  const id = raw.id ?? raw.channel_id ?? raw.channelId
  const name = String(raw.name ?? raw.channel_name ?? raw.title ?? "Chaîne sans nom")
  const identifiant = String(raw.identifiant ?? raw.slug ?? raw.channel_slug ?? formatChannelIdentifiant(name))
  const avatar = raw.avatar ?? raw.image ?? raw.photo ?? raw.profile_picture ?? "/images/avatar.png"
  const banner = raw.banner ?? raw.cover ?? raw.cover_image ?? null
  const description = raw.description ?? raw.bio ?? null
  const userId = raw.user_id ?? raw.userId ?? raw.owner_id ?? ""
  const subscribersCount = Number(raw.subscribers_count ?? raw.subscribersCount ?? raw.followers_count ?? 0)
  const videosCount = Number(raw.videos_count ?? raw.videosCount ?? raw.videos?.length ?? 0)
  const isFollowing = Boolean(raw.is_following ?? raw.isFollowing ?? raw.following)
  const createdAt = raw.created_at ?? raw.createdAt ?? new Date().toISOString()

  let videos: AkwaVideo[] | undefined
  if (Array.isArray(raw.videos)) {
    videos = raw.videos.map(normalizeAkwaVideo)
  }

  return {
    id,
    name,
    slug: identifiant,
    identifiant,
    avatar,
    banner,
    description,
    userId,
    author: raw.author ? normalizeAkwaAuthor(raw.author) : null,
    subscribersCount,
    videosCount,
    isFollowing,
    createdAt,
    videos,
  }
}
