/**
 * Service FRONTEND « Pages » (domaine Espaces).
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. Il n'appelle que les routes internes /api/pages, ne connaît pas
 * React, ne déclenche aucun toast et transforme les erreurs techniques en
 * ApiError cohérentes (messages français approuvés).
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  DughuPage,
  InvitableUser,
  PageCategory,
  PageFormValues,
  PageImage,
  PageLike,
  PageMutationResponse,
  PagePost,
  PageSocialLinks,
  PagesListResponse,
} from "@/types/pages/pages.types"

export type PagesScope = "feed" | "mine" | "liked" | "suggestions" | "administered"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** Liste des pages selon la portée (GET /api/pages?scope=…). */
export async function fetchPages(
  scope: PagesScope,
  options: { page?: number; q?: string; signal?: AbortSignal } = {}
): Promise<PagesListResponse> {
  try {
    const res = await apiClient.get<PagesListResponse>("/pages", {
      params: { scope, page: options.page && options.page > 1 ? options.page : undefined, q: options.q || undefined },
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les espaces.")
  }
}

/** Détail d'une page (GET /api/pages/:id). */
export async function fetchPageDetail(pageId: string, userId?: string, signal?: AbortSignal): Promise<{ success: boolean; message?: string; page?: DughuPage }> {
  try {
    const url = userId
      ? `/pages/${encodeURIComponent(pageId)}?user_id=${encodeURIComponent(userId)}`
      : `/pages/${encodeURIComponent(pageId)}`
    const res = await apiClient.get<{ success: boolean; message?: string; page?: DughuPage }>(url, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger l'espace.")
  }
}

/** Catégories (GET /api/pages/categories). */
export async function fetchPageCategories(signal?: AbortSignal): Promise<PageCategory[]> {
  try {
    const res = await apiClient.get<{ success: boolean; categories?: PageCategory[] }>("/pages/categories", { signal })
    return res.data.categories ?? []
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les catégories.")
  }
}

/** Publications d'un espace (GET /api/pages/:id/posts) — format PostCard complet. */
export async function fetchPagePosts(pageId: string, page = 1, signal?: AbortSignal): Promise<{ success: boolean; posts: Record<string, unknown>[]; hasMore: boolean }> {
  try {
    const res = await apiClient.get<{ success: boolean; posts: Record<string, unknown>[]; hasMore: boolean }>(
      `/pages/${encodeURIComponent(pageId)}/posts`,
      { params: { page }, signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les publications.")
  }
}

/** Réponse du fil d'actualité des espaces (GET /api/pages/feed). */
export interface PagesPostsFeedResponse {
  success: boolean
  message?: string
  /** Posts déjà mappés côté serveur (même forme que le fil principal, PostCard). */
  posts: Record<string, unknown>[]
  hasMore: boolean
  page: number
}

/**
 * Fil d'actualité des publications des espaces (GET /api/pages/feed).
 * Les posts sont normalisés côté serveur (mapper du fil principal) et
 * directement consommables par la carte `PostCard`.
 */
export async function fetchPagesPostsFeed(page = 1, signal?: AbortSignal): Promise<PagesPostsFeedResponse> {
  try {
    const res = await apiClient.get<PagesPostsFeedResponse>("/pages/feed", {
      params: { page: page > 1 ? page : undefined },
      signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger l'actualité des espaces.")
  }
}

/** Galerie d'images (GET /api/pages/:id/images). */
export async function fetchPageImages(pageId: string, page = 1, signal?: AbortSignal): Promise<{ success: boolean; images: PageImage[]; hasMore: boolean }> {
  try {
    const res = await apiClient.get<{ success: boolean; images: PageImage[]; hasMore: boolean }>(
      `/pages/${encodeURIComponent(pageId)}/images`,
      { params: { page }, signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger la galerie.")
  }
}

/** Likes d'une page (GET /api/pages/:id/likes). */
export async function fetchPageLikes(pageId: string, signal?: AbortSignal): Promise<{ success: boolean; likes: PageLike[] }> {
  try {
    const res = await apiClient.get<{ success: boolean; likes: PageLike[] }>(`/pages/${encodeURIComponent(pageId)}/likes`, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les likes.")
  }
}

/** Like / unlike (POST /api/pages/:id/like). */
/** Créer / mettre à jour une page (POST /api/pages). */
export async function createOrUpdatePage(
  values: PageFormValues & { pageId?: string },
  signal?: AbortSignal
): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>("/pages", values, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'enregistrer l'espace.")
  }
}

/** Supprimer une page (POST /api/pages/:id/destroy). */
export async function destroyPage(pageId: string, password: string, signal?: AbortSignal): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>(
      `/pages/${encodeURIComponent(pageId)}/destroy`,
      { password },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer l'espace.")
  }
}

/** Amis invitables (GET /api/pages/:id/invites). */
export async function fetchInvitableFriends(pageId: string, signal?: AbortSignal): Promise<InvitableUser[]> {
  try {
    const res = await apiClient.get<{ success: boolean; friends?: InvitableUser[] }>(`/pages/${encodeURIComponent(pageId)}/invites`, { signal })
    return res.data.friends ?? []
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les amis invitables.")
  }
}

/** Inviter un ami (POST /api/pages/:id/invite). */
export async function inviteFriend(pageId: string, friendId: string, signal?: AbortSignal): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>(`/pages/${encodeURIComponent(pageId)}/invite`, { friendId }, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'envoyer l'invitation.")
  }
}

/** Upload avatar/cover (POST /api/pages/:id/upload-image, multipart). */
export async function uploadPageImage(pageId: string, file: File, element: "avatar" | "cover", signal?: AbortSignal): Promise<PageMutationResponse> {
  const formData = new FormData()
  formData.append("image", file)
  formData.append("element", element)
  try {
    const res = await apiClient.post<PageMutationResponse>(`/pages/${encodeURIComponent(pageId)}/upload-image`, formData, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'envoyer l'image.")
  }
}

/** Destinataire des points (POST /api/pages/:id/points-recipient). */
export async function updatePointsRecipient(pageId: string, recipient: "subscriber" | "owner" | "none", signal?: AbortSignal): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>(`/pages/${encodeURIComponent(pageId)}/points-recipient`, { recipient }, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de mettre à jour le destinataire des points.")
  }
}

/** Liens sociaux (POST /api/pages/:id/social-links). */
export async function updateSocialLinks(pageId: string, links: PageSocialLinks, signal?: AbortSignal): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>(`/pages/${encodeURIComponent(pageId)}/social-links`, links, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de mettre à jour les liens sociaux.")
  }
}
export async function likePage(pageId: string, signal?: AbortSignal): Promise<{ success: boolean; message?: string; isLike?: boolean }> {
  try {
    const res = await apiClient.post<{ success: boolean; message?: string; isLike?: boolean }>(
      `/pages/${encodeURIComponent(pageId)}/like`,
      {},
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de liker cet espace.")
  }
}
