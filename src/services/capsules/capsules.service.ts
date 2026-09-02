/**
 * Service FRONTEND du domaine Capsules.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. N'appelle que les routes internes /api/capsules*, ne connaît pas
 * React, ne déclenche aucun toast et transforme les erreurs techniques en
 * ApiError cohérentes. Avec FormData, Axios construit automatiquement le
 * Content-Type multipart.
 *
 * Les types restent dans @/lib/capsule-service (source unique) pendant la
 * migration — leur déplacement vers types/capsules/ se fera au lot de
 * réorganisation finale.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  Capsule,
  CapsuleComment,
  CapsuleCommentsResult,
  CapsuleFeedResult,
} from "@/lib/capsule-service"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** POST JSON générique : lève une ApiError si success:false ou status != 2xx. */
async function postJson<T = Record<string, unknown>>(url: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  try {
    const res = await apiClient.post<T & { success?: boolean; message?: string }>(url, body, { signal })
    if (res.data && res.data.success === false) {
      throw new ApiError(res.data.message || "Erreur capsules", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur capsules")
  }
}

/** Feed des capsules (page /capsules + rail du fil). */
export async function fetchCapsulesFeed(
  { userId, page = 1, perPage }: { userId?: string; page?: number; perPage?: number },
  signal?: AbortSignal
): Promise<CapsuleFeedResult> {
  try {
    const qs = new URLSearchParams()
    if (userId) qs.set("userId", userId)
    qs.set("page", String(page))
    if (perPage) qs.set("perPage", String(perPage))
    const res = await apiClient.get<CapsuleFeedResult & { success: boolean; message?: string }>(`/capsules?${qs}`, { signal })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur capsules", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur capsules")
  }
}

/** Like / unlike une capsule. */
export function toggleCapsuleLike({ capsuleId, userId }: { capsuleId: string; userId?: string }) {
  return postJson<{ success: boolean; liked?: boolean }>(
    `/capsules/${encodeURIComponent(capsuleId)}/react`, { action: "like", userId }
  )
}

/** Dislike / undislike une capsule. */
export function toggleCapsuleDislike({ capsuleId, userId }: { capsuleId: string; userId?: string }) {
  return postJson<{ success: boolean; disliked?: boolean }>(
    `/capsules/${encodeURIComponent(capsuleId)}/react`, { action: "dislike", userId }
  )
}

/** Enregistre une vue sur une capsule (best effort, sans erreur bloquante). */
export async function logCapsuleView({ capsuleId, userId }: { capsuleId: string; userId?: string }) {
  try {
    const res = await apiClient.post<{ success?: boolean }>(
      `/capsules/${encodeURIComponent(capsuleId)}/view`, { userId }
    )
    return { ok: res.status >= 200 && res.status < 300 && !!res.data?.success }
  } catch {
    return { ok: false }
  }
}

/** Commentaires d'une capsule (pagination distante). */
export async function fetchCapsuleComments({
  capsuleId,
  userId,
  page = 1,
}: {
  capsuleId: string
  userId?: string
  page?: number
}, signal?: AbortSignal): Promise<CapsuleCommentsResult> {
  try {
    const qs = new URLSearchParams()
    if (userId) qs.set("userId", userId)
    qs.set("page", String(Math.max(1, page)))
    const res = await apiClient.get<CapsuleCommentsResult & { success?: boolean; message?: string }>(
      `/capsules/${encodeURIComponent(capsuleId)}/comments?${qs}`, { signal }
    )
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur commentaires", { status: res.status })
    }
    const safePage = Math.max(1, page)
    const fallback = { page: safePage, perPage: 5, total: 0, lastPage: safePage, hasMore: false }
    return {
      comments: (res.data.comments || []) as CapsuleComment[],
      pagination: res.data.pagination || fallback,
    }
  } catch (error) {
    throw toServiceApiError(error, "Erreur commentaires")
  }
}

/** Ajoute un commentaire sur une capsule. */
export function addCapsuleComment({
  capsuleId,
  content,
  userId,
}: {
  capsuleId: string
  content: string
  userId?: string
}) {
  return postJson<{ success: boolean; comment?: CapsuleComment | null }>(
    `/capsules/${encodeURIComponent(capsuleId)}/comments`,
    { content, userId }
  )
}

/** Répond à un commentaire (ou à une réponse) d'une capsule. */
export function replyCapsuleComment({
  capsuleId,
  commentId,
  content,
  userId,
  isReplyReply = false,
}: {
  capsuleId: string
  commentId: string
  userId?: string
  content: string
  isReplyReply?: boolean
}) {
  return postJson<{ success: boolean; reply?: CapsuleComment | null }>(
    `/capsules/${encodeURIComponent(capsuleId)}/comments/${encodeURIComponent(commentId)}`,
    { action: isReplyReply ? "replyReply" : "reply", content, userId }
  )
}

/** Like / unlike un commentaire de capsule (`replyId` = like d'une réponse). */
export function likeCapsuleComment({
  capsuleId,
  commentId,
  userId,
  replyId,
}: {
  capsuleId: string
  commentId: string
  userId?: string
  /** Id de la réponse ciblée (champ `CommentReply_id` Dughu) — absent pour un commentaire racine. */
  replyId?: string
}) {
  return postJson<{ success: boolean; liked?: boolean; likesCount?: number }>(
    `/capsules/${encodeURIComponent(capsuleId)}/comments/${encodeURIComponent(commentId)}`,
    { action: "like", userId, replyId }
  )
}

/** Signale une capsule (reason_id = motif catégorisé, text = détail libre). */
export function reportCapsule({
  capsuleId,
  userId,
  reason,
  reasonId,
  text,
}: {
  capsuleId: string
  userId?: string
  reason?: string
  reasonId?: string | number
  text?: string
}) {
  return postJson(`/capsules/${encodeURIComponent(capsuleId)}/report`, {
    reason,
    reasonId,
    text,
    userId,
  })
}

/** Supprime une capsule (auteur uniquement). */
export async function deleteCapsule(capsuleId: string) {
  try {
    const res = await apiClient.delete<{ success?: boolean; message?: string }>(
      `/capsules/${encodeURIComponent(capsuleId)}`
    )
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur suppression", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur suppression")
  }
}

/** Crée une capsule (route interne multipart → POST /store/capsule Dughu). */
export async function createCapsule({
  video,
  caption,
  userId,
}: {
  video: File
  caption?: string
  userId?: string
}): Promise<Capsule | null> {
  try {
    const formData = new FormData()
    formData.append("video", video)
    if (caption) formData.append("caption", caption)
    if (userId) formData.append("userId", userId)
    const res = await apiClient.post<{ success?: boolean; message?: string; capsule?: Capsule | null }>(
      "/capsules", formData
    )
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Impossible de publier votre capsule.", { status: res.status })
    }
    return res.data.capsule ?? null
  } catch (error) {
    throw toServiceApiError(error, "Impossible de publier votre capsule.")
  }
}

/** Capsules d'un utilisateur précis (GET /shortsUser/{user_id} Dughu). */
export async function fetchUserCapsules(targetUserId: string, viewerId?: string, signal?: AbortSignal): Promise<Capsule[]> {
  try {
    const qs = new URLSearchParams()
    if (viewerId) qs.set("viewerId", viewerId)
    const res = await apiClient.get<{ success?: boolean; message?: string; capsules?: Capsule[] }>(
      `/capsules/user/${encodeURIComponent(targetUserId)}?${qs}`, { signal }
    )
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur capsules", { status: res.status })
    }
    return res.data.capsules || []
  } catch (error) {
    throw toServiceApiError(error, "Erreur capsules")
  }
}

