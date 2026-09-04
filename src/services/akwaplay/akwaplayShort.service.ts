/**
 * Service FRONTEND du module Akwaplay — Shorts.
 *
 * Utilise EXCLUSIVEMENT l'instance Axios cliente `apiClient` configurée avec
 * les interceptors et la baseURL interne `/api`.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"

// ── Types ───────────────────────────────────────────────────────────────────

export interface AkwaShort {
  id: string | number
  title?: string
  caption?: string
  thumbnail?: string
  videoUrl?: string | null
  likesCount?: number
  viewsCount?: number
  commentsCount?: number
  isLiked?: boolean
  isDisliked?: boolean
  author?: {
    id: string | number
    name: string
    avatar?: string | null
  }
  createdAt?: string
  timeAgo?: string
}

export interface AkwaShortComment {
  id: string | number
  shortId: string | number
  userId: string | number
  content: string
  likesCount: number
  isLiked?: boolean
  user: { id: string | number; name: string; avatar?: string | null }
  createdAt: string
  timeAgo?: string
}

// ── Normaliseurs ─────────────────────────────────────────────────────────────

export function normalizeShort(raw: any): AkwaShort {
  const authorObj = raw?.user ?? raw?.author
  const authorName =
    (authorObj?.first_name || authorObj?.last_name)
      ? `${authorObj.first_name ?? ""} ${authorObj.last_name ?? ""}`.trim()
      : authorObj?.name ?? authorObj?.username ?? raw?.first_name ?? "Créateur"

  const authorAvatar =
    authorObj?.avatar ??
    authorObj?.profile_photo_url ??
    raw?.userAvatar ??
    raw?.avatar ??
    null

  const videoUrl =
    raw?.file_path ||
    raw?.video_path ||
    raw?.signed_video_path ||
    raw?.video_url ||
    raw?.url ||
    null

  const thumbnail =
    raw?.thumbnail_path ||
    raw?.signed_thumbnail_path ||
    raw?.thumbnail ||
    raw?.cover ||
    raw?.image ||
    null

  const likesCount = Number(raw?.likes_count ?? raw?.like_count ?? raw?.likesCount ?? 0)
  const commentsCount = Number(raw?.comments_count ?? raw?.comment_count ?? raw?.commentsCount ?? 0)
  const viewsCount = Number(raw?.views_count ?? raw?.views ?? raw?.viewsCount ?? 0)

  const isLikedRaw = raw?.liked ?? raw?.is_liked ?? raw?.isLiked
  const isLiked = isLikedRaw === true || isLikedRaw === 1 || isLikedRaw === "1" || isLikedRaw === "true"

  return {
    id: raw?.id ?? raw?.short_id ?? "",
    title: raw?.title ?? raw?.caption ?? "",
    caption: raw?.caption ?? raw?.title ?? "",
    thumbnail: thumbnail || undefined,
    videoUrl,
    likesCount,
    viewsCount,
    commentsCount,
    isLiked,
    isDisliked: false,
    author: {
      id: authorObj?.user_id ?? authorObj?.id ?? raw?.user_id ?? "",
      name: authorName,
      avatar: authorAvatar,
    },
    createdAt: raw?.created_at ?? raw?.createdAt ?? "",
    timeAgo: raw?.time_ago ?? raw?.timeAgo ?? "",
  }
}

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

// ═══════════════════════════════════════════════════════════════════════════
// SHORTS — LECTURE & CRÉATION
// ═══════════════════════════════════════════════════════════════════════════

export interface AkwaStoreShortPayload {
  videoFile: File | Blob
  caption?: string
  title?: string
  musicId?: string | number | null
  userId: string | number
}

/**
 * Crée et publie un nouveau short / capsule.
 * POST /api/short_store
 */
export async function storeShort(
  payload: AkwaStoreShortPayload,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; short?: AkwaShort; message?: string }> {
  try {
    const formData = new FormData()
    formData.append("video", payload.videoFile)
    formData.append("file", payload.videoFile)
    const text = (payload.caption || payload.title || "").trim()
    formData.append("caption", text)
    formData.append("title", text)
    formData.append("user_id", String(payload.userId))
    if (payload.musicId) {
      formData.append("music_id", String(payload.musicId))
    }

    const res = await apiClient.post<any>("/short_store", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      },
    })

    const rawShort = res.data?.short ?? res.data?.result ?? res.data?.data
    return {
      success: Boolean(res.data?.success ?? true),
      short: rawShort ? normalizeShort(rawShort) : undefined,
      message: res.data?.message ?? "Short publié avec succès !",
    }
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors de la publication du short.")
  }
}

/**
 * Liste les shorts disponibles pour un utilisateur.
 * GET /api/short_fetchShorts/{user_id}?page={page}
 */
