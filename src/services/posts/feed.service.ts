/**
 * Service FRONTEND — Points et suggestions du fil (sidebar feed).
 * Utilise uniquement l'instance Axios cliente et les routes internes /api.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  GivePointsPayload,
  PointsTodayResponse,
  PostMutationResponse,
  SuggestionsResponse,
} from "@/types/posts/post.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** Offre des points à l'auteur d'un post via POST /api/points/give. */
export async function givePoints(payload: GivePointsPayload, signal?: AbortSignal): Promise<PostMutationResponse> {
  try {
    const res = await apiClient.post<PostMutationResponse>("/points/give", payload, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'offrir des points.")
  }
}

/** Charge les suggestions / activités / tendances via GET /api/suggestions. */
export async function fetchSuggestions(
  userId: string,
  options: { signal?: AbortSignal; dughhuUserId?: string | number | null } = {}
): Promise<SuggestionsResponse> {
  try {
    const params = new URLSearchParams
    if (userId.trim()) params.set("userId", userId.trim())
    const dughhuUserId = String(options.dughhuUserId ?? "").trim()
    if (dughhuUserId) params.set("dughhuUserId", dughhuUserId)
    const qs = params.toString()
    const res = await apiClient.get<SuggestionsResponse>(`/suggestions${qs ? `?${qs}` : ""}`, {
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les suggestions")
  }
}

/** Charge les points cumulés du jour via GET /api/pointsToday/:userId. */
export async function fetchPointsToday(
  userId: string,
  options: { signal?: AbortSignal; dughhuUserId?: string | number | null } = {}
): Promise<PointsTodayResponse> {
  try {
    const res = await apiClient.get<PointsTodayResponse>(`/pointsToday/${userId}`, {
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les points")
  }
}
