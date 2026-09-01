/**
 * Service FRONTEND du domaine Relations.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente.
 * Il n'appelle que les routes internes /api, ne connaît pas React, ne
 * déclenche aucun toast, ne fait aucune redirection et transforme les erreurs
 * techniques en ApiError cohérentes (messages français approuvés).
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  RelationMutationPayload,
  RelationResponse,
  RelationRequestsResponse,
} from "@/types/relations/relation.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/**
 * Envoie une action de relation (request/accept/decline/remove) vers la route
 * interne /api/profile/relation. Accepte optionnellement un AbortSignal.
 */
export async function sendRelationAction(
  payload: RelationMutationPayload,
  signal?: AbortSignal
): Promise<RelationResponse> {
  try {
    const res = await apiClient.post<RelationResponse>("/profile/relation", payload, { signal })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur lors de la mise à jour.", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors de la mise à jour.")
  }
}

/** Charge les demandes de relations reçues depuis /api/profile/relations/requests. */
export async function fetchRelationRequests(
  signal?: AbortSignal
): Promise<RelationRequestsResponse> {
  try {
    const res = await apiClient.get<RelationRequestsResponse>("/profile/relations/requests", { signal })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Impossible de charger vos demandes de relations.", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger vos demandes de relations.")
  }
}