/**
 * Service CLIENT du domaine Affiliation.
 *
 * Seul module frontend autorisé à appeler les routes internes /api/affiliate.
 * Utilise l'instance Axios cliente, ne connaît pas React et transforme les erreurs en ApiError.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  AffiliateInfoResponse,
  AffiliateUsersResponse,
} from "@/types/affiliate/affiliate.types"

const FALLBACK_MESSAGE = "Une erreur est survenue lors de la récupération des informations d'affiliation."

/**
 * Récupère les infos d'affiliation et le lien de parrainage de l'utilisateur.
 */
export async function fetchAffiliateInfo(
  params: { userId?: string } = {},
  signal?: AbortSignal
): Promise<AffiliateInfoResponse> {
  try {
    const qs = new URLSearchParams()
    if (params.userId) qs.set("userId", params.userId)
    const res = await apiClient.get<AffiliateInfoResponse>(`/affiliate?${qs.toString()}`, { signal })
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_MESSAGE, { cause: error })
    throw new ApiError(FALLBACK_MESSAGE)
  }
}

/**
 * Récupère les utilisateurs inscrits via le lien de parrainage (avec pagination).
 */
export async function fetchAffiliateUsers(
  params: { userId?: string; page?: number } = {},
  signal?: AbortSignal
): Promise<AffiliateUsersResponse> {
  const page = params.page && params.page > 0 ? params.page : 1
  try {
    const qs = new URLSearchParams()
    if (params.userId) qs.set("userId", params.userId)
    qs.set("page", String(page))
    const res = await apiClient.get<AffiliateUsersResponse>(`/affiliate/users?${qs.toString()}`, { signal })
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_MESSAGE, { cause: error })
    throw new ApiError(FALLBACK_MESSAGE)
  }
}
