/**
 * Service FRONTEND du domaine Messagerie.
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. Il n'appelle que les routes internes /api/messages, ne connaît pas
 * React, ne déclenche aucun toast, ne fait aucune redirection et transforme
 * les erreurs techniques en ApiError cohérentes (messages français).
 *
 * Avec FormData, Axios construit automatiquement le Content-Type et sa
 * boundary : ne jamais fixer ce header manuellement.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  ContactsResponse,
  ContactResponse,
} from "@/types/messages/message.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/** Recherche des contacts via GET /api/messages/contacts (autocomplétion). */
export async function searchContacts(
  params: { userId: string; q: string },
  options: { signal?: AbortSignal } = {}
): Promise<ContactsResponse> {
  try {
    const res = await apiClient.get<ContactsResponse>("/messages/contacts", {
      params: { userId: params.userId, q: params.q },
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Recherche impossible")
  }
}

/** Charge la fiche d'un contact via GET /api/messages/contact. */
export async function fetchContact(
  params: { targetUserId: string; currentUserId: string },
  options: { signal?: AbortSignal } = {}
): Promise<ContactResponse> {
  try {
    const res = await apiClient.get<ContactResponse>("/messages/contact", {
      params: { targetUserId: params.targetUserId, currentUserId: params.currentUserId },
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Contact introuvable")
  }
}


