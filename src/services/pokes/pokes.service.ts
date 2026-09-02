/**
 * Service FRONTEND du domaine Pokes.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. Il n'appelle que les routes internes /api/pokes, ne connaît pas
 * React, ne déclenche aucun toast et transforme les erreurs techniques en
 * ApiError cohérentes (messages français approuvés).
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { PokeActionResponse, PokesResponse } from "@/types/pokes/pokes.types"

/** Charge la liste des pokes (reçus ou envoyés) via GET /api/pokes?box=… */
export async function fetchPokes(
  box: "received" | "sent",
  options: { signal?: AbortSignal } = {}
): Promise<PokesResponse> {
  try {
    const res = await apiClient.get<PokesResponse>("/pokes", {
      params: { box },
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message, { cause: error })
    throw new ApiError("Impossible de charger les pokes.")
  }
}

/** Envoie un poke vers `receivedUserId` via POST /api/pokes. */
export async function sendPoke(receivedUserId: string, signal?: AbortSignal): Promise<PokeActionResponse> {
  try {
    const res = await apiClient.post<PokeActionResponse>(
      "/pokes",
      { receivedUserId },
      { signal }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message, { cause: error })
    throw new ApiError("Impossible d'envoyer le poke.")
  }
}

/** Répond à un poke (poke-back) via POST /api/pokes/:pokeId/poke-back. */
export async function pokeBack(
  pokeId: string,
  receivedUserId: string,
  signal?: AbortSignal
): Promise<PokeActionResponse> {
  try {
    const res = await apiClient.post<PokeActionResponse>(
      `/pokes/${encodeURIComponent(pokeId)}/poke-back`,
      { receivedUserId },
      { signal }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message, { cause: error })
    throw new ApiError("Impossible de répondre à ce poke.")
  }
}
