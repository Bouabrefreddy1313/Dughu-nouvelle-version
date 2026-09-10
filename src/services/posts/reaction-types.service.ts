import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

export interface ReactionType {
  id: number
  name: string
  wowonder_icon: string
  sunshine_icon: string | null
  status: number
}

export interface ReactionTypesResponse {
  success: boolean
  data: ReactionType[]
}

/**
 * Récupère la liste des types de réactions disponibles via GET /api/reaction-types.
 * Les icônes wowonder_icon sont utilisées dans le ReactionPicker.
 */
export async function fetchReactionTypes(signal?: AbortSignal): Promise<ReactionType[]> {
  try {
    const res = await apiClient.get<ReactionTypesResponse>("/reaction-types", { signal })
    return Array.isArray(res.data?.data) ? res.data.data.filter((r) => r.status === 1) : []
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les types de réactions")
  }
}
