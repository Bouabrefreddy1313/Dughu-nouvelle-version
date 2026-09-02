/**
 * Service FRONTEND « Pages — Offres & Boost » (domaine Espaces).
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { BoostPrice, PageMutationResponse, PageOffer } from "@/types/pages/pages.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** Offres d'une page (GET /api/pages/:id/offers). */
export async function fetchPageOffers(pageId: string, signal?: AbortSignal): Promise<{ success: boolean; offers: PageOffer[]; hasMore: boolean }> {
  try {
    const res = await apiClient.get<{ success: boolean; offers: PageOffer[]; hasMore: boolean }>(
      `/pages/${encodeURIComponent(pageId)}/offers`,
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les offres.")
  }
}

/** Crée une offre (POST /api/pages/:id/offers). */
export async function createOffer(
  pageId: string,
  payload: { description: string; discountType: string; discountPercent: number; expireDate: string; expireTime: string },
  signal?: AbortSignal
): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>(`/pages/${encodeURIComponent(pageId)}/offers`, payload, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de créer l'offre.")
  }
}

/** Détail d'une offre (GET /api/offers/:id). */
export async function fetchOfferDetail(offerId: string, signal?: AbortSignal): Promise<PageOffer | null> {
  try {
    const res = await apiClient.get<{ success: boolean; offer?: PageOffer }>(`/offers/${encodeURIComponent(offerId)}`, { signal })
    return res.data.offer ?? null
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger l'offre.")
  }
}

/** Prix d'un boost (POST /api/pages/boost-price { days }). */
export async function fetchBoostPrice(days: number, signal?: AbortSignal): Promise<BoostPrice> {
  try {
    const res = await apiClient.post<BoostPrice & { success?: boolean }>("/pages/boost-price", { days }, { signal })
    if (res.data.success === false) throw new ApiError("Impossible de calculer le prix du boost.")
    return { points: Number(res.data.points) || 0, fcfa: Number(res.data.fcfa) || 0 }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw toServiceApiError(error, "Impossible de calculer le prix du boost.")
  }
}

/** Booster une page (POST /api/pages/:id/boost { days }). */
export async function boostPage(pageId: string, days: number, signal?: AbortSignal): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>(`/pages/${encodeURIComponent(pageId)}/boost`, { days }, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de booster cet espace.")
  }
}