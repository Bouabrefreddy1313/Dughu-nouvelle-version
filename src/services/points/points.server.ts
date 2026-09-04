/**
 * Service SERVEUR du domaine Points — utilisé UNIQUEMENT par le Route Handler
 * /api/pointsHistory. Il appelle l'API Dughu `GET /pointsHistory` avec
 * l'instance Axios serveur (jamais de secret ni de token exposé au navigateur),
 * normalise les réponses via le mappeur et ne retourne que des modèles métier.
 */

import { dughuServerGet } from "@/lib/api/server/dughu-instance"
import { ApiError } from "@/lib/api/api-error"
import { normalizePointsHistory } from "@/services/points/points.mapper"
import type { PointsHistoryResponse } from "@/types/points/points.types"

export interface PointsHistoryParams {
  userId: string
  /** Page API (1-based) — pagination Laravel, 10 entrées par page. */
  page?: number
  /** Recherche serveur (paramètre `search`, supporté par l'API). */
  search?: string
  /**
   * Sous-source de l'historique (segment de chemin terminé, ex. `/pointsHistory/{userId}/akwaplay`).
   * Permet de ne récupérer que les mouvements liés à une source particulière (ex. « akwaplay »).
   */
  source?: string
}

const ERROR_MESSAGE = "Impossible de charger l'historique des points."

/**
 * Interroge l'API Dughu `GET /pointsHistory/{userId}` et normalise la réponse.
 * Capacités serveur vérifiées sur l'API réelle : `page` (pagination Laravel,
 * 10 entrées/page fixe) et `search` (recordsFiltered). `per_page`, `limit` et
 * `period` ne sont PAS supportés → période et tri restent côté client.
 *
 * NB : le solde affiché sur la page provient de `/pointsToday/{userId}`
 * (`total`) — la même source que le mini-profil ; `pointsHistory` ne sert
 * qu'au tableau des mouvements.
 */
export async function fetchPointsHistory(
  params: PointsHistoryParams
): Promise<PointsHistoryResponse> {
  if (!params.userId) {
    throw new ApiError(ERROR_MESSAGE, { status: 422 })
  }
  const query: Record<string, string | number> = { page: params.page && params.page > 0 ? params.page : 1 }
  if (params.search && params.search.trim() !== "") query.search = params.search.trim()

  const source = params.source?.trim() ? encodeURIComponent(params.source.trim()) : ""
  const endpoint = `pointsHistory/${encodeURIComponent(params.userId)}${source ? `/${source}` : ""}`

  try {
    const raw = await dughuServerGet<unknown>(
      endpoint,
      query,
      { retry: true }
    )
    const normalized = normalizePointsHistory(raw)
    return { success: true, entries: normalized.entries, meta: normalized.meta }
  } catch (error) {
    throw new ApiError(ERROR_MESSAGE, { cause: error })
  }
}
