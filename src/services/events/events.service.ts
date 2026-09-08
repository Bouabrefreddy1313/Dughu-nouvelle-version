/**
 * Service CLIENT du domaine Événements.
 *
 * Seul module frontend autorisé à appeler les routes internes /api/events/*.
 * Utilise l'instance Axios cliente (apiClient), ne connaît pas React et
 * transforme les erreurs en ApiError.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  EventsQueryParams,
  EventsListResponse,
  EventDetailResponse,
  EventMutationResponse,
  EventToggleResponse,
  EventInvitedListResponse,
  CreateEventInput,
  EventInviteInput,
} from "@/types/events/events.types"

const FALLBACK_ERROR = "Une erreur est survenue lors de l'opération sur l'événement."

/**
 * Récupère la liste des événements.
 */
export async function fetchEventsList(
  params: EventsQueryParams = {},
  signal?: AbortSignal
): Promise<EventsListResponse> {
  try {
    const qs = new URLSearchParams()
    if (params.category) qs.set("category", params.category)
    if (params.q) qs.set("q", params.q)
    if (params.page) qs.set("page", String(params.page))

    const res = await apiClient.get<EventsListResponse>(
      `/events${qs.toString() ? `?${qs.toString()}` : ""}`,
      { signal }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Récupère le détail d'un événement.
 */
export async function fetchEventDetail(
  id: string,
  userId?: string,
  signal?: AbortSignal
): Promise<EventDetailResponse> {
  try {
    const qs = new URLSearchParams()
    if (userId) qs.set("user_id", userId)

    const res = await apiClient.get<EventDetailResponse>(
      `/events/${encodeURIComponent(id)}${qs.toString() ? `?${qs.toString()}` : ""}`,
      { signal }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Crée un nouvel événement (multipart/form-data).
 */
export async function submitCreateEvent(
  input: CreateEventInput
): Promise<EventMutationResponse> {
  try {
    const formData = new FormData()
    formData.set("event-name", input.name.trim())
    formData.set("event-locat", input.location.trim())
    formData.set("event-description", input.description.trim())
    formData.set("event-start-date", input.startDate.trim())
    formData.set("event-start-time", input.startTime.trim())
    formData.set("event-end-date", input.endDate.trim())
    formData.set("event-end-time", input.endTime.trim())
    if (input.userId) formData.set("user_id", input.userId)
    if (input.cover) formData.set("cover", input.cover)

    const res = await apiClient.post<EventMutationResponse>("/events", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Met à jour un événement existant (multipart/form-data).
 */
export async function submitUpdateEvent(
  id: string,
  input: Partial<CreateEventInput>
): Promise<EventMutationResponse> {
  try {
    const formData = new FormData()
    if (input.name) formData.set("event-name", input.name.trim())
    if (input.location) formData.set("event-locat", input.location.trim())
    if (input.description) formData.set("event-description", input.description.trim())
    if (input.startDate) formData.set("event-start-date", input.startDate.trim())
    if (input.startTime) formData.set("event-start-time", input.startTime.trim())
    if (input.endDate) formData.set("event-end-date", input.endDate.trim())
    if (input.endTime) formData.set("event-end-time", input.endTime.trim())
    if (input.userId) formData.set("user_id", input.userId)
    if (input.cover) formData.set("cover", input.cover)

    const res = await apiClient.post<EventMutationResponse>(
      `/events/${encodeURIComponent(id)}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Supprime un événement.
 */
export async function deleteEvent(id: string, userId?: string): Promise<EventMutationResponse> {
  try {
    const qs = new URLSearchParams()
    if (userId) qs.set("user_id", userId)

    const res = await apiClient.delete<EventMutationResponse>(
      `/events/${encodeURIComponent(id)}${qs.toString() ? `?${qs.toString()}` : ""}`
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Inscription / adhésion à un événement (toggle).
 */
export async function toggleEventInscription(
  id: string,
  userId: string
): Promise<EventToggleResponse> {
  try {
    const res = await apiClient.post<EventToggleResponse>(
      `/events/${encodeURIComponent(id)}/inscription`,
      { user_id: userId }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Intérêt pour un événement (toggle).
 */
export async function toggleEventInterest(
  id: string,
  userId: string
): Promise<EventToggleResponse> {
  try {
    const res = await apiClient.post<EventToggleResponse>(
      `/events/${encodeURIComponent(id)}/interest`,
      { user_id: userId }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Récupère les publications associées à un événement.
 */
export async function fetchEventPosts(
  id: string,
  userId?: string,
  signal?: AbortSignal
): Promise<{ success: boolean; posts: any[] }> {
  try {
    const qs = new URLSearchParams()
    if (userId) qs.set("user_id", userId)

    const res = await apiClient.get<{ success: boolean; posts: any[] }>(
      `/events/${encodeURIComponent(id)}/posts${qs.toString() ? `?${qs.toString()}` : ""}`,
      { signal }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Invite un ami à un événement.
 */
export async function inviteUserToEvent(
  input: EventInviteInput
): Promise<EventMutationResponse> {
  try {
    const res = await apiClient.post<EventMutationResponse>(
      `/events/${encodeURIComponent(input.eventId)}/invite`,
      {
        user_id: input.userId,
        user_invite_id: input.userInviteId,
      }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}

/**
 * Récupère la liste des utilisateurs déjà invités à un événement.
 */
export async function fetchInvitedUsers(
  eventId: string,
  userId?: string,
  signal?: AbortSignal
): Promise<EventInvitedListResponse> {
  try {
    const qs = new URLSearchParams()
    if (userId) qs.set("user_id", userId)

    const res = await apiClient.get<EventInvitedListResponse>(
      `/events/${encodeURIComponent(eventId)}/invited${qs.toString() ? `?${qs.toString()}` : ""}`,
      { signal }
    )
    return res.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error) throw new ApiError(error.message || FALLBACK_ERROR, { cause: error })
    throw new ApiError(FALLBACK_ERROR)
  }
}
