/**
 * Service SERVEUR du domaine Événements — utilisé UNIQUEMENT par les Route Handlers Next.js
 * (/api/events/*). Il appelle l'API externe Dughu avec l'instance Axios serveur protégée,
 * normalise les réponses et renvoie des modèles typés et sécurisés.
 */

import {
  dughuServerGet,
  dughuServerMultipart,
  dughuServerJson,
  dughuServerDelete,
} from "@/lib/api/server/dughu-instance"
import { ApiError } from "@/lib/api/api-error"
import {
  normalizeEventsList,
  normalizeEventDetail,
  normalizeInvitedUsers,
} from "@/services/events/events.mapper"
import type {
  EventsQueryParams,
  EventsListResponse,
  EventDetailResponse,
  EventMutationResponse,
  EventToggleResponse,
  EventInvitedListResponse,
} from "@/types/events/events.types"

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {}
}

/**
 * Récupère la liste des événements.
 * Endpoint Dughu : GET /events
 */
export async function getEventsList(
  params: EventsQueryParams = {}
): Promise<EventsListResponse> {
  try {
    const query: Record<string, string | number | undefined> = {}
    if (params.page) query.page = params.page
    if (params.category) query.category = params.category
    if (params.q) query.q = params.q

    const raw = await dughuServerGet<unknown>("/events", query, { retry: true })
    return normalizeEventsList(raw)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de charger la liste des événements.", { cause: error })
  }
}

/**
 * Récupère le détail d'un événement.
 * Endpoint Dughu : GET /show/event/{event_id}/{user_id}
 */
export async function getEventDetail(
  eventId: string,
  userId: string
): Promise<EventDetailResponse> {
  if (!eventId) {
    throw new ApiError("Identifiant d'événement manquant.", { status: 422 })
  }

  const effectiveUserId = userId || "0"

  try {
    const raw = await dughuServerGet<unknown>(
      `/show/event/${encodeURIComponent(eventId)}/${encodeURIComponent(effectiveUserId)}`,
      undefined,
      { retry: true }
    )
    return normalizeEventDetail(raw)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de charger le détail de l'événement.", { cause: error })
  }
}

/**
 * Crée un événement.
 * Endpoint Dughu : POST /events (multipart/form-data)
 */
export async function createEvent(formData: FormData): Promise<EventMutationResponse> {
  try {
    const raw = await dughuServerMultipart<unknown>("/events", formData)
    const rec = asRecord(raw)
    const success = typeof rec.success === "boolean" ? rec.success : true
    const message = typeof rec.message === "string" ? rec.message : "Événement créé avec succès !"
    const eventId = String(rec.event_id || rec.id || "")

    return {
      success,
      message,
      eventId: eventId || undefined,
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de créer l'événement.", { cause: error })
  }
}

/**
 * Supprime un événement.
 * Endpoint Dughu : DELETE /destroyEvent/{event_id}/{user_id}
 */
export async function deleteEvent(
  eventId: string,
  userId: string,
  authToken?: string
): Promise<EventMutationResponse> {
  if (!eventId || !userId) {
    throw new ApiError("Identifiants manquants.", { status: 422 })
  }

  try {
    const raw = await dughuServerDelete<unknown>(
      `/destroyEvent/${encodeURIComponent(eventId)}/${encodeURIComponent(userId)}`,
      undefined,
      authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined
    )
    const rec = asRecord(raw)
    const success = typeof rec.success === "boolean" ? rec.success : true
    const message = typeof rec.message === "string" ? rec.message : "Événement supprimé avec succès."

    return {
      success,
      message,
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de supprimer l'événement.", { cause: error })
  }
}

/**
 * Met à jour un événement existant.
 * Endpoint Dughu : POST /events (avec event_id)
 */
export async function updateEvent(
  eventId: string,
  formData: FormData
): Promise<EventMutationResponse> {
  formData.set("event_id", eventId)
  return createEvent(formData)
}

/**
 * Inscription / adhésion d'un utilisateur à un événement (toggle).
 * Endpoint Dughu : POST /event_inscription { user_id, event_id }
 */
export async function toggleEventInscription(
  eventId: string,
  userId: string
): Promise<EventToggleResponse> {
  if (!eventId || !userId) {
    throw new ApiError("Identifiants manquants.", { status: 422 })
  }

  try {
    const raw = await dughuServerJson<unknown>("/event_inscription", {
      user_id: userId,
      event_id: eventId,
    })
    const rec = asRecord(raw)
    const success = typeof rec.success === "boolean" ? rec.success : true
    const message = typeof rec.message === "string" ? rec.message : "Mise à jour effectuée."
    const isActionActive = Boolean(rec.result)

    return {
      success,
      message,
      isActionActive,
      isGoing: isActionActive,
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de mettre à jour votre participation.", { cause: error })
  }
}

/**
 * Marque l'intérêt d'un utilisateur pour un événement (toggle).
 * Endpoint Dughu : POST /event_interest { user_id, event_id }
 */
export async function toggleEventInterest(
  eventId: string,
  userId: string
): Promise<EventToggleResponse> {
  if (!eventId || !userId) {
    throw new ApiError("Identifiants manquants.", { status: 422 })
  }

  try {
    const raw = await dughuServerJson<unknown>("/event_interest", {
      user_id: userId,
      event_id: eventId,
    })
    const rec = asRecord(raw)
    const success = typeof rec.success === "boolean" ? rec.success : true
    const message = typeof rec.message === "string" ? rec.message : "Mise à jour effectuée."
    const isActionActive = Boolean(rec.result)

    return {
      success,
      message,
      isActionActive,
      isInterested: isActionActive,
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible d'enregistrer votre intérêt.", { cause: error })
  }
}

/**
 * Récupère le fil de publications lié à un événement.
 * Endpoint Dughu : GET /getPostEvents/{event_id}/{user_id}?page={page}
 */
export async function getEventPosts(
  eventId: string,
  userId: string,
  page: number = 1,
  authToken?: string
): Promise<unknown> {
  if (!eventId) {
    throw new ApiError("Identifiant d'événement manquant.", { status: 422 })
  }

  const effectiveUserId = userId || "0"

  try {
    const raw = await dughuServerGet<unknown>(
      `/getPostEvents/${encodeURIComponent(eventId)}/${encodeURIComponent(effectiveUserId)}`,
      { page },
      authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined
    )
    return raw
  } catch (error) {
    // Si l'endpoint retourne 401 ou vide, renvoyer un fil vide propre
    return { success: true, result: { data: [] }, posts: [] }
  }
}

/**
 * Envoie une invitation à un ami pour un événement.
 * Endpoint Dughu : POST /userInvitedRegisteredEvents { event_id, user_id, user_invite_id }
 */
export async function inviteUserToEvent(
  eventId: string,
  userId: string,
  userInviteId: string
): Promise<EventMutationResponse> {
  if (!eventId || !userId || !userInviteId) {
    throw new ApiError("Informations d'invitation incomplètes.", { status: 422 })
  }

  try {
    const raw = await dughuServerJson<unknown>("/userInvitedRegisteredEvents", {
      event_id: eventId,
      user_id: userId,
      user_invite_id: userInviteId,
    })
    const rec = asRecord(raw)
    const success = typeof rec.success === "boolean" ? rec.success : true
    const message = typeof rec.message === "string" ? rec.message : "Invitation envoyée avec succès !"

    return {
      success,
      message,
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible d'envoyer l'invitation.", { cause: error })
  }
}

/**
 * Récupère la liste des personnes déjà invitées à un événement.
 * Endpoint Dughu : POST /listInvitedEvents { event_id, user_id }
 */
export async function getListInvitedEvents(
  eventId: string,
  userId: string
): Promise<EventInvitedListResponse> {
  if (!eventId || !userId) {
    return { success: true, invitedUsers: [] }
  }

  try {
    const raw = await dughuServerJson<unknown>("/listInvitedEvents", {
      event_id: eventId,
      user_id: userId,
    })
    return normalizeInvitedUsers(raw)
  } catch (error) {
    return { success: true, invitedUsers: [] }
  }
}

export const listInvitedUsers = getListInvitedEvents

