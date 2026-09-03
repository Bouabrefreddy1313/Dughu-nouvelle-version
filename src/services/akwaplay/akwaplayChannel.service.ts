/**
 * Service FRONTEND pour la gestion des Chaînes Akwaplay.
 *
 * Utilise EXCLUSIVEMENT l'instance Axios cliente `apiClient` (`/api`).
 * Transforme les réponses brutes via les mappers défensifs
 * et lève des `ApiError` cohérentes en cas d'échec.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  AkwaChannel,
  AkwaStoreChannelPayload,
  AkwaShowChannelPayload,
  AkwaToggleFollowChannelPayload,
  AkwaFollowToggleResponse,
} from "@/types/akwaplay/akwaplayChannel.types"
import {
  normalizeAkwaChannel,
  formatChannelIdentifiant,
} from "@/services/akwaplay/akwaplay.helpers"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/**
 * 1. Liste les chaînes créées par un utilisateur ("Mes chaines").
 * GET /api/akwa_userChannels/{user_id}
 */
export async function getUserChannels(
  userId: string | number,
  signal?: AbortSignal
): Promise<AkwaChannel[]> {
  try {
    const res = await apiClient.get<any>(
      `/akwa_userChannels/${encodeURIComponent(String(userId))}`,
      { signal }
    )

    const rawList = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.result?.data)
      ? res.data.result.data
      : Array.isArray(res.data?.result)
      ? res.data.result
      : Array.isArray(res.data?.channels)
      ? res.data.channels
      : Array.isArray(res.data?.data)
      ? res.data.data
      : []

    return rawList.map(normalizeAkwaChannel)
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger la liste de vos chaînes.")
  }
}

/**
 * 2. Crée ou modifie une chaîne (modale "+ Créer une chaine" ou icône crayon).
 * POST /api/akwa_channel_store
 */
export async function storeChannel(
  payload: AkwaStoreChannelPayload,
  signal?: AbortSignal
): Promise<{ success: boolean; channel?: AkwaChannel; message?: string }> {
  try {
    const formData = new FormData()

    if (payload.channelId) {
      formData.append("channel_id", String(payload.channelId))
    }

    formData.append("name", payload.name.trim())
    const slug = formatChannelIdentifiant(payload.identifiant || payload.name)
    formData.append("identifiant", slug)
    formData.append("slug", slug)
    formData.append("user_id", String(payload.userId))

    if (payload.avatarFile) {
      formData.append("avatar", payload.avatarFile)
      formData.append("image", payload.avatarFile) // Compatibilité multi-backend
    }

    const res = await apiClient.post<any>("/akwa_channel_store", formData, {
      signal,
      headers: { "Content-Type": "multipart/form-data" },
    })

    const rawChannel = res.data?.channel ?? res.data?.data
    return {
      success: Boolean(res.data?.success ?? true),
      message: res.data?.message ?? "Chaîne enregistrée avec succès.",
      channel: rawChannel ? normalizeAkwaChannel(rawChannel) : undefined,
    }
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors de l'enregistrement de la chaîne.")
  }
}

/**
 * 3. Récupère les détails complets d'une chaîne (infos, statut d'abonnement, vidéos).
 * POST /api/akwa_channel_show
 */
export async function getChannelDetail(
  payload: AkwaShowChannelPayload,
  signal?: AbortSignal
): Promise<{ channel: AkwaChannel; isFollowing: boolean }> {
  try {
    const res = await apiClient.post<any>(
      "/akwa_channel_show",
      {
        channel_id: payload.channelId,
        slug: payload.slug,
        user_id: payload.userId,
      },
      { signal }
    )

    const rawData = res.data?.channel ?? res.data?.data ?? res.data
    const channel = normalizeAkwaChannel(rawData)
    const isFollowing = Boolean(
      res.data?.is_following ?? res.data?.isFollowing ?? channel.isFollowing
    )

    return { channel, isFollowing }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les détails de cette chaîne.")
  }
}

/**
 * 4. S'abonne ou se désabonne d'une chaîne ("Suivre" / "Se désabonner").
 * POST /api/akwa_channel_toggleFollow
 */
export async function toggleFollowChannel(
  payload: AkwaToggleFollowChannelPayload
): Promise<AkwaFollowToggleResponse> {
  try {
    const res = await apiClient.post<any>("/akwa_channel_toggleFollow", {
      channel_id: payload.channelId,
      user_id: payload.userId,
    })

    return {
      success: Boolean(res.data?.success ?? true),
      isFollowing: Boolean(res.data?.is_following ?? res.data?.following ?? res.data?.isFollowing),
      subscribersCount: res.data?.subscribers_count ?? res.data?.followers_count,
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de modifier votre abonnement à la chaîne.")
  }
}

/**
 * 5. Supprime définitivement une chaîne.
 * DELETE /api/akwa_channel_destroy/{channel_id}
 */
export async function destroyChannel(
  channelId: string | number,
  userId: string | number
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiClient.delete<any>(
      `/akwa_channel_destroy/${encodeURIComponent(String(channelId))}`,
      {
        data: { user_id: userId },
      }
    )

    return {
      success: Boolean(res.data?.success ?? true),
      message: res.data?.message ?? "Chaîne supprimée avec succès.",
    }
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer la chaîne.")
  }
}
