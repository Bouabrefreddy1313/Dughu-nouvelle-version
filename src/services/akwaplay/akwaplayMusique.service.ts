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

function parseDurationToSeconds(duration: any): number {
  if (typeof duration === "number") return duration
  if (typeof duration === "string") {
    const parts = duration.split(":").map(Number)
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }
    const n = Number(duration)
    if (!isNaN(n)) return n
  }
  return 0
}

// ── Normaliseur ──────────────────────────────────────────────────────────────

export function normalizeMusique(raw: any): AkwaMusique {
  const title = raw?.titre ?? raw?.title ?? raw?.name ?? "Titre inconnu"
  const artist = raw?.artiste ?? raw?.artist ?? raw?.artist_name ?? raw?.author ?? "Artiste inconnu"
  const audioUrl =
    raw?.chemin_audio_url ??
    raw?.chemin_audio ??
    raw?.audio_url ??
    raw?.file ??
    raw?.url ??
    null
  const cover = raw?.cover ?? raw?.image ?? raw?.thumbnail ?? null
  const duration = parseDurationToSeconds(raw?.duree ?? raw?.duration)

  return {
    id: raw?.id ?? raw?.music_id ?? raw?.musique_id ?? "",
    title,
    artist,
    cover,
    audioUrl,
    duration,
    isFavorite: Boolean(raw?.pivot ?? raw?.is_favorite ?? raw?.isFavorite ?? false),
  }
}

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

// ═══════════════════════════════════════════════════════════════════════════
// MUSIQUES — LECTURE & CRÉATION
// ═══════════════════════════════════════════════════════════════════════════

export interface AkwaStoreMusiquePayload {
  title: string
  artist: string
  genreId?: number | string
  audioFile: File | Blob
  coverFile?: File | Blob | null
  userId: string | number
  licence?: string
}

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
    const rawList =
      Array.isArray(res.data?.result?.data)
        ? res.data.result.data
        : Array.isArray(res.data?.result)
        ? res.data.result
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.musiques)
        ? res.data.musiques
        : Array.isArray(res.data)
        ? res.data
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
    const rawList =
      Array.isArray(res.data?.result)
        ? res.data.result
        : Array.isArray(res.data?.result?.data)
        ? res.data.result.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : []
    return rawList.map((m: any) => ({
      ...normalizeMusique(m),
      isFavorite: true,
    }))
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger vos musiques favorites.")
  }
}

/**
 * Ajoute et publie une nouvelle musique libre.
 * POST /api/akwa_musiques/store
 */
export async function storeMusique(
  payload: AkwaStoreMusiquePayload,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; musique?: AkwaMusique; message?: string }> {
  try {
    const formData = new FormData()
    formData.append("titre", payload.title.trim())
    formData.append("title", payload.title.trim())
    formData.append("artiste", payload.artist.trim())
    formData.append("artist", payload.artist.trim())
    formData.append("genre_id", String(payload.genreId || 2))
    formData.append("audio", payload.audioFile)
    formData.append("file", payload.audioFile)
    formData.append("user_id", String(payload.userId))
    if (payload.coverFile) {
      formData.append("cover", payload.coverFile)
      formData.append("image", payload.coverFile)
    }
    if (payload.licence) {
      formData.append("licence", payload.licence)
    }

    const res = await apiClient.post<any>("/akwa_musiques/store", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      },
    })

    const rawMusique = res.data?.musique ?? res.data?.result ?? res.data?.data
    return {
      success: Boolean(res.data?.success ?? true),
      musique: rawMusique ? normalizeMusique(rawMusique) : undefined,
      message: res.data?.message ?? "Musique ajoutée avec succès !",
    }
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors de l'ajout de la musique.")
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
): Promise<{ success: boolean; isFavorite: boolean; message?: string }> {
  try {
    const res = await apiClient.post<any>("/akwa_musiques/toggle_favoris", {
      musique_id: musicId,
      music_id: musicId,
      user_id: userId,
    })
    return {
      success: Boolean(res.data?.success ?? true),
      isFavorite: Boolean(res.data?.is_favorite ?? res.data?.isFavorite ?? res.data?.message?.includes("ajoutée")),
      message: res.data?.message,
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
