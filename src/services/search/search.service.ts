/**
 * Service FRONTEND du domaine Recherche. Seul module frontend autorisé à
 * utiliser l'instance Axios cliente pour ce domaine. N'appelle que la route
 * interne /api/search, ne connaît pas React, ne déclenche aucun toast ni
 * redirection, et transforme les erreurs techniques en ApiError.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { SearchApiResponse } from "@/types/search/search.types"

/**
 * Recherche globale via GET /api/search.
 * Accepte un AbortSignal : l'annulation (Axios CanceledError, code
 * ERR_CANCELED) est retransmise telle quelle pour que l'appelant puisse
 * distinguer une saisie remplacée d'une vraie erreur.
 */
export async function searchAll(query: string, signal?: AbortSignal): Promise<SearchApiResponse> {
  try {
    const res = await apiClient.get<SearchApiResponse>("/search", {
      params: { q: query },
      signal,
    })
    return res.data
  } catch (error) {
    if (error instanceof ApiError && error.code === "ERR_CANCELED") throw error
    if (error instanceof ApiError) throw error
    throw new ApiError("La recherche est indisponible. Veuillez réessayer.", { cause: error })
  }
}
