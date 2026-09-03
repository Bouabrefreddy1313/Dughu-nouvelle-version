/**
 * Service FRONTEND du module Akwaplay — Musiques.
 *
 * Utilise EXCLUSIVEMENT l'instance Axios cliente `apiClient` configurée avec
 * les interceptors et la baseURL interne `/api`.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"

// ── Types ────────────────────────────────────────────────────────────────────

export interface AkwaMusique {
  id: string | number
  title: string
  artist?: string
  cover?: string | null
  audioUrl?: string | null
  duration?: number
  isFavorite?: boolean
}

// ── Normaliseur ──────────────────────────────────────────────────────────────

export function normalizeMusique(raw: any): AkwaMusique {
  return {
    id: raw?.id ?? raw?.music_id ?? "",
    title: raw?.title ?? raw?.name ?? "Titre inconnu",
    artist: raw?.artist ?? raw?.artist_name ?? raw?.author ?? "Artiste inconnu",
    cover: raw?.cover ?? raw?.image ?? raw?.thumbnail ?? null,
    audioUrl: raw?.audio_url ?? raw?.file ?? raw?.url ?? null,
    duration: Number(raw?.duration ?? 0),
    isFavorite: Boolean(raw?.is_favorite ?? raw?.isFavorite ?? false),
  }
}

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

// ═══════════════════════════════════════════════════════════════════════════
// MUSIQUES — LECTURE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recherche et liste les musiques.
 * GET /api/akwa_musiques?search={query}
 */
export async function fetchMusiques(
  search = "",
  signal?: AbortSignal
): Promise<AkwaMusique[]> {
  try {
    const qs = search.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : "?search"
    const res = await apiClient.get<any>(`/akwa_musiques${qs}`, { signal })
    const rawList = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.musiques)
      ? res.data.musiques
      : Array.isArray(res.data?.data)
      ? res.data.data
      : []
    return rawList.map(normalizeMusique)
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les musiques.")
  }
}

/**
 * Récupère les musiques favorites d'un utilisateur.
 * GET /api/akwa_musiques/user_favorites/{user_id}
 */
export async function fetchUserFavoriteMusiques(
  userId: string | number,
  signal?: AbortSignal
): Promise<AkwaMusique[]> {
  try {
    const res = await apiClient.get<any>(
      `/akwa_musiques/user_favorites/${encodeURIComponent(String(userId))}`,
      { signal }
    )
    const rawList = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.musiques)
      ? res.data.musiques
      : Array.isArray(res.data?.data)
      ? res.data.data
      : []
    return rawList.map(normalizeMusique)
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger vos musiques favorites.")
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MUSIQUES — ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ajoute ou retire une musique des favoris.
 * POST /api/akwa_musiques/toggle_favoris
 */
export async function toggleMusiqueFavorite(
  musicId: string | number,
  userId: string | number
): Promise<{ success: boolean; isFavorite: boolean }> {
  try {
    const res = await apiClient.post<any>("/akwa_musiques/toggle_favoris", {
      music_id: musicId,
      user_id: userId,
    })
    return {
      success: Boolean(res.data?.success ?? true),
      isFavorite: Boolean(res.data?.is_favorite ?? res.data?.isFavorite),
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de modifier vos favoris musicaux.")
  }
}

/**
 * Signale une musique.
 * POST /api/akwa_musiques/report_musique
 */
export async function reportMusique(payload: {
  musicId: string | number
  reasonId?: string | number
  details?: string
  userId: string | number
}): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiClient.post<any>("/akwa_musiques/report_musique", {
      music_id: payload.musicId,
      reason_id: payload.reasonId,
      details: payload.details,
      user_id: payload.userId,
    })
    return {
      success: Boolean(res.data?.success ?? true),
      message: res.data?.message ?? "Musique signalée avec succès.",
    }
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors du signalement de la musique.")
  }
}

/**
 * Supprime une musique.
 * DELETE /api/akwa_musiques/delete/{music_id}
 */
export async function deleteMusique(
  musicId: string | number,
  userId: string | number
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiClient.delete<any>(
      `/akwa_musiques/delete/${encodeURIComponent(String(musicId))}`,
      { data: { user_id: userId } }
    )
    return {
      success: Boolean(res.data?.success ?? true),
      message: res.data?.message ?? "Musique supprimée avec succès.",
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer cette musique.")
  }
}
