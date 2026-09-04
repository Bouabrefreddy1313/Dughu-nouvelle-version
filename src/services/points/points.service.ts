/**
 * Service FRONTEND du domaine Points.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. Il n'appelle que la route interne /api/pointsHistory, ne connaît pas
 * React, ne déclenche aucun toast et transforme les erreurs techniques en
 * ApiError cohérentes (messages français approuvés).
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { PointsHistoryEntry, PointsHistoryResponse } from "@/types/points/points.types"

const FALLBACK_MESSAGE = "Impossible de charger l'historique des points."

/**
 * Charge l'historique des points depuis la route interne /api/pointsHistory.
 *
 * L'API Dughu renvoie 10 entrées/page fixe : pour alimenter un affichage de
 * `pageSize` entrées (5/10/25/50), on agrège `pages` pages API consécutives en
 * parallèle (lectures idempotentes) et on dédoublonne par `id`. La recherche
 * est relayée au serveur (paramètre `search`).
 */
export async function fetchPointsHistory(
  params: {
    userId?: string
    /** Première page API (1-based). */
    page?: number
    /** Nombre de pages API à agréger. */
    pages?: number
    search?: string
    /** Sous-source (segment de chemin), ex. « akwaplay » → /api/pointsHistory?source=akwaplay. */
    source?: string
  } = {},
  signal?: AbortSignal
): Promise<PointsHistoryResponse> {
  const start = params.page && params.page > 0 ? params.page : 1
  const pageCount = Math.min(Math.max(params.pages ?? 1, 1), 10)
  const search = params.search?.trim() || undefined

  const qsFor = (page: number) => {
    const qs = new URLSearchParams()
    if (params.userId) qs.set("userId", params.userId)
    if (params.source) qs.set("source", params.source)
    qs.set("page", String(page))
    if (search) qs.set("search", search)
    return `/pointsHistory?${qs}`
  }

  try {
    const responses = await Promise.all(
      Array.from({ length: pageCount }, (_, index) =>
        apiClient
          .get<PointsHistoryResponse>(qsFor(start + index), { signal })
          .then((res) => res.data)
      )
    )

    // Fusion des pages (dédupliquées par id — garde-fou hors bornes API).
    const seen = new Set<string>()
    const entries: PointsHistoryEntry[] = []
    for (const data of responses) {
      for (const entry of data?.entries ?? []) {
        if (!seen.has(entry.id)) {
          seen.add(entry.id)
          entries.push(entry)
        }
      }
    }

    const first = responses[0]
    const meta = first?.meta ?? {
      total: entries.length,
      currentPage: start,
      lastPage: start + pageCount - 1,
      perPage: 10,
    }
    return { success: true, entries, meta }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_MESSAGE, { cause: error })
    throw new ApiError(FALLBACK_MESSAGE)
  }
}
