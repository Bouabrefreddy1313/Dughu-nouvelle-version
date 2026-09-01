/**
 * Service FRONTEND du domaine Commentaires.
 * Utilise uniquement l'instance Axios cliente et les routes internes /api.
 * Ne connaît pas React, ne déclenche aucun toast.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { CommentResponse } from "@/types/posts/post.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** Charge les commentaires via GET /api/comments?postId=…. */
export async function fetchComments(
  params: { postId: string; userId?: string; dughuUserId?: string },
  options: { signal?: AbortSignal } = {}
): Promise<CommentResponse> {
  const { postId, userId, dughuUserId } = params
  try {
    const userIdQuery = userId ? `&userId=${userId}` : ""
    const dughuUserIdQuery = dughuUserId ? `&dughuUserId=${dughuUserId}` : ""
    const res = await apiClient.get<CommentResponse>(
      `/comments?postId=${postId}${userIdQuery}${dughuUserIdQuery}`,
      { signal: options.signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les commentaires")
  }
}

/** Publie un commentaire (ou une réponse) via POST /api/comments.
 * Accepte un FormData (multipart avec fichiers — Axios gère le Content-Type)
 * ou un objet JSON (commentaire simple). */
export async function addComment(
  payload: FormData | Record<string, unknown>,
  signal?: AbortSignal
): Promise<CommentResponse> {
  try {
    const res = await apiClient.post<CommentResponse>("/comments", payload, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur réseau commentaire")
  }
}

/** Supprime un commentaire via DELETE /api/comments/:id. */
export async function deleteComment(
  commentId: string,
  payload: { userId: string; isReply: boolean },
  signal?: AbortSignal
): Promise<CommentResponse> {
  try {
    const res = await apiClient.delete<CommentResponse>(`/comments/${commentId}`, {
      data: payload,
      signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer le commentaire")
  }
}

/** Réagit à un commentaire via POST /api/comments/:id/like. */
export async function likeComment(
  commentId: string,
  payload: { userId: string; type: string; isReply: boolean },
  signal?: AbortSignal
): Promise<CommentResponse> {
  try {
    const res = await apiClient.post<CommentResponse>(`/comments/${commentId}/like`, payload, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur réseau lors de la réaction")
  }
}

/** Signale un commentaire via POST /api/comments/:id/report. */
export async function reportComment(
  commentId: string,
  payload: { userId: string; reason: string },
  signal?: AbortSignal
): Promise<CommentResponse> {
  try {
    const res = await apiClient.post<CommentResponse>(`/comments/${commentId}/report`, payload, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur réseau lors du signalement")
  }
}
