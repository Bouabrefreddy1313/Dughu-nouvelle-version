/**
 * Service FRONTEND du domaine Retrouvailles.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. Il n'appelle que la route interne /api/retrouvailles, ne connaît
 * pas React, ne déclenche aucun toast et transforme les erreurs techniques en
 * ApiError cohérentes (messages français approuvés).
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { RetrouvaillesResponse, RetrouvaillesTab } from "@/types/retrouvailles/retrouvailles.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

function buildQuery(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, value)
  }
  return qs.toString()
}

type RetrouvaillesQuery =
  | { tab: "suggestions"; userId?: string }
  | { tab: "contacts"; userId?: string; phoneNumbers: string[] }
  | { tab: "anciens"; userId?: string; ville?: string; school?: string; promotionStart?: string; promotionEnd?: string }

/**
 * Charge les données d'un onglet Retrouvailles depuis la route interne.
 * Contacts : POST body JSON (les numéros ne passent JAMAIS dans l'URL — les
 * longues query strings sont rejetées en 431 par le reverse proxy).
 */
export async function fetchRetrouvailles(
  query: RetrouvaillesQuery,
  signal?: AbortSignal
): Promise<RetrouvaillesResponse> {
  // Onglet Contacts → POST body (les numéros peuvent être nombreux après un
  // import VCF ; une query string géante est rejetée en 431 par nginx).
  // Un grand import génère plusieurs lots côté serveur → le timeout par défaut
  // de 15 s de l'instance serait dépassé : on porte le délai à 120 s.
  if (query.tab === "contacts") {
    try {
      const res = await apiClient.post<RetrouvaillesResponse & { success: boolean; message?: string }>(
        "/retrouvailles",
        { tab: "contacts", userId: query.userId, phoneNumbers: query.phoneNumbers },
        { signal, timeout: 120_000 }
      )
      if (!res.data?.success) {
        throw new ApiError(res.data?.message || "Impossible de charger les retrouvailles.", { status: res.status })
      }
      return res.data
    } catch (error) {
      throw toServiceApiError(error, "Impossible de charger les retrouvailles.")
    }
  }

  const params: Record<string, string | undefined> = {
    tab: query.tab,
    user_id: query.userId,
  }
  if (query.tab === "anciens") {
    params.ville = query.ville
    params.school = query.school
    params.promotion_start = query.promotionStart
    params.promotion_end = query.promotionEnd
  }
  const qs = buildQuery(params)
  try {
    const res = await apiClient.get<RetrouvaillesResponse & { success: boolean; message?: string }>(
      `/retrouvailles${qs ? `?${qs}` : ""}`,
      { signal }
    )
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Impossible de charger les retrouvailles.", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les retrouvailles.")
  }
}

/** Utilisé par les composants pour typer les appels par onglet. */
export function isRetrouvaillesTab(value: string | null): value is RetrouvaillesTab {
  return value === "suggestions" || value === "contacts" || value === "anciens"
}