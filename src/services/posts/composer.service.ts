/**
 * Service FRONTEND — données du composeur de publication (couleurs, hashtags).
 * Utilise uniquement l'instance Axios cliente et les routes internes /api.
 * Les échecs sont silencieux côté composant (fallback sur les valeurs par
 * défaut) : le service se contente de normaliser l'erreur.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  ComposerColorsResponse,
  HashtagSearchResponse,
} from "@/types/posts/post.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** Charge les couleurs dynamiques via GET /api/colors. */
export async function fetchComposerColors(
  options: { signal?: AbortSignal } = {}
): Promise<ComposerColorsResponse> {
  try {
    const res = await apiClient.get<ComposerColorsResponse>("/colors", { signal: options.signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les couleurs")
  }
}

/** Recherche des hashtags via GET /api/hashtags?q=… (autocomplétion, annulable). */
export async function searchHashtags(
  query: string,
  options: { signal?: AbortSignal } = {}
): Promise<HashtagSearchResponse> {
  try {
    const res = await apiClient.get<HashtagSearchResponse>(
      `/hashtags?q=${encodeURIComponent(query)}`,
      { signal: options.signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de rechercher des hashtags")
  }
}