export async function fetchShorts(
  userId: string | number,
  page = 1,
  signal?: AbortSignal
): Promise<{ shorts: AkwaShort[]; hasMore: boolean; page: number }> {
  try {
    const res = await apiClient.get<any>(
      `/short_fetchShorts/${encodeURIComponent(String(userId))}?page=${page}`,
      { signal }
    )
    const rawList =
      Array.isArray(res.data?.shorts?.data)
        ? res.data.shorts.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.shorts)
        ? res.data.shorts
        : Array.isArray(res.data?.result?.data)
        ? res.data.result.data
        : Array.isArray(res.data?.result)
        ? res.data.result
        : Array.isArray(res.data)
        ? res.data
        : []

    const hasMore = Boolean(
      res.data?.shorts?.next_page_url != null ||
      res.data?.result?.pagination?.has_more ||
      res.data?.pagination?.has_more ||
      (res.data?.shorts?.current_page && res.data?.shorts?.last_page && res.data.shorts.current_page < res.data.shorts.last_page) ||
      rawList.length >= 10
    )

    return {
      shorts: rawList.map(normalizeShort),
      hasMore,
      page,
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les shorts.")
  }
}

/**
 * Liste les shorts d'un utilisateur/chaîne spécifique.
 * GET /api/user_shorts?page={page}&user_id={user_id}
 */
