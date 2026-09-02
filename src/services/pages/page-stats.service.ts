/**
 * Service FRONTEND « Pages — Statistiques » (domaine Espaces).
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { PageStatistics } from "@/types/pages/pages.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

export type StatsFilter = "all" | "day" | "week" | "month"

/**
 * Statistiques d'une page (GET /api/pages/:id/stats). Réservé aux admins de
 * la page (l'API Dughu répond 403 sinon — l'erreur est propagée au composant).
 */
export async function fetchPageStats(pageId: string, userId: string, filter: StatsFilter = "all", signal?: AbortSignal): Promise<PageStatistics> {
  try {
    const res = await apiClient.get<{ success: boolean; stats?: PageStatistics; message?: string }>(
      `/pages/${encodeURIComponent(pageId)}/stats`,
      { params: { user_id: userId, filter }, signal }
    )
    if (res.data.success === false || !res.data.stats) {
      throw new ApiError(res.data.message || "Accès refusé aux statistiques de cette page.", { status: 403 })
    }
    return res.data.stats
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw toServiceApiError(error, "Impossible de charger les statistiques.")
  }
}