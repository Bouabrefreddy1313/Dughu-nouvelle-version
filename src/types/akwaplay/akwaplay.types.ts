/**
 * Types TypeScript pour le module Akwaplay (Vidéos).
 * Définit les modèles métier, les paramètres de requêtes et les réponses d'API.
 */

// ── Modèles de base ─────────────────────────────────────────────────────────

export interface AkwaCategory {
  id: string | number
  name: string
  slug?: string
  icon?: string
  description?: string
  videosCount?: number
}

export interface AkwaAuthor {
  id: string | number
  name: string
  username?: string | null
  avatar?: string | null
  verified?: boolean
  subscribersCount?: number
  isSubscribed?: boolean
}

export interface AkwaVideo {
  id: string | number
  title: string
  description?: string | null
  thumbnail: string
  videoUrl?: string | null
  streamUrl?: string | null
  duration: number // en secondes
  durationFormatted?: string // ex: "04:15"
  viewsCount: number
  likesCount: number
  dislikesCount: number
  commentsCount: number
  sharesCount?: number
  isLiked?: boolean
  isDisliked?: boolean
  isFavorite?: boolean
  privacy?: 0 | 1 | 2 | 3 | "public" | "private" | "unlisted"
  categoryId?: string | number | null
  category?: AkwaCategory | null
  userId: string | number
  author: AkwaAuthor
  createdAt: string
  timeAgo?: string
  progress?: number // progression de lecture en secondes
}

export interface AkwaCommentReply {
  id: string | number
  commentId: string | number
  userId: string | number
  user: AkwaAuthor
  content: string
  likesCount: number
  isLiked?: boolean
  createdAt: string
  timeAgo?: string
  isMine?: boolean
}

export interface AkwaComment {
  id: string | number
  videoId: string | number
  userId: string | number
  user: AkwaAuthor
  content: string
  likesCount: number
  isLiked?: boolean
  repliesCount: number
  replies?: AkwaCommentReply[]
  createdAt: string
  timeAgo?: string
  isMine?: boolean
}

export interface AkwaReportReason {
  id: string | number
  reason: string
  description?: string | null
}

// ── Payloads / Requêtes ──────────────────────────────────────────────────────

export interface AkwaStoreVideoPayload {
  videoId?: string | number // Présent lors d'une édition / mise à jour
  title: string
  description?: string
  categoryId: string | number
  videoFile?: File | Blob | null
  thumbnailFile?: File | Blob | null
  userId: string | number
  privacy?: 0 | 1 | 2 | 3 | string
}

export interface AkwaSaveProgressPayload {
  videoId: string | number
  userId: string | number
  progress: number // temps en secondes
  duration: number // durée totale en secondes
}

export interface AkwaReportVideoPayload {
  videoId: string | number
  reasonId: string | number
  details?: string
  userId: string | number
}

export interface AkwaStoreCommentPayload {
  videoId: string | number
  content: string
  userId: string | number
}

export interface AkwaReplyCommentPayload {
  commentId: string | number
  content: string
  userId: string | number
}

export interface AkwaToggleCommentLikePayload {
  commentId?: string | number
  replyId?: string | number
  userId: string | number
}

// ── Réponses d'API ──────────────────────────────────────────────────────────

export interface AkwaBaseApiResponse {
  success: boolean
  message?: string
}

export interface AkwaPaginatedResponse<T> extends AkwaBaseApiResponse {
  data: T[]
  page?: number
  hasMore?: boolean
  total?: number
}

export interface AkwaVideoDetailsResponse extends AkwaBaseApiResponse {
  video: AkwaVideo
  author: AkwaAuthor
  isLiked?: boolean
  isDisliked?: boolean
  isFavorite?: boolean
  progress?: number
}

export interface AkwaToggleActionResponse extends AkwaBaseApiResponse {
  liked?: boolean
  disliked?: boolean
  favorite?: boolean
  likesCount?: number
  dislikesCount?: number
}

export * from "./akwaplayChannel.types"