export async function fetchUserShorts(
  userId: string | number,
  page = 1,
  signal?: AbortSignal
): Promise<{ shorts: AkwaShort[]; hasMore: boolean; page: number }> {
  try {
    const res = await apiClient.get<any>(
      `/user_shorts?page=${page}&user_id=${encodeURIComponent(String(userId))}`,
      { signal }
    )
    const rawList =
      Array.isArray(res.data?.shorts?.data)
        ? res.data.shorts.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.shorts)
        ? res.data.shorts
        : Array.isArray(res.data?.result?.data)
        ? res.data.result.data
        : Array.isArray(res.data?.result)
        ? res.data.result
        : Array.isArray(res.data)
        ? res.data
        : []

    const hasMore = Boolean(
      res.data?.shorts?.next_page_url != null ||
      res.data?.result?.pagination?.has_more ||
      res.data?.pagination?.has_more ||
      (res.data?.shorts?.current_page && res.data?.shorts?.last_page && res.data.shorts.current_page < res.data.shorts.last_page) ||
      rawList.length >= 10
    )

    return {
      shorts: rawList.map(normalizeShort),
      hasMore,
      page,
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les shorts de cet utilisateur.")
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SHORTS — ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Like ou dislike un short.
 * POST /api/short_toggleLikeDislike
 */
export async function toggleShortLikeDislike(
  shortId: string | number,
  userId: string | number,
  action: "like" | "dislike"
): Promise<{ success: boolean; isLiked: boolean; isDisliked: boolean; likesCount?: number }> {
  try {
    const res = await apiClient.post<any>("/short_toggleLikeDislike", {
      short_id: shortId,
      user_id: userId,
      action,
    })
    return {
      success: Boolean(res.data?.success ?? true),
      isLiked: Boolean(res.data?.is_liked ?? res.data?.liked),
      isDisliked: Boolean(res.data?.is_disliked ?? res.data?.disliked),
      likesCount: res.data?.likes_count,
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'enregistrer votre réaction.")
  }
}

/**
 * Supprime un short.
 * DELETE /api/short_destroy/{short_id}
 */
export async function destroyShort(
  shortId: string | number,
  userId: string | number
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiClient.delete<any>(
      `/short_destroy/${encodeURIComponent(String(shortId))}`,
      { data: { user_id: userId } }
    )
    return {
      success: Boolean(res.data?.success ?? true),
      message: res.data?.message ?? "Short supprimé avec succès.",
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer ce short.")
  }
}

/**
 * Enregistre une vue sur un short.
 * POST /api/akwa_track_short_view
 */
export async function trackShortView(
  shortId: string | number,
  userId?: string | number,
  watchTime?: number
): Promise<void> {
  try {
    await apiClient.post<any>("/akwa_track_short_view", {
      short_id: shortId,
      user_id: userId,
      watch_time: watchTime,
    })
  } catch {
    // Best-effort, ne pas bloquer l'expérience
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SHORTS — COMMENTAIRES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Récupère les commentaires d'un short.
 * GET /api/short_fetch_comments/{short_id}/{user_id}
 */
export async function fetchShortComments(
  shortId: string | number,
  userId: string | number,
  signal?: AbortSignal
): Promise<AkwaShortComment[]> {
  try {
    const res = await apiClient.get<any>(
      `/short_fetch_comments/${encodeURIComponent(String(shortId))}/${encodeURIComponent(String(userId))}`,
      { signal }
    )
    const rawList = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.comments)
      ? res.data.comments
      : Array.isArray(res.data?.data)
      ? res.data.data
      : []

    return rawList.map((c: any) => {
      const authorObj = c.user ?? c.author
      const authorName =
        (c.first_name || c.last_name)
          ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()
          : (authorObj?.first_name || authorObj?.last_name)
          ? `${authorObj.first_name ?? ""} ${authorObj.last_name ?? ""}`.trim()
          : authorObj?.name ?? authorObj?.username ?? c.username ?? "Utilisateur"

      return {
        id: c.id ?? "",
        shortId: c.short_id ?? shortId,
        userId: c.user_id ?? c.userId ?? "",
        content: c.text ?? c.content ?? "",
        likesCount: Number(c.likes_count ?? c.likesCount ?? 0),
        isLiked: Boolean(c.is_liked ?? c.isLiked ?? false),
        user: {
          id: authorObj?.id ?? authorObj?.user_id ?? c.user_id ?? "",
          name: authorName,
          avatar: c.avatar ?? authorObj?.avatar ?? authorObj?.profile_photo_url ?? null,
        },
        createdAt: c.created_at ?? c.createdAt ?? "",
        timeAgo: c.time_ago ?? c.timeAgo ?? "",
      }
    })
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les commentaires.")
  }
}

/**
 * Ajoute un commentaire à un short.
 * POST /api/short_store_comment
 */
export async function storeShortComment(
  shortId: string | number,
  content: string,
  userId: string | number
): Promise<{ success: boolean; comment?: AkwaShortComment; message?: string }> {
  try {
    const text = content.trim()
    const res = await apiClient.post<any>("/short_store_comment", {
      short_id: shortId,
      text,
      content: text,
      user_id: userId,
    })

    const rawComment = res.data?.comment
    let normalizedComment: AkwaShortComment | undefined = undefined
    if (rawComment) {
      normalizedComment = {
        id: rawComment.id ?? "",
        shortId: rawComment.short_id ?? shortId,
        userId: rawComment.user_id ?? rawComment.user?.user_id ?? userId,
        content: rawComment.text ?? rawComment.content ?? text,
        likesCount: Number(rawComment.likes_count ?? 0),
        isLiked: false,
        user: {
          id: rawComment.user?.user_id ?? rawComment.user?.id ?? userId,
          name: rawComment.user?.username ?? rawComment.username ?? "Moi",
          avatar: rawComment.avatar ?? rawComment.user?.avatar ?? null,
        },
        createdAt: rawComment.created_at ?? new Date().toISOString(),
        timeAgo: "À l'instant",
      }
    }

    return {
      success: Boolean(res.data?.success ?? true),
      message: res.data?.message,
      comment: normalizedComment,
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'ajouter le commentaire.")
  }
}

/**
 * Répond à un commentaire de short.
 * POST /api/short_reply_comment
 */
export async function replyShortComment(
  commentId: string | number,
  content: string,
  userId: string | number
): Promise<{ success: boolean; reply?: any; message?: string }> {
  try {
    const text = content.trim()
    const res = await apiClient.post<any>("/short_reply_comment", {
      comment_id: commentId,
      text,
      content: text,
      user_id: userId,
    })
    return {
      success: Boolean(res.data?.success ?? true),
      message: res.data?.message,
      reply: res.data?.reply ?? res.data?.comment ?? undefined,
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'envoyer la réponse.")
  }
}

/**
 * Supprime un commentaire de short.
 * DELETE /api/short_delete_comment/{comment_id}
 */
export async function deleteShortComment(
  commentId: string | number,
  userId: string | number
): Promise<{ success: boolean }> {
  try {
    const res = await apiClient.delete<any>(
      `/short_delete_comment/${encodeURIComponent(String(commentId))}`,
      { data: { user_id: userId } }
    )
    return { success: Boolean(res.data?.success ?? true) }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer ce commentaire.")
  }
}

/**
 * Supprime une réponse à un commentaire de short.
 * DELETE /api/short_delete_reply_comment/{reply_comment_id}
 */
export async function deleteShortReplyComment(
  replyCommentId: string | number,
  userId: string | number
): Promise<{ success: boolean }> {
  try {
    const res = await apiClient.delete<any>(
      `/short_delete_reply_comment/${encodeURIComponent(String(replyCommentId))}`,
      { data: { user_id: userId } }
    )
    return { success: Boolean(res.data?.success ?? true) }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer cette réponse.")
  }
}

/**
 * Like / unlike un commentaire Akwaplay (short ou autre).
 * POST /api/toggleAkwaplayCommentLike
 */
export async function toggleAkwaplayCommentLike(
  commentId: string | number,
  userId: string | number
): Promise<{ success: boolean; isLiked: boolean; likesCount?: number }> {
  try {
    const res = await apiClient.post<any>("/toggleAkwaplayCommentLike", {
      comment_id: commentId,
      user_id: userId,
    })
    return {
      success: Boolean(res.data?.success ?? true),
      isLiked: Boolean(res.data?.is_liked ?? res.data?.liked),
      likesCount: res.data?.likes_count,
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'enregistrer le like.")
  }
}
