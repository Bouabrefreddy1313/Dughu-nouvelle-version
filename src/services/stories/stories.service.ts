/**
 * Service FRONTEND du domaine Stories / Flash.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. N'appelle que les routes internes /api/stories*, ne connaît pas
 * React, ne déclenche aucun toast et transforme les erreurs techniques en
 * ApiError cohérentes.
 *
 * Les types restent dans @/lib/flash-service (source unique) pendant la
 * migration — leur déplacement vers types/stories/ se fera au lot de
 * réorganisation finale.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { FlashPagination } from "@/lib/flash-service"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** Charge les stories (rail principal). */
export async function fetchStories(signal?: AbortSignal) {
  try {
    const res = await apiClient.get<{ success?: boolean; message?: string; stories?: unknown[] }>("/stories", { signal })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur stories", { status: res.status })
    }
    return res.data.stories || []
  } catch (error) {
    throw toServiceApiError(error, "Erreur stories")
  }
}

/** Rail Flash : stories des amis/contacts (paginé). */
export async function fetchFriendsFlash(
  { userId, page, perPage }: { userId?: string; page?: number; perPage?: number },
  signal?: AbortSignal
) {
  try {
    const qs = new URLSearchParams()
    if (userId) qs.set("userId", userId)
    if (page) qs.set("page", String(page))
    if (perPage) qs.set("perPage", String(perPage))
    const res = await apiClient.get<{ success?: boolean; message?: string } & Record<string, unknown>>(
      `/stories/friends?${qs}`, { signal }
    )
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur Flash", { status: res.status })
    }
    return res.data as { success: boolean; users: unknown[]; stories: unknown[]; pagination: FlashPagination }
  } catch (error) {
    throw toServiceApiError(error, "Erreur Flash")
  }
}

/** Stories Flash d'un utilisateur précis (viewer plein écran, paginé). */
export async function fetchUserFlash(
  { userId, targetUserId, page = 1 }: { userId?: string; targetUserId: string; page?: number },
  signal?: AbortSignal
) {
  try {
    const qs = new URLSearchParams()
    if (userId) qs.set("userId", userId)
    qs.set("targetUserId", targetUserId)
    qs.set("page", String(page))
    const res = await apiClient.get<{ success?: boolean; message?: string } & Record<string, unknown>>(
      `/stories/user?${qs}`, { signal }
    )
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur Flash", { status: res.status })
    }
    return res.data as { success: boolean; stories: unknown[]; pagination: FlashPagination }
  } catch (error) {
    throw toServiceApiError(error, "Erreur Flash")
  }
}

/** Bascule le « j'aime » de l'utilisateur courant sur une story. */
export async function toggleStoryLike({ storyId, userId }: { storyId: string; userId?: string }) {
  try {
    const res = await apiClient.post<{ success?: boolean; message?: string; liked?: boolean }>(
      "/stories/like", { storyId, userId }
    )
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur de réaction", { status: res.status })
    }
    return res.data as { success: boolean; liked?: boolean }
  } catch (error) {
    throw toServiceApiError(error, "Erreur de réaction")
  }
}

/** Supprime un Flash (auteur uniquement). */
export async function deleteStory(storyId: string) {
  try {
    const res = await apiClient.delete<{ success?: boolean; message?: string }>(
      `/stories/${encodeURIComponent(storyId)}`
    )
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur suppression", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur suppression")
  }
}

/** Enregistre une vue sur une story (best effort, sans erreur bloquante). */
export async function logStoryView({ storyId, userId }: { storyId: string; userId?: string }) {
  try {
    const res = await apiClient.post<{ success?: boolean }>("/stories/logView", { storyId, userId })
    return { ok: res.status >= 200 && res.status < 300 && !!res.data?.success }
  } catch {
    return { ok: false }
  }
}

/**
 * Publie un nouveau Flash (POST /api/stories, multipart).
 * Le FormData est transmis tel quel : Axios gère le Content-Type et sa
 * boundary — ne jamais fixer ce header manuellement.
 */
export async function createStory(
  formData: FormData,
  signal?: AbortSignal
): Promise<{ success: boolean; message?: string; story?: { id?: string | number } }> {
  try {
    const res = await apiClient.post<{ success?: boolean; message?: string; story?: { id?: string | number } }>(
      "/stories", formData, { signal }
    )
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur création du Flash", { status: res.status })
    }
    // Le guard ci-dessus garantit success:true — cast explicite du contrat de retour.
    return res.data as { success: boolean; message?: string; story?: { id?: string | number } }
  } catch (error) {
    throw toServiceApiError(error, "Erreur création du Flash")
  }
}

/**
 * Liste des personnes ayant vu une story (auteur uniquement).
 * Comportement conservé : best effort — retourne [] en cas d'échec.
 */
export async function fetchStoryViewers(
  { storyId, userId }: { storyId: string; userId?: string },
  signal?: AbortSignal
) {
  try {
    const qs = new URLSearchParams()
    qs.set("storyId", storyId)
    if (userId) qs.set("userId", userId)
    const res = await apiClient.get<{ success?: boolean; viewers?: unknown[] }>(`/stories/logView?${qs}`, { signal })
    if (!res.data?.success) return []
    return res.data.viewers || []
  } catch {
    return []
  }
}
