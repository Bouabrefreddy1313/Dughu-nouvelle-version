/**
 * Service FRONTEND du domaine Publications.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. Il n'appelle que les routes internes /api, ne connaît pas React,
 * ne déclenche aucun toast, ne fait aucune redirection et transforme les
 * erreurs techniques en ApiError cohérentes.
 *
 * Avec FormData, Axios construit automatiquement le Content-Type et sa
 * boundary : ne jamais fixer ce header manuellement.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  PostMutationResponse,
  PostsResponse,
} from "@/types/posts/post.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/**
 * Indique si l'erreur provient d'une annulation (AbortSignal expiré ou
 * timeout Axios). Utilisé par le feed pour conserver le message
 * « Chargement trop long, reessayez. »
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true
  if (error instanceof ApiError && error.code === "ERR_CANCELED") return true
  if (error instanceof Error && error.name === "CanceledError") return true
  return false
}

/**
 * Charge le fil via GET /api/posts.
 * Comportement conservé : la route renvoie { success, posts, hasMore } —
 * la validation et le mapping restent à la charge de l'appelant.
 */
export async function fetchPosts(
  params: { page: number; filter?: string; userId?: string; dughuUserId?: string; authorId?: string },
  options: { signal?: AbortSignal } = {}
): Promise<PostsResponse> {
  const { page, filter = "all", userId = "", dughuUserId = "", authorId = "" } = params
  try {
    const res = await apiClient.get<PostsResponse>(
      `/posts?page=${page}&filter=${filter}&userId=${userId}&dughuUserId=${dughuUserId}&authorId=${authorId}`,
      { signal: options.signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur chargement posts. Reessayez.")
  }
}

/**
 * Charge les publications d'un hashtag via GET /api/hashtags/posts.
 * Comportement conservé : la route renvoie { success, posts, hasMore, total }.
 */
export async function fetchHashtagPosts(
  tag: string,
  page: number,
  options: { signal?: AbortSignal } = {}
): Promise<PostsResponse & { total?: number }> {
  try {
    const res = await apiClient.get<PostsResponse & { total?: number }>(
      `/hashtags/posts?tag=${encodeURIComponent(tag)}&page=${page}`,
      { signal: options.signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors du chargement du hashtag")
  }
}

/** Crée une publication via POST /api/posts (multipart). */
export async function createPost(formData: FormData, signal?: AbortSignal): Promise<PostMutationResponse> {
  try {
    const res = await apiClient.post<PostMutationResponse>("/posts", formData, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur création post")
  }
}

/** Republie avec texte via POST /api/rePost (multipart). */
export async function rePost(formData: FormData, signal?: AbortSignal): Promise<PostMutationResponse> {
  try {
    const res = await apiClient.post<PostMutationResponse>("/rePost", formData, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur repost")
  }
}

/** Ajoute une réaction via POST /api/reactions. */
export async function addReaction(
  payload: { postId: string; userId: string; type: string; dughuUserId?: string },
  signal?: AbortSignal
): Promise<PostMutationResponse> {
  try {
    const res = await apiClient.post<PostMutationResponse>("/reactions", payload, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur réseau lors de la réaction")
  }
}

/**
 * [MIGRATION LOT 5] Le domaine Commentaires vit désormais dans
 * src/services/posts/comments.service.ts (fetchComments, addComment,
 * deleteComment, likeComment, reportComment). Cet addComment ci-dessous a été
 * retiré : mettre à jour les imports vers "@/services/posts/comments.service".
 */

/** Supprime une publication via DELETE /api/deletePost/:id.
 * Comportement conservé : renvoie false sans lever si la route échoue
 * (l'appelant historique n'affichait aucun message d'erreur dédié). */
export async function deletePost(postId: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await apiClient.delete(`/deletePost/${postId}`, { signal })
    return res.status >= 200 && res.status < 300
  } catch {
    return false
  }
}

/** Bascule l'épinglage via POST /api/togglePinStatus/:id (comportement conservé : boolean). */
export async function togglePin(
  postId: string,
  payload: { userId?: string; dughuUserId?: string },
  signal?: AbortSignal
): Promise<boolean> {
  try {
    const res = await apiClient.post(`/togglePinStatus/${postId}`, payload, { signal })
    return res.status >= 200 && res.status < 300
  } catch {
    return false
  }
}

/** Masque une publication via POST /api/hidePost (comportement conservé : boolean). */
export async function hidePost(
  payload: { postId: string; userId?: string; dughuUserId?: string },
  signal?: AbortSignal
): Promise<boolean> {
  try {
    const res = await apiClient.post("/hidePost", payload, { signal })
    return res.status >= 200 && res.status < 300
  } catch {
    return false
  }
}

/** Bloque / débloque un auteur via POST /api/block_user. */
export async function blockUser(
  payload: { authorId: string; userId?: string; dughuUserId?: string },
  signal?: AbortSignal
): Promise<PostMutationResponse> {
  try {
    const res = await apiClient.post<PostMutationResponse>("/block_user", payload, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors du blocage")
  }
}

/** Enregistre / retire des favoris via POST /api/store-save. */
export async function storeSave(
  payload: { postId: string; userId?: string; dughuUserId?: string },
  signal?: AbortSignal
): Promise<PostMutationResponse> {
  try {
    const res = await apiClient.post<PostMutationResponse>("/store-save", payload, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors de l'enregistrement")
  }
}

/** Booste une publication via POST /api/boostPost. */
export async function boostPost(
  payload: { postId: string; userId?: string; days?: number },
  signal?: AbortSignal
): Promise<PostMutationResponse> {
  try {
    const res = await apiClient.post<PostMutationResponse>("/boostPost", payload, { signal })
    if (!res.status || res.status < 200 || res.status >= 300) {
      throw new ApiError("Erreur boost", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur boost")
  }
}

/** Suit / ne suit plus un auteur via POST /api/profile/follow. */
export async function followAuthor(
  payload: { userId: string; targetId: string; following: boolean },
  signal?: AbortSignal
): Promise<PostMutationResponse> {
  try {
    const res = await apiClient.post<PostMutationResponse>("/profile/follow", payload, { signal })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur lors de l'abonnement", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de modifier l'abonnement")
  }
}

