/**
 * Service FRONTEND « Pages — Admins » (domaine Espaces).
 * Gestion des administrateurs, privilèges détaillés et vérification.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { PageMutationResponse } from "@/types/pages/pages.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** Ajoute un admin (POST /api/pages/:id/admins). */
export async function addAdmin(pageId: string, userId: string, signal?: AbortSignal): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>(`/pages/${encodeURIComponent(pageId)}/admins`, { userId }, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'ajouter cet administrateur.")
  }
}

/** Retire un admin (DELETE /api/pages/:id/admins?userId=). */
export async function removeAdmin(pageId: string, userId: string, signal?: AbortSignal): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.delete<PageMutationResponse>(`/pages/${encodeURIComponent(pageId)}/admins`, {
      params: { userId },
      signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de retirer cet administrateur.")
  }
}

/** Privilèges d'un admin (POST /api/pages/:id/admins/privileges). */
export async function updateAdminPrivileges(
  pageId: string,
  adminId: string,
  privileges: { general: boolean; info: boolean; social: boolean; avatar: boolean; design: boolean; admins: boolean; analytics: boolean; deletePage: boolean },
  signal?: AbortSignal
): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>(
      `/pages/${encodeURIComponent(pageId)}/admins/privileges`,
      { adminId, privileges: [privileges.general, privileges.info, privileges.social, privileges.avatar, privileges.design, privileges.admins, privileges.analytics, privileges.deletePage] },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de mettre à jour les privilèges.")
  }
}

/** Demande de vérification (POST /api/pages/:id/verify). */
export async function requestVerification(pageId: string, signal?: AbortSignal): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>(`/pages/${encodeURIComponent(pageId)}/verify`, {}, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'envoyer la demande de vérification.")
  }
}

/** Retrait de vérification (POST /api/pages/:id/verify/remove). */
export async function removeVerification(pageId: string, signal?: AbortSignal): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>(`/pages/${encodeURIComponent(pageId)}/verify/remove`, {}, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de retirer la vérification.")
  }
}

/** Bascule de vérification — modération (POST /api/pages/:id/toggle-verification). */
export async function toggleVerification(pageId: string, signal?: AbortSignal): Promise<PageMutationResponse> {
  try {
    const res = await apiClient.post<PageMutationResponse>(`/pages/${encodeURIComponent(pageId)}/toggle-verification`, {}, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de basculer la vérification.")
  }
}