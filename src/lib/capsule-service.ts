// ═══════════════════════════════════════════════════════════════════════════════
// CAPSULE SERVICE — Capsules vidéo verticales (l'équivalent Dughu des Reels)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Endpoints Dughu utilisés (dossier « Capsule ») :
//   1.  POST /store/capsule                          → créer une capsule (multipart)
//   2.  POST /fetchShorts                            → feed des capsules
//   3.  GET  /shortsUser/{user_id}                   → capsules d'un utilisateur
//   4.  GET  /toggleLikeShort/{capsule_id}/{user_id} → like / unlike
//   5.  GET  /toggleDislikeShort/{capsule_id}/{user_id} → dislike / undislike
//   6.  POST /trackView                              → enregistrer une vue
//   7.  POST /storeComment/capsule                   → commenter une capsule
//   8.  POST /fetchComments                          → commentaires d'une capsule
//   9.  POST /replyCapsuleComment                    → répondre à un commentaire
//   10. POST /replyCapsuleReply                      → répondre à une réponse
//   11. POST /toggleLike/capsule/comment             → liker un commentaire
//   12. POST /capsule/report                         → signaler une capsule
//   13. DELETE /capsule/{id}                         → supprimer une capsule
//
// ⚠️ Module réservé aux routes API (côté serveur). Ne pas l'importer dans un
//    composant client : passer par /api/capsules/*.
// ═══════════════════════════════════════════════════════════════════════════════

/* eslint-disable @typescript-eslint/no-explicit-any -- Réponses Dughu non documentées, normalisées défensivement. */
import { dughu, pick, normalizeUser, resolveMediaUrl, DughuApiError } from "@/lib/dughu"

/** Taille de page par défaut du feed Capsules. */
export const CAPSULE_PAGE_SIZE = 10

/** Détermine si le module Capsules est actif (clé API configurée). */
export const capsuleEnabled = dughu.enabled

export interface CapsuleAuthor {
  id: string
  name: string | null
  username: string | null
  avatar: string | null
}

export interface Capsule {
  id: string
  video: string | null
  thumbnail: string | null
  caption: string
  author: CapsuleAuthor | null
  likesCount: number
  dislikesCount: number
  commentsCount: number
  viewsCount: number
  isLiked: boolean
  isDisliked: boolean
  createdAt: string
}

export interface CapsuleComment {
  id: string
  content: string
  createdAt: string
  author: CapsuleAuthor | null
  likesCount: number
  isLiked: boolean
  replies: CapsuleComment[]
}

/** Pagination des commentaires d'une capsule (contrat Laravel : result.current_page / last_page / per_page / total). */
export interface CapsuleCommentsPagination {
  page: number
  perPage: number
  total: number
  lastPage: number
  hasMore: boolean
}

/** Résultat de POST /fetchComments côté Dughu. */
export interface CapsuleCommentsResult {
  comments: CapsuleComment[]
  pagination: CapsuleCommentsPagination
}

export interface CapsulePagination {
  page: number
  perPage: number
  total: number
  hasMore: boolean
}

export interface CapsuleFeedResult {
  capsules: Capsule[]
  pagination: CapsulePagination
}

/* ── Helpers locaux ─────────────────────────────────────────────────────────── */

function firstValue(...values: any[]): any {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v
  }
  return undefined
}

function readNumber(value: any): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function readFlag(value: any): boolean {
  return value === true || value === 1 || value === "1" || value === "true"
}

/**
 * Extrait un message utilisateur d'une erreur API Dughu : privilégie le premier
 * message de validation renvoyé par l'API (ex. « Le texte du commentaire est
 * obligatoire. ») plutôt que l'erreur technique brute (HTTP 422…). Les erreurs de
 * session (HTTP 401/403, « Unauthorized », « connectez-vous. », token invalide /
 * expiré) sont traduites en message clair.
 */
