/**
 * Service FRONTEND du module Akwaplay (Vidéos).
 *
 * Utilise EXCLUSIVEMENT l'instance Axios cliente `apiClient` configurée avec
 * les interceptors et la baseURL interne `/api`.
 * Transforme les réponses brutes de l'API via les mappers défensifs
 * et lève des `ApiError` cohérentes en cas d'erreur.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  AkwaVideo,
  AkwaCategory,
  AkwaComment,
  AkwaCommentReply,
  AkwaReportReason,
  AkwaStoreVideoPayload,
  AkwaSaveProgressPayload,
  AkwaReportVideoPayload,
  AkwaStoreCommentPayload,
  AkwaReplyCommentPayload,
  AkwaToggleCommentLikePayload,
  AkwaToggleActionResponse,
  AkwaUserActivity,
} from "@/types/akwaplay/akwaplay.types"
import {
  normalizeAkwaVideo,
  normalizeAkwaCategory,
  normalizeAkwaComment,
  normalizeAkwaCommentReply,
  normalizeAkwaUserActivity,
} from "@/services/akwaplay/akwaplay.helpers"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

function extractDataArray<T = any>(payload: any): T[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.result?.data)) return payload.result.data
  if (Array.isArray(payload.result?.videos)) return payload.result.videos
  if (Array.isArray(payload.result?.categories)) return payload.result.categories
  if (Array.isArray(payload.result?.comments)) return payload.result.comments
  if (Array.isArray(payload.result?.replies)) return payload.result.replies
  if (Array.isArray(payload.result)) return payload.result
  if (Array.isArray(payload.data?.videos)) return payload.data.videos
  if (Array.isArray(payload.data?.categories)) return payload.data.categories
  if (Array.isArray(payload.data?.comments)) return payload.data.comments
  if (Array.isArray(payload.data?.replies)) return payload.data.replies
  if (Array.isArray(payload.data?.data)) return payload.data.data
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.videos)) return payload.videos
  if (Array.isArray(payload.categories)) return payload.categories
  if (Array.isArray(payload.comments)) return payload.comments
  if (Array.isArray(payload.replies)) return payload.replies
  return []
}

function extractHasMore(payload: any, listLength: number): boolean {
  if (!payload) return listLength >= 10
  const p = payload.result?.pagination ?? payload.pagination ?? payload.data?.pagination
  if (p && typeof p.has_more === "boolean") return p.has_more
  if (p && typeof p.hasMore === "boolean") return p.hasMore
  if (typeof payload.has_more === "boolean") return payload.has_more
  if (typeof payload.hasMore === "boolean") return payload.hasMore
  if (typeof payload.result?.has_more === "boolean") return payload.result.has_more
  return listLength >= 10
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ÉCRAN ACCUEIL (GRILLE DE VIDÉOS, RECHERCHE, CATÉGORIES)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Récupère la liste des catégories de vidéos.
 * GET /api/akwa_getCategories
 */
export async function getCategories(signal?: AbortSignal): Promise<AkwaCategory[]> {
  try {
    const res = await apiClient.get<any>("/akwa_getCategories", { signal })
    const list = extractDataArray(res.data)
    return list.map(normalizeAkwaCategory)
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les catégories.")
  }
}

/**
 * Récupère toutes les vidéos pour l'accueil (onglet "Tous").
 * GET /api/akwa_getAllVideos/{user_id}?page={page}
 */
export async function getAllVideos(
  userId: string | number,
  page = 1,
  signal?: AbortSignal
): Promise<{ videos: AkwaVideo[]; hasMore: boolean; page: number }> {
  try {
    const res = await apiClient.get<any>(`/akwa_getAllVideos/${encodeURIComponent(String(userId))}?page=${page}`, { signal })
    const rawList = extractDataArray(res.data)
    const videos = rawList.map(normalizeAkwaVideo)
    const hasMore = extractHasMore(res.data, videos.length)

    return { videos, hasMore, page }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les vidéos.")
  }
}

/**
 * Récupère les vidéos filtrées par catégorie.
 * GET /api/akwa_getVideosByCategory/{category_id}/{user_id}?page={page}
 */
export async function getVideosByCategory(
  categoryId: string | number,
  userId: string | number,
  page = 1,
  signal?: AbortSignal
): Promise<{ videos: AkwaVideo[]; hasMore: boolean; page: number }> {
  try {
    const res = await apiClient.get<any>(
      `/akwa_getVideosByCategory/${encodeURIComponent(String(categoryId))}/${encodeURIComponent(String(userId))}?page=${page}`,
      { signal }
    )
    const rawList = extractDataArray(res.data)
    const videos = rawList.map(normalizeAkwaVideo)
    const hasMore = extractHasMore(res.data, videos.length)

    return { videos, hasMore, page }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les vidéos de cette catégorie.")
  }
}

/**
 * Recherche des vidéos par mot-clé.
 * GET /api/akwa_akwa_video_search/{user_id}?query={query}&page={page}
 */
export async function searchVideos(
  userId: string | number,
  query: string,
  page = 1,
  signal?: AbortSignal
): Promise<{ videos: AkwaVideo[]; hasMore: boolean; page: number }> {
  try {
    const qs = new URLSearchParams({
      query: query.trim(),
      page: String(page),
    })

    const res = await apiClient.get<any>(
      `/akwa_akwa_video_search/${encodeURIComponent(String(userId))}?${qs.toString()}`,
      { signal }
    )
    const rawList = extractDataArray(res.data)
    const videos = rawList.map(normalizeAkwaVideo)
    const hasMore = extractHasMore(res.data, videos.length)

    return { videos, hasMore, page }
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors de la recherche de vidéos.")
  }
}

/**
 * Crée ou modifie une vidéo Akwaplay via FormData (multipart/form-data).
 * POST /api/akwa_store_video
 */
