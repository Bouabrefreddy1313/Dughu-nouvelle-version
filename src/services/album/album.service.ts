/**
 * Service FRONTEND du domaine Album.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. Il n'appelle que les routes internes /api/album*, ne connaît pas
 * React, ne déclenche aucun toast et transforme les erreurs techniques en
 * ApiError cohérentes (messages français approuvés).
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { AlbumListResponse } from "@/types/album/album.types"

const LIST_FALLBACK = "Impossible de charger vos albums."

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** Liste des albums de l'utilisateur (GET /api/album?user_id=&page=). */
export async function fetchAlbums(
  params: { userId?: string; page?: number } = {},
  signal?: AbortSignal
): Promise<AlbumListResponse> {
  const qs = new URLSearchParams()
  if (params.userId) qs.set("user_id", params.userId)
  if (params.page && params.page > 1) qs.set("page", String(params.page))
  try {
    const res = await apiClient.get<AlbumListResponse>(`/album${qs.toString() ? `?${qs}` : ""}`, { signal })
    if (res.data?.success === false) {
      throw new ApiError(res.data?.message || LIST_FALLBACK, { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, LIST_FALLBACK)
  }
}

/** Création d'un album (POST /api/album, multipart/form-data). */
export async function createAlbum(
  input: { albumName: string; type: string; files: File[]; userId?: string },
  options: { signal?: AbortSignal; onProgress?: (percent: number) => void } = {}
): Promise<{ success: boolean; message?: string }> {
  const formData = new FormData()
  if (input.userId) formData.set("user_id", input.userId)
  formData.set("album_name", input.albumName)
  formData.set("type", input.type)
  for (const file of input.files) {
    // Contrat route interne : le serveur retransmet vers Dughu sous « albumArray[] ».
    formData.append("albumArray[]", file, file.name)
  }
  try {
    const res = await apiClient.post<{ success: boolean; message?: string }>("/album", formData, {
      signal: options.signal,
      onUploadProgress: (event) => {
        if (!options.onProgress) return
        const total = event.total ?? 0
        options.onProgress(total > 0 ? Math.round(((event.loaded ?? 0) / total) * 100) : 0)
      },
    })
    if (res.data?.success === false) {
      throw new ApiError(res.data?.message || "Erreur de création de l'album.", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur de création de l'album.")
  }
}

/** Suppression d'un album entier (DELETE /api/album/{albumId}). */
export async function deleteAlbum(albumId: string, signal?: AbortSignal): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiClient.delete<{ success: boolean; message?: string }>(
      `/album/${encodeURIComponent(albumId)}`,
      { signal }
    )
    if (res.data?.success === false) {
      throw new ApiError(res.data?.message || "Erreur de suppression de l'album.", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur de suppression de l'album.")
  }
}

/** Suppression d'une image d'un album (DELETE /api/album/image/{imageId}). */
export async function deleteAlbumImage(imageId: string, signal?: AbortSignal): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiClient.delete<{ success: boolean; message?: string }>(
      `/album/image/${encodeURIComponent(imageId)}`,
      { signal }
    )
    if (res.data?.success === false) {
      throw new ApiError(res.data?.message || "Erreur de suppression de l'image.", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur de suppression de l'image.")
  }
}