function dughuErrorMessage(error: unknown, fallback: string): string {
  const firstString = (v: unknown): string | null => {
    if (Array.isArray(v) && typeof v[0] === "string" && v[0]) return v[0]
    return null
  }
  if (error instanceof DughuApiError) {
    const status = error.status
    const data = error.data && typeof error.data === "object" ? (error.data as Record<string, unknown>) : null
    const rawText = typeof error.data === "string" ? error.data : ""
    const m: string | null =
      (data && typeof data.message === "string" && data.message) ||
      (data && typeof data.error === "string" && data.error) ||
      rawText ||
      null
    const haystack = `${status ?? ""} ${String(m || "")}`.toLowerCase()
    if (
      status === 401 ||
      status === 403 ||
      /unauthorized|connectez-vous|connecte-toi|non connect|not authenticated|token.*(invalid|expir)|session.*expir/i.test(haystack)
    ) {
      return "Votre session Dughu semble expirée ou invalide. Reconnectez-vous puis réessayez."
    }
    const errors = data?.errors as Record<string, unknown> | undefined
    if (errors && typeof errors === "object") {
      const firstField = Object.values(errors).map(firstString).find(Boolean)
      if (firstField) return firstField
    }
    if (typeof data?.message === "string" && data.message && !data.message.includes("Erreur de validation")) {
      return data.message
    }
    if (typeof data?.error === "string" && data.error) return data.error
    return fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function findArray(raw: any, keys: string[]): any[] {
  if (!raw || typeof raw !== "object") return []
  for (const key of keys) {
    const direct = raw[key]
    if (Array.isArray(direct)) return direct
    if (direct && typeof direct === "object") {
      for (const inner of Object.values(direct)) {
        if (Array.isArray(inner)) return inner
      }
    }
  }
  // Recherche large : premier tableau d'objets dans la réponse
  for (const value of Object.values(raw)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") return value
  }
  return []
}

function normalizeAuthor(raw: any): CapsuleAuthor | null {
  const user = normalizeUser(raw)
  if (!user || !user.id) return null
  return {
    id: String(user.id),
    name: user.name || null,
    username: user.username || null,
    avatar: user.avatar || null,
  }
}

/** Normalise une capsule Dughu (réponse non documentée → lecture défensive). */
export function normalizeCapsule(raw: any): Capsule | null {
  if (!raw || typeof raw !== "object") return null
  const id = String(
    pick(raw, "id", "short_id", "shorts_id", "capsule_id", "capsuleId", "ID") || ""
  )
  if (!id) return null

  const videoRaw = String(
    pick(
      raw,
      "file_path", "video", "video_url", "videoUrl", "video_link", "videoLink",
      "shortsFile", "short_file", "shorts_file", "file", "media", "media_url", "path"
    ) || ""
  )
  const thumbRaw = String(
    pick(
      raw,
      "thumbnail_path", "thumb", "thumbnail", "thumbnail_url", "thumbnailUrl", "shortsThumb",
      "shorts_thumb", "cover", "cover_url", "poster", "image"
    ) || ""
  )
  const createdAtRaw = pick(raw, "created_at", "createdAt", "created", "time", "date")

  return {
    id,
    video: videoRaw ? resolveMediaUrl(videoRaw) : null,
    thumbnail: thumbRaw ? resolveMediaUrl(thumbRaw) : null,
    caption: String(pick(raw, "caption", "description", "title", "text", "content") || ""),
    author: normalizeAuthor(raw?.user ?? raw?.author ?? raw),
    likesCount: readNumber(pick(raw, "likes", "like_count", "likes_count", "total_likes")),
    dislikesCount: readNumber(pick(raw, "dislikes", "dislike_count", "dislikes_count", "total_dislikes")),
    commentsCount: readNumber(pick(raw, "comments", "comment_count", "comments_count", "total_comments")),
    viewsCount: readNumber(pick(raw, "views", "view_count", "views_count", "total_views")),
    isLiked: readFlag(pick(raw, "is_like", "isLike", "liked", "is_liked")),
    isDisliked: readFlag(pick(raw, "isDislikedByUser", "is_dislike", "isDislike", "disliked", "is_disliked")),
    createdAt: createdAtRaw ? String(createdAtRaw) : "",
  }
}

/** Normalise un commentaire de capsule (+ réponses imbriquées, 1 niveau). */
export function normalizeCapsuleComment(raw: any): CapsuleComment | null {
  if (!raw || typeof raw !== "object") return null
  const id = String(pick(raw, "id", "comment_id", "commentId", "ID") || "")
  if (!id) return null
  const rawReplies = firstValue(raw.replies, raw.replies_list, raw.responses, raw.children)
  const replies = Array.isArray(rawReplies)
    ? rawReplies.map(normalizeCapsuleComment).filter((c): c is CapsuleComment => c !== null)
    : []
  // L'auteur peut être imbriqué (raw.user) ou à plat (user_id/username/avatar
  // à la racine, forme renvoyée par storeComment/capsule et replyCapsuleComment).
  const nestedUser = raw.user && typeof raw.user === "object" ? raw.user : null
  const authorRaw =
    nestedUser
      ? { ...nestedUser, avatar: nestedUser.avatar || raw.avatar }
      : raw?.user_id || raw?.username || raw?.avatar
        ? { user_id: raw.user_id, username: raw.username, avatar: raw.avatar }
        : raw?.author
  return {
    id,
    content: String(pick(raw, "text", "comment", "content", "message", "body") || ""),
    createdAt: String(pick(raw, "created_at", "createdAt", "time", "date") || ""),
    author: normalizeAuthor(authorRaw),
    likesCount: readNumber(pick(raw, "likes", "like_count", "likes_count")),
    isLiked: readFlag(pick(raw, "is_like", "isLike", "liked", "is_liked")),
    replies,
  }
}

function normalizeCapsuleList(raw: any): Capsule[] {
  const items = findArray(
    raw,
    ["shorts", "shortsList", "shorts_list", "capsules", "data", "result", "results", "items"]
  )
  return items.map(normalizeCapsule).filter((c): c is Capsule => c !== null)
}

/* ── Feed & capsules d'un utilisateur ──────────────────────────────────────── */

/** Feed des capsules (POST /fetchShorts). */
export async function fetchCapsuleFeed(
  userId: string,
  { page = 1, perPage = CAPSULE_PAGE_SIZE }: { page?: number; perPage?: number } = {}
): Promise<CapsuleFeedResult> {
  const raw = await dughu.form("fetchShorts", {
    user_id: String(userId),
    page,
    per_page: perPage,
  })
  const capsules = normalizeCapsuleList(raw)
  return {
    capsules,
    pagination: {
      page,
      perPage,
      total: readNumber(pick(raw, "total", "total_shorts", "count")) || capsules.length,
      hasMore: capsules.length >= perPage,
    },
  }
}

/** Capsules d'un utilisateur précis (GET /shortsUser/{user_id}). */
export async function fetchUserCapsules(
  targetUserId: string,
  viewerId?: string
): Promise<Capsule[]> {
  const raw = await dughu.get(
    `shortsUser/${encodeURIComponent(String(targetUserId))}`,
    viewerId ? { viewer_id: String(viewerId) } : undefined
  )
  return normalizeCapsuleList(raw)
}

/* ── Réactions & vues ──────────────────────────────────────────────────────── */

/** Like / unlike une capsule (GET /toggleLikeShort/{id}/{user_id}). */
export async function toggleCapsuleLike(capsuleId: string, userId: string) {
  let raw: any
  try {
    raw = await dughu.get(
      `toggleLikeShort/${encodeURIComponent(String(capsuleId))}/${encodeURIComponent(String(userId))}`
    )
  } catch (error) {
    throw new Error(dughuErrorMessage(error, "Erreur de réaction"))
  }
  if (raw && typeof raw === "object" && raw.success === false) {
    throw new Error(dughuSessionMessage(String(raw.message || "Erreur de réaction"), "Erreur de réaction"))
  }
  return { liked: readFlag(firstValue(raw?.is_like, raw?.liked, raw?.is_liked, raw?.status)) }
}

/** Dislike / undislike une capsule (GET /toggleDislikeShort/{id}/{user_id}). */
export async function toggleCapsuleDislike(capsuleId: string, userId: string) {
  let raw: any
  try {
    raw = await dughu.get(
      `toggleDislikeShort/${encodeURIComponent(String(capsuleId))}/${encodeURIComponent(String(userId))}`
    )
  } catch (error) {
    throw new Error(dughuErrorMessage(error, "Erreur de réaction"))
  }
  if (raw && typeof raw === "object" && raw.success === false) {
    throw new Error(dughuSessionMessage(String(raw.message || "Erreur de réaction"), "Erreur de réaction"))
  }
  return { disliked: readFlag(firstValue(raw?.is_dislike, raw?.disliked, raw?.is_disliked, raw?.status)) }
}

/**
 * Traduit une erreur de session Dughu (« connectez-vous. » renvoyé quand le
 * user_id fourni n'existe pas / n'est pas connecté) en message utilisateur clair.
 */
function dughuSessionMessage(message: string, fallback: string): string {
  const m = String(message || "").trim()
  if (/connectez-vous|connecte-toi|non connect/i.test(m)) {
    return "Votre session Dughu semble expirée. Reconnectez-vous puis réessayez."
  }
  return m || fallback
}

/** Enregistre une vue sur une capsule (POST /trackView). */
export async function trackCapsuleView(capsuleId: string, userId: string) {
  const raw = await dughu.form("trackView", {
    short_id: String(capsuleId),
    capsule_id: String(capsuleId),
    user_id: String(userId),
  })
  return { ok: !(raw && typeof raw === "object" && raw.success === false) }
}

/* ── Commentaires ──────────────────────────────────────────────────────────── */
//
// Contrats Dughu vérifiés en direct (diagnostic + Postman 2026-08-31) :
//   storeComment/capsule  : capsule_id + text + user_id        → 201 {comment}
//   replyCapsuleComment   : capsule_id + comment_id + text + user_id → 201 {comment}
//   replyCapsuleReply     : capsule_id + reply_id + text + user_id   → 201 {comment}
//   toggleLike/capsule/comment : capsule_id + comment_id + user_id   → 200 {is_liked, likes_count}
//   fetchComments         : POST /fetchComments?page=N (page en query string), body
//                           capsule_id + user_id, et `Authorization: Bearer
//                           <dughu_token>` (token de session utilisateur) — sans
//                           token l'API renvoie une erreur générique / Unauthorized.
//                           Réponse : { success, message, result: { current_page,
//                           per_page, last_page, total, data: [commentaire] } } où
//                           chaque commentaire porte user imbriqué + replies récursives.

/**
 * Commentaires d'une capsule (POST /fetchComments).
 *
 * Contrat Dughu réel : `page` en **query string** (`?page=N`, pagination Laravel),
 * corps `capsule_id` + `user_id`, token de session utilisateur (dughu_token) en
 * `Authorization: Bearer`. On renvoie les commentaires **distants** normalisés +
 * les métadonnées de pagination (page, dernière page, total, hasMore).
 */
export async function fetchCapsuleComments(
  capsuleId: string,
  userId: string,
  page = 1,
  authToken?: string
): Promise<CapsuleCommentsResult> {
  const safePage = Math.max(1, Number(page) || 1)
  let raw: any
  try {
    raw = await dughu.form(
      `fetchComments?page=${encodeURIComponent(String(safePage))}`,
      {
        capsuleId: String(capsuleId),
        auth_user_id: String(userId),
      },
      authToken
    )
  } catch (error) {
    throw new Error(dughuErrorMessage(error, "Les commentaires ne sont pas disponibles pour le moment."))
  }
  if (raw && typeof raw === "object" && raw.success === false) {
    throw new Error(String(raw.message || "Les commentaires ne sont pas disponibles pour le moment."))
  }
  // Réponse Laravel : le tableau est dans result.data (ou data à la racine).
  const meta = raw?.result && typeof raw.result === "object" ? raw.result : raw
  const items = findArray(meta, ["data", "comments", "items", "result", "results"])
  const comments = items.map(normalizeCapsuleComment).filter((c): c is CapsuleComment => c !== null)

  const currentPage = readNumber(pick(meta, "current_page", "currentPage")) || safePage
  const lastPage = readNumber(pick(meta, "last_page", "lastPage"))
  const perPage = readNumber(pick(meta, "per_page", "perPage")) || comments.length || 5
  const total = readNumber(pick(meta, "total", "total_comments")) || comments.length

  return {
    comments,
    pagination: {
      page: currentPage,
      perPage,
      total,
      lastPage,
      hasMore: lastPage > currentPage,
    },
  }
}

/** Ajoute un commentaire sur une capsule (POST /storeComment/capsule). */
export async function addCapsuleComment(capsuleId: string, userId: string, content: string) {
  let raw: any
  try {
    raw = await dughu.form("storeComment/capsule", {
      capsule_id: String(capsuleId),
      text: content,
      user_id: String(userId),
    })
  } catch (error) {
    throw new Error(dughuErrorMessage(error, "Impossible d'ajouter votre commentaire. Veuillez réessayer."))
  }
  if (raw && typeof raw === "object" && raw.success === false) {
    throw new Error(String(raw.message || "Impossible d'ajouter votre commentaire. Veuillez réessayer."))
  }
  const comment = normalizeCapsuleComment(firstValue(raw?.comment, raw?.data, raw?.result, raw))
  return { comment }
}

/** Répond à un commentaire (POST /replyCapsuleComment). */
export async function replyToCapsuleComment(
  capsuleId: string,
  commentId: string,
  userId: string,
  content: string
) {
  let raw: any
  try {
    raw = await dughu.form("replyCapsuleComment", {
      capsule_id: String(capsuleId),
      comment_id: String(commentId),
      text: content,
      user_id: String(userId),
    })
  } catch (error) {
    throw new Error(dughuErrorMessage(error, "Impossible d'envoyer votre réponse. Veuillez réessayer."))
  }
  if (raw && typeof raw === "object" && raw.success === false) {
    throw new Error(String(raw.message || "Impossible d'envoyer votre réponse. Veuillez réessayer."))
  }
  return { reply: normalizeCapsuleComment(firstValue(raw?.comment, raw?.reply, raw?.data, raw?.result)) }
}

/** Répond à une réponse de commentaire (POST /replyCapsuleReply). */
export async function replyToCapsuleReply(
  capsuleId: string,
  replyId: string,
  userId: string,
  content: string
) {
  let raw: any
  try {
    raw = await dughu.form("replyCapsuleReply", {
      capsule_id: String(capsuleId),
      reply_id: String(replyId),
      text: content,
      user_id: String(userId),
    })
  } catch (error) {
    throw new Error(dughuErrorMessage(error, "Impossible d'envoyer votre réponse. Veuillez réessayer."))
  }
  if (raw && typeof raw === "object" && raw.success === false) {
    throw new Error(String(raw.message || "Impossible d'envoyer votre réponse. Veuillez réessayer."))
  }
  return { reply: normalizeCapsuleComment(firstValue(raw?.comment, raw?.reply, raw?.data, raw?.result)) }
}

/** Like / unlike un commentaire de capsule (POST /toggleLike/capsule/comment). */
export async function likeCapsuleComment(capsuleId: string, commentId: string, userId: string) {
  let raw: any
  try {
    raw = await dughu.form("toggleLike/capsule/comment", {
      capsule_id: String(capsuleId),
      comment_id: String(commentId),
      user_id: String(userId),
    })
  } catch (error) {
    throw new Error(dughuErrorMessage(error, "Erreur de réaction"))
  }
  if (raw && typeof raw === "object" && raw.success === false) {
    throw new Error(String(raw.message || "Erreur de réaction"))
  }
  return {
    liked: readFlag(firstValue(raw?.is_liked, raw?.is_like, raw?.liked, raw?.status)),
    likesCount: readNumber(firstValue(raw?.likes_count, raw?.like_count)),
  }
}

/* ── Signalement, suppression, création ────────────────────────────────────── */

/** Signale une capsule (POST /capsule/report). */
export async function reportCapsule(capsuleId: string, userId: string, reason: string) {
  const raw = await dughu.form("capsule/report", {
    short_id: String(capsuleId),
    capsule_id: String(capsuleId),
    user_id: String(userId),
    reason,
  })
  if (raw && typeof raw === "object" && raw.success === false) {
    throw new Error(String(raw.message || "Erreur lors du signalement"))
  }
  return { ok: true }
}

/** Supprime une capsule (DELETE /capsule/{id}) — auteur uniquement côté Dughu. */
export async function deleteCapsule(capsuleId: string) {
  const raw = await dughu.del(`capsule/${encodeURIComponent(String(capsuleId))}`)
  if (raw && typeof raw === "object" && raw.success === false) {
    throw new Error(String(raw.message || "Erreur lors de la suppression"))
  }
  return { ok: true }
}

/** Crée une capsule (POST /store/capsule, multipart : vidéo + légende). */
export async function createCapsule(formData: FormData) {
  const raw = await dughu.multipart("store/capsule", formData)
  if (raw && typeof raw === "object" && raw.success === false) {
    throw new Error(String(raw.message || "Erreur lors de la création de la capsule"))
  }
  return { capsule: normalizeCapsule(firstValue(raw?.capsule, raw?.short, raw?.data, raw?.result)) }
}



