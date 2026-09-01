/**
 * Service FRONTEND du domaine Profil.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. Il n'appelle que les routes internes /api, ne connaît pas React,
 * ne déclenche aucun toast, ne fait aucune redirection et transforme les
 * erreurs techniques en ApiError cohérentes (messages français approuvés).
 *
 * Avec FormData, Axios construit automatiquement le Content-Type et sa
 * boundary : ne jamais fixer ce header manuellement.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  ProfileParams,
  ProfileApiResponse,
  ProfileUpdateResponse,
  ProfileImageResponse,
  ChangePasswordResponse,
  CountriesResponse,
  VerificationResponse,
  FollowPayload,
} from "@/types/profile/profile.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/**
 * Charge un profil depuis GET /api/profile.
 * Comportement conservé : « Profil introuvable » si la route échoue, message
 * de la route sinon.
 */
export async function fetchProfile(
  params: ProfileParams,
  options: { signal?: AbortSignal; noStore?: boolean } = {}
): Promise<ProfileApiResponse> {
  const { signal, noStore } = options
  try {
    const search = new URLSearchParams()
    if (params.userId) search.set("userId", params.userId)
    if (params.slug) search.set("slug", params.slug)
    if (params.currentUserId) search.set("currentUserId", params.currentUserId)
    if (params.dughuUserId) search.set("dughuUserId", params.dughuUserId)
    if (params.viewerDughuUserId) search.set("viewerDughuUserId", params.viewerDughuUserId)
    const res = await apiClient.get<ProfileApiResponse>(`/profile?${search}`, {
      signal,
      headers: noStore ? { "Cache-Control": "no-store" } : undefined,
    })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur profil", { status: res.status })
    }
    return res.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError("Profil introuvable", { status: 404, cause: error })
    }
    throw toServiceApiError(error, "Profil introuvable")
  }
}

/** Met à jour le profil via POST /api/profile/update. */
export async function updateProfile(
  payload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<ProfileUpdateResponse> {
  try {
    const res = await apiClient.post<ProfileUpdateResponse>("/profile/update", payload, { signal })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur lors de la mise à jour.", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors de la mise à jour.")
  }
}

/** Met à jour les informations complémentaires via POST /api/profile/infos. */
export async function updateProfileInfos(
  payload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<ProfileUpdateResponse> {
  try {
    const res = await apiClient.post<ProfileUpdateResponse>("/profile/infos", payload, { signal })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Impossible de mettre à jour le profil.", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de mettre à jour le profil.")
  }
}

/**
 * Envoie une image de profil (avatar ou cover) via POST /api/profile/{type}.
 * Le FormData est transmis tel quel : Axios gère le Content-Type multipart.
 */
export async function uploadProfileImage(
  type: "avatar" | "cover",
  formData: FormData,
  signal?: AbortSignal
): Promise<ProfileImageResponse> {
  try {
    const res = await apiClient.post<ProfileImageResponse>(`/profile/${type}`, formData, { signal })
    if (res.data && res.data.success === false) {
      throw new ApiError(res.data?.message || "Erreur lors de l'enregistrement.", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur lors de l'enregistrement.")
  }
}

/** Change le mot de passe via POST /api/profile/password. */
export async function changePassword(
  payload: { actualPassword: string; password: string; password_confirmation: string },
  signal?: AbortSignal
): Promise<ChangePasswordResponse> {
  try {
    const res = await apiClient.post<ChangePasswordResponse>("/profile/password", payload, { signal })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Impossible de modifier votre mot de passe.", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de modifier votre mot de passe.")
  }
}

/** Charge la liste des pays via GET /api/countries. */
export async function fetchCountries(signal?: AbortSignal): Promise<CountriesResponse> {
  try {
    const res = await apiClient.get<CountriesResponse>("/countries", { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger la liste des pays.")
  }
}

/**
 * Soumet une demande de vérification via POST /api/submitVerification.
 * Comportement conservé : la route renvoie success:false sans lever d'erreur
 * HTTP — le corps est retourné tel quel pour que l'appelant affiche
 * le message de la route.
 */
export async function submitVerification(
  formData: FormData,
  signal?: AbortSignal
): Promise<VerificationResponse> {
  try {
    const res = await apiClient.post<VerificationResponse>("/submitVerification", formData, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur réseau lors de la soumission")
  }
}

/** Charge les demandes de vérification via GET /api/getVerificationRequests/:id. */
export async function fetchVerificationRequests(
  userId: string,
  signal?: AbortSignal
): Promise<VerificationResponse> {
  try {
    const res = await apiClient.get<VerificationResponse>(`/getVerificationRequests/${userId}`, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les demandes de vérification.")
  }
}

/** Suit / ne suit plus un utilisateur via POST /api/profile/follow. */
export async function toggleFollow(payload: FollowPayload, signal?: AbortSignal): Promise<ProfileUpdateResponse> {
  try {
    const res = await apiClient.post<ProfileUpdateResponse>("/profile/follow", payload, { signal })
    if (!res.data?.success) {
      throw new ApiError(res.data?.message || "Erreur", { status: res.status })
    }
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Erreur")
  }
}