export async function storeVideo(
  payload: AkwaStoreVideoPayload,
  onUploadProgress?: (progressEvent: any) => void,
  signal?: AbortSignal
): Promise<{ success: boolean; video?: AkwaVideo; message?: string }> {
  try {
    const formData = new FormData()

    if (payload.videoId) {
      formData.append("video_id", String(payload.videoId))
    }
    formData.append("title", payload.title)
    if (payload.description) {
      formData.append("description", payload.description)
    }
    formData.append("category_id", String(payload.categoryId))
    formData.append("user_id", String(payload.userId))

    // Visibility
    const visibility = payload.visibility || (String(payload.privacy) === "1" ? "private" : "public")
    formData.append("visibility", visibility)
    if (payload.privacy !== undefined) {
      formData.append("privacy", String(payload.privacy))
    }

    // Duration (string obligatoire pour l'API)
    if (payload.duration) {
      formData.append("duration", String(payload.duration))
    }

    // Chaîne de publication
    if (payload.channelId) {
      formData.append("chanel", String(payload.channelId))
      formData.append("channel_id", String(payload.channelId))
      formData.append("channel", String(payload.channelId))
    }

    if (payload.videoFile) {
      formData.append("video", payload.videoFile)
      formData.append("file", payload.videoFile) // Compatibilité multi-backend
    }
    if (payload.thumbnailFile) {
      formData.append("thumbnail", payload.thumbnailFile)
    }

    const res = await apiClient.post<any>("/akwa_store_video", formData, {
      signal,
      onUploadProgress,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    const videoData = res.data?.video ?? res.data?.data
    return {
      success: Boolean(res.data?.success ?? true),
      message: res.data?.message,
      video: videoData ? normalizeAkwaVideo(videoData) : undefined,
    }
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors de la publication de la vidéo.")
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. ÉCRAN LECTURE VIDÉO (DÉTAILS, STREAM, ACTIONS, COMMENTAIRES)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Récupère les détails complets d'une vidéo (infos, auteur, statut like/favori).
 * GET /api/akwa_show_video?user_id={user_id}&video_id={video_id}
 */
export async function getVideoDetails(
  videoId: string | number,
  userId: string | number,
  signal?: AbortSignal
): Promise<{ video: AkwaVideo; isLiked: boolean; isDisliked: boolean; isFavorite: boolean }> {
  try {
    const qs = new URLSearchParams({
      user_id: String(userId),
      video_id: String(videoId),
    })

    const res = await apiClient.get<any>(`/akwa_show_video?${qs.toString()}`, { signal })
    const rawVideo = res.data?.result?.video ?? res.data?.result ?? res.data?.video ?? res.data?.data ?? res.data
    const video = normalizeAkwaVideo(rawVideo)

    return {
      video,
      isLiked: Boolean(video.isLiked),
      isDisliked: Boolean(video.isDisliked),
      isFavorite: Boolean(video.isFavorite),
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les détails de la vidéo.")
  }
}

/**
 * Construit l'URL canonique de streaming de la vidéo.
 * GET /api/akwa_video_stream/{video_id}
 */
export function getVideoStreamUrl(videoId: string | number): string {
  return `/api/akwa_video_stream/${encodeURIComponent(String(videoId))}`
}

/**
 * Incrémente le compteur de vues au démarrage de la lecture.
 * POST /api/akwa_incrementViews/{video_id}
 */
export async function incrementViews(
  videoId: string | number,
  userId?: string | number
): Promise<{ success: boolean; viewsCount?: number }> {
  try {
    const res = await apiClient.post<any>(`/akwa_incrementViews/${encodeURIComponent(String(videoId))}`, {
      user_id: userId,
    })
    return {
      success: Boolean(res.data?.success ?? true),
      viewsCount: res.data?.views ?? res.data?.views_count,
    }
  } catch {
    // Best effort pour le comptage de vues sans bloquer l'expérience
    return { success: false }
  }
}

/**
 * Enregistre la progression de lecture (toutes les X secondes ou à la fermeture).
 * POST /api/akwa_saveProgress
 */
export async function saveProgress(payload: AkwaSaveProgressPayload): Promise<{ success: boolean }> {
  try {
    const res = await apiClient.post<any>("/akwa_saveProgress", {
      video_id: payload.videoId,
      user_id: payload.userId,
      progress: Math.floor(payload.progress),
      duration: Math.floor(payload.duration),
    })
    return { success: Boolean(res.data?.success ?? true) }
  } catch {
    return { success: false }
  }
}

/**
 * Like ou Dislike une vidéo.
 * POST /api/akwa_toggleLike/{video_id}
 */
export async function toggleLikeVideo(
  videoId: string | number,
  userId: string | number,
  action: "like" | "dislike" = "like"
): Promise<AkwaToggleActionResponse & { message?: string }> {
  try {
    const res = await apiClient.post<any>(`/akwa_toggleLike/${encodeURIComponent(String(videoId))}`, {
      user_id: userId,
      reaction: action,
      action,
    })
    const rawDislikes = res.data?.dislikes_count ?? res.data?.dislike_count ?? res.data?.dislikes
    const rawLikesCount = res.data?.likes_count ?? res.data?.likes
    const likesCount =
      rawLikesCount !== undefined
        ? Number(rawLikesCount)
        : res.data?.like_count !== undefined
        ? Math.max(0, Number(res.data.like_count) - Number(rawDislikes ?? 0))
        : undefined

    return {
      success: Boolean(res.data?.success ?? true),
      liked: Boolean(res.data?.liked ?? res.data?.is_liked),
      disliked: Boolean(res.data?.disliked ?? res.data?.is_disliked),
      likesCount,
      dislikesCount: rawDislikes !== undefined ? Number(rawDislikes) : undefined,
      message: res.data?.message,
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'enregistrer votre réaction.")
  }
}

/**
 * Ajoute ou retire une vidéo des favoris.
 * POST /api/akwa_toggleFavorite/{video_id}
 */
export async function toggleFavoriteVideo(
  videoId: string | number,
  userId: string | number
): Promise<{ success: boolean; isFavorite: boolean }> {
  try {
    const res = await apiClient.post<any>(`/akwa_toggleFavorite/${encodeURIComponent(String(videoId))}`, {
      user_id: userId,
    })
    return {
      success: Boolean(res.data?.success ?? true),
      isFavorite: Boolean(res.data?.is_favorite ?? res.data?.favorite ?? res.data?.isFavorite),
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de modifier les favoris.")
  }
}

/**
 * Liste les motifs de signalement d'une vidéo.
 * GET /api/akwa_getReportReasons
 */
export async function getReportReasons(signal?: AbortSignal): Promise<AkwaReportReason[]> {
  try {
    const res = await apiClient.get<any>("/akwa_getReportReasons", { signal })
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.reasons)
      ? res.data.reasons
      : Array.isArray(res.data?.data)
      ? res.data.data
      : []

    return list.map((item: any) => ({
      id: item.id,
      reason: String(item.reason ?? item.label ?? item.title ?? "Motif"),
      description: item.description ?? null,
    }))
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les motifs de signalement.")
  }
}

/**
 * Signale une vidéo.
 * POST /api/akwa_reportVideo
 */
export async function reportVideo(payload: AkwaReportVideoPayload): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiClient.post<any>("/akwa_reportVideo", {
      video_id: payload.videoId,
      reason_id: payload.reasonId,
      details: payload.details,
      user_id: payload.userId,
    })
    return {
      success: Boolean(res.data?.success ?? true),
      message: res.data?.message ?? "Vidéo signalée avec succès.",
    }
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors du signalement de la vidéo.")
  }
}

// ── Commentaires et Réponses ────────────────────────────────────────────────

/**
 * Récupère les commentaires d'une vidéo.
 * GET /api/akwaFetchComments/{video_id}/{user_id}?page={page}
 */
export async function fetchVideoComments(
  videoId: string | number,
  userId: string | number,
  page = 1,
  signal?: AbortSignal
): Promise<{ comments: AkwaComment[]; hasMore: boolean; page: number }> {
  try {
    const res = await apiClient.get<any>(
      `/akwaFetchComments/${encodeURIComponent(String(videoId))}/${encodeURIComponent(String(userId))}?page=${page}`,
      { signal }
    )
    const rawList = extractDataArray(res.data)
    const comments = rawList.map((c: any) => normalizeAkwaComment(c, userId))
    const hasMore = extractHasMore(res.data, comments.length)

    return { comments, hasMore, page }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les commentaires.")
  }
}

/**
 * Ajoute un commentaire sur une vidéo.
 * POST /api/akwaComment_store
 */
export async function storeComment(
  payload: AkwaStoreCommentPayload
): Promise<{ success: boolean; comment?: AkwaComment; message?: string }> {
  try {
    const textValue = (payload.content || (payload as any).text || "").trim()
    const body: Record<string, any> = {
      video_id: payload.videoId,
      text: textValue,
      content: textValue,
      comment: textValue,
      user_id: payload.userId,
    }
    if (payload.commentId) {
      body.comment_id = payload.commentId
    }

    const res = await apiClient.post<any>("/akwaComment_store", body)

    const rawList = res.data?.data
    const commentData =
      (Array.isArray(rawList) && rawList.length > 0 ? rawList[0] : undefined) ??
      res.data?.comment ??
      res.data?.result ??
      res.data?.data

    return {
      success: Boolean(res.data?.success ?? true),
      comment: commentData ? normalizeAkwaComment(commentData, payload.userId) : undefined,
      message: res.data?.message,
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'ajouter le commentaire.")
  }
}

/**
 * Récupère les réponses à un commentaire (lazy loading).
 * GET /api/fetchCommentReplies/{comment_id}/{user_id}?page={page}
 */
export async function fetchCommentReplies(
  commentId: string | number,
  userId: string | number,
  page = 1,
  signal?: AbortSignal
): Promise<{ replies: AkwaCommentReply[]; hasMore: boolean; page: number }> {
  try {
    const res = await apiClient.get<any>(
      `/fetchCommentReplies/${encodeURIComponent(String(commentId))}/${encodeURIComponent(String(userId))}?page=${page}`,
      { signal }
    )
    const rawList = extractDataArray(res.data)
    const replies = rawList.map((r: any) => normalizeAkwaCommentReply(r, userId))
    const hasMore = extractHasMore(res.data, replies.length)

    return { replies, hasMore, page }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les réponses.")
  }
}

/**
 * Répond à un commentaire existant.
 * POST /api/akwaComment_replyComment
 */
export async function replyComment(
  payload: AkwaReplyCommentPayload
): Promise<{ success: boolean; reply?: AkwaCommentReply; message?: string }> {
  try {
    const textValue = (payload.content || (payload as any).text || "").trim()
    const res = await apiClient.post<any>("/akwaComment_replyComment", {
      comment_id: payload.commentId,
      text: textValue,
      content: textValue,
      comment: textValue,
      user_id: payload.userId,
    })

    const rawList = res.data?.data
    const replyData =
      res.data?.comment ??
      res.data?.reply ??
      (Array.isArray(rawList) && rawList.length > 0 ? rawList[0] : undefined) ??
      res.data?.result ??
      res.data?.data

    return {
      success: Boolean(res.data?.success ?? true),
      reply: replyData ? normalizeAkwaCommentReply(replyData, payload.userId) : undefined,
      message: res.data?.message,
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'envoyer la réponse.")
  }
}

/**
 * Like / unlike un commentaire ou une réponse de commentaire.
 * POST /api/akwaComment_toggleLike
 */
export async function toggleLikeComment(
  payload: AkwaToggleCommentLikePayload
): Promise<{ success: boolean; isLiked: boolean; likesCount?: number; message?: string }> {
  try {
    const type = payload.replyId ? "reply" : "comment"
    const res = await apiClient.post<any>("/akwaComment_toggleLike", {
      comment_id: payload.commentId,
      reply_id: payload.replyId,
      user_id: payload.userId,
      type,
    })

    return {
      success: Boolean(res.data?.success ?? true),
      isLiked: Boolean(res.data?.is_liked ?? res.data?.liked),
      likesCount: res.data?.likes_count ?? res.data?.like_count,
      message: res.data?.message,
    }
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors du like de commentaire.")
  }
}

/**
 * Supprime un commentaire racine.
 * DELETE /api/akwaDeleteComment/{comment_id}
 */
export async function deleteComment(
  commentId: string | number,
  userId: string | number
): Promise<{ success: boolean }> {
  try {
    const res = await apiClient.delete<any>(`/akwaDeleteComment/${encodeURIComponent(String(commentId))}`, {
      data: { user_id: userId },
    })
    return { success: Boolean(res.data?.success ?? true) }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer ce commentaire.")
  }
}

/**
 * Supprime une réponse à un commentaire.
 * DELETE /api/akwaDeleteReplyComment/{reply_comment_id}
 */
export async function deleteReplyComment(
  replyCommentId: string | number,
  userId: string | number
): Promise<{ success: boolean }> {
  try {
    const res = await apiClient.delete<any>(`/akwaDeleteReplyComment/${encodeURIComponent(String(replyCommentId))}`, {
      data: { user_id: userId },
    })
    return { success: Boolean(res.data?.success ?? true) }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer cette réponse.")
  }
}

// ── Suggestions et Tendances (Sidebar "Voir aussi") ──────────────────────────

/**
 * Récupère les vidéos tendances globales (suggestions).
 * GET /api/akwa_trending?page={page}
 */
export async function getTrendingVideos(
  page = 1,
  signal?: AbortSignal
): Promise<{ videos: AkwaVideo[]; hasMore: boolean; page: number }> {
  try {
    const res = await apiClient.get<any>(`/akwa_trending?page=${page}`, { signal })
    const rawList = extractDataArray(res.data)
    const videos = rawList.map(normalizeAkwaVideo)
    const hasMore = extractHasMore(res.data, videos.length)

    return { videos, hasMore, page }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les vidéos suggérées.")
  }
}

/**
 * Récupère les vidéos suggérées selon une catégorie donnée.
 * GET /api/akwa_getTrendingByCategory/{category_id}/{user_id}?page={page}
 */
export async function getTrendingByCategory(
  categoryId: string | number,
  userId: string | number,
  page = 1,
  signal?: AbortSignal
): Promise<{ videos: AkwaVideo[]; hasMore: boolean; page: number }> {
  try {
    const res = await apiClient.get<any>(
      `/akwa_getTrendingByCategory/${encodeURIComponent(String(categoryId))}/${encodeURIComponent(String(userId))}?page=${page}`,
      { signal }
    )
    const rawList = extractDataArray(res.data)
    const videos = rawList.map(normalizeAkwaVideo)
    const hasMore = extractHasMore(res.data, videos.length)

    return { videos, hasMore, page }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les suggestions de catégorie.")
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ÉCRAN PROFIL — ONGLET "MES VIDÉOS" (LISTE, ÉDITION, SUPPRESSION)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Récupère les vidéos publiées par un utilisateur.
 * GET /api/akwa_userVideos/{user_id}/{viewer_id}?page={page}
 */
export async function getUserVideos(
  userId: string | number,
  viewerId: string | number,
  page = 1,
  signal?: AbortSignal
): Promise<{ videos: AkwaVideo[]; hasMore: boolean; page: number }> {
  try {
    const res = await apiClient.get<any>(
      `/akwa_userVideos/${encodeURIComponent(String(userId))}/${encodeURIComponent(String(viewerId))}?page=${page}`,
      { signal }
    )
    const rawList = extractDataArray(res.data)
    const videos = rawList.map(normalizeAkwaVideo)
    const hasMore = extractHasMore(res.data, videos.length)

    return { videos, hasMore, page }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger vos vidéos.")
  }
}

/**
 * Supprime définitivement une vidéo de l'utilisateur.
 * DELETE /api/akwa_destroy/{video_id}
 */
export async function destroyVideo(
  videoId: string | number,
  userId: string | number
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiClient.delete<any>(`/akwa_destroy/${encodeURIComponent(String(videoId))}`, {
      data: { user_id: userId },
    })
    return {
      success: Boolean(res.data?.success ?? true),
      message: res.data?.message ?? "Vidéo supprimée avec succès.",
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer la vidéo.")
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. VIDÉOS FAVORITES D'UN UTILISATEUR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Récupère les vidéos marquées comme favorites par un utilisateur.
 * GET /api/akwa_getFavoritesVideos/{user_id}?page={page}
 */
export async function getFavoriteVideos(
  userId: string | number,
  page = 1,
  signal?: AbortSignal
): Promise<{ videos: AkwaVideo[]; hasMore: boolean; page: number }> {
  try {
    const res = await apiClient.get<any>(
      `/akwa_getFavoritesVideos/${encodeURIComponent(String(userId))}?page=${page}`,
      { signal }
    )
    const rawList = extractDataArray(res.data)
    const videos = rawList.map(normalizeAkwaVideo)
    const hasMore = extractHasMore(res.data, videos.length)

    return { videos, hasMore, page }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger vos favoris.")
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. VIDÉOS DES ABONNEMENTS (FOLLOWING)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Récupère les vidéos des comptes suivis.
 * GET /api/akwa_followingVideos/{user_id}
 */
export async function getFollowingVideos(
  userId: string | number,
  signal?: AbortSignal
): Promise<AkwaVideo[]> {
  try {
    const res = await apiClient.get<any>(
      `/akwa_followingVideos/${encodeURIComponent(String(userId))}`,
      { signal }
    )
    const rawList = extractDataArray(res.data)
    return rawList.map(normalizeAkwaVideo)
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les vidéos de vos abonnements.")
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. ACTIVITÉS AKWAPLAY D'UN UTILISATEUR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Récupère les activités Akwaplay d'un utilisateur.
 * GET /api/akwa_get_user_activities?user_id={user_id}
 */
export async function getUserActivities(
  userId: string | number,
  signal?: AbortSignal
): Promise<AkwaUserActivity[]> {
  try {
    const res = await apiClient.get<any>(
      `/akwa_get_user_activities?user_id=${encodeURIComponent(String(userId))}`,
      { signal }
    )
    const rawList = res.data?.activities?.data ?? res.data?.activities ?? extractDataArray(res.data)
    if (!Array.isArray(rawList)) return []
    return rawList.map(normalizeAkwaUserActivity)
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les activités.")
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. ESPACE / PROFIL AKWAPLAY D'UN UTILISATEUR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Récupère l'espace / profil Akwaplay complet d'un utilisateur (vidéos, infos créateur).
 * GET /api/user_akwaplay/{user_id}
 */
export async function getUserAkwaplay(
  userId: string | number,
  signal?: AbortSignal
): Promise<any> {
  try {
    const res = await apiClient.get<any>(
      `/user_akwaplay/${encodeURIComponent(String(userId))}`,
      { signal }
    )
    return res.data?.result ?? res.data?.data ?? res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger l'espace Akwaplay.")
  }
}

