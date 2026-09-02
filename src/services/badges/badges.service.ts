/**
 * Service FRONTEND du domaine Badges.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. Il n'appelle que les routes internes /api/badge et /api/badge/:userId,
 * ne connaît pas React, ne déclenche aucun toast et transforme les erreurs
 * techniques en ApiError cohérentes (messages français approuvés).
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { BadgeCatalogueResponse, UserBadgesResponse } from "@/types/points/points.types"

const CATALOGUE_FALLBACK = "Impossible de charger le catalogue des badges."
const USER_FALLBACK = "Impossible de charger vos badges."

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** Charge le catalogue complet des badges depuis la route interne /api/badge. */
export async function fetchBadgeCatalogue(signal?: AbortSignal): Promise<BadgeCatalogueResponse> {
  try {
    const res = await apiClient.get<BadgeCatalogueResponse>("/badge", { signal })
    if (res.data?.success === false) {
      throw new ApiError(res.data?.message || CATALOGUE_FALLBACK, { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, CATALOGUE_FALLBACK)
  }
}

/**
 * Charge les badges obtenus par un utilisateur (ID Dughu numérique) depuis la
 * route interne /api/badge/:userId.
 */
export async function fetchUserBadges(userId: string, signal?: AbortSignal): Promise<UserBadgesResponse> {
  try {
    const res = await apiClient.get<UserBadgesResponse>(`/badge/${encodeURIComponent(userId)}`, {
      signal,
    })
    if (res.data?.success === false) {
      throw new ApiError(res.data?.message || USER_FALLBACK, { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, USER_FALLBACK)
  }
}
