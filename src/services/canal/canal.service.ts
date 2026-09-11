/**
 * Service FRONTEND « Canal » (domaine Canal/Messagerie Dughu).
 *
 * Seul module frontend autorisé à utiliser l'instance Axios cliente pour ce
 * domaine. Il n'appelle que les routes internes /api/canal, ne connaît pas
 * React, ne déclenche aucun toast et transforme les erreurs techniques en
 * ApiError cohérentes (messages français approuvés).
 *
 * Flux : Composant → Hook → ce service → apiClient → Route Handler /api/canal
 *        → canal.server.ts → dughuServer → API Dughu
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { toServiceApiError } from "./canal.helpers"
import type {
  Canal,
  CanalCategory,
  CanalDocument,
  CanalFormValues,
  CanalMedia,
  CanalMember,
  CanalMessagesResponse,
  CanalMessagePayload,
  CanalMutationResponse,
  CanalNotificationsResponse,
  CanalPollPayload,
  CanalReportPayload,
  CanalVotePayload,
  CanalsListResponse,
} from "@/types/canal/canal.types"
import { buildCanalFormData, buildMessageFormData } from "./canal.helpers"

/* ─────────────────────────────── Découverte / Listes ───────────────────── */

/** GET /api/canal?scope=all — liste globale des canaux (découverte). */
export async function fetchAllCanals(
  userId: string,
  options: { research?: string; categoryId?: string; page?: number; signal?: AbortSignal } = {}
): Promise<CanalsListResponse> {
  try {
    const res = await apiClient.get<CanalsListResponse>("/canal", {
      params: {
        scope: "all",
        userId: userId || undefined,
        research: options.research || undefined,
        categoryId: options.categoryId || undefined,
        page: (options.page ?? 1) > 1 ? options.page : undefined,
      },
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les canaux.")
  }
}

/** GET /api/canal/categories — catégories disponibles. */
export async function fetchPossibleCategories(signal?: AbortSignal): Promise<CanalCategory[]> {
  try {
    const res = await apiClient.get<{ success: boolean; categories?: CanalCategory[] }>(
      "/canal/categories",
      { signal }
    )
    return res.data.categories ?? []
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les catégories.")
  }
}

/** GET /api/canal?scope=byCategory&categoryId=X — canaux d'une catégorie. */
export async function fetchCanalsByCategory(
  categoryId: string,
  userId: string,
  page = 1,
  signal?: AbortSignal
): Promise<CanalsListResponse> {
  try {
    const res = await apiClient.get<CanalsListResponse>("/canal", {
      params: { scope: "byCategory", categoryId, userId, page: page > 1 ? page : undefined },
      signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les canaux de cette catégorie.")
  }
}

/** GET /api/canal?scope=mine — canaux créés/possédés par l'utilisateur. */
export async function fetchMyCanals(
  userId: string,
  options: { page?: number; categoryId?: string; q?: string; sortBy?: string; signal?: AbortSignal } = {}
): Promise<CanalsListResponse> {
  try {
    const res = await apiClient.get<CanalsListResponse>("/canal", {
      params: {
        scope: "mine",
        userId,
        page: (options.page ?? 1) > 1 ? options.page : undefined,
        categoryId: options.categoryId,
        q: options.q,
        sortBy: options.sortBy,
      },
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger mes canaux.")
  }
}

/** GET /api/canal?scope=suggestions — suggestions de canaux. */
export async function fetchSuggestCanals(
  userId: string,
  options: { page?: number; categoryId?: string; signal?: AbortSignal } = {}
): Promise<CanalsListResponse> {
  try {
    const res = await apiClient.get<CanalsListResponse>("/canal", {
      params: {
        scope: "suggestions",
        userId,
        page: (options.page ?? 1) > 1 ? options.page : undefined,
        categoryId: options.categoryId,
      },
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les suggestions.")
  }
}

/** GET /api/canal?scope=joined — canaux rejoints. */
export async function fetchJoinedCanals(
  userId: string,
  options: { page?: number; categoryId?: string; signal?: AbortSignal } = {}
): Promise<CanalsListResponse> {
  try {
    const res = await apiClient.get<CanalsListResponse>("/canal", {
      params: {
        scope: "joined",
        userId,
        page: (options.page ?? 1) > 1 ? options.page : undefined,
        categoryId: options.categoryId,
      },
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les canaux rejoints.")
  }
}

/* ─────────────────────────────── Détail canal ──────────────────────────── */

/** GET /api/canal/:id — détail complet d'un canal. */
export async function fetchCanalDetail(
  canalId: string,
  signal?: AbortSignal
): Promise<{ success: boolean; canal?: Canal; message?: string }> {
  try {
    const res = await apiClient.get<{ success: boolean; canal?: Canal; message?: string }>(
      `/canal/${encodeURIComponent(canalId)}`,
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger le canal.")
  }
}

/* ─────────────────────────────── Accès (privé/public) ──────────────────── */

/** POST /api/canal/private — accéder à un canal privé via code d'invitation. */
export async function handlePrivateCanal(
  userId: string,
  inviteCode: string,
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      "/canal/private",
      { userId, inviteCode },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Code d'invitation invalide ou expiré.")
  }
}

/** GET /api/canal/public/:token — ouvrir un canal public via token/slug. */
export async function handlePublicCanal(
  token: string,
  signal?: AbortSignal
): Promise<{ success: boolean; canal?: Canal; message?: string }> {
  try {
    const res = await apiClient.get<{ success: boolean; canal?: Canal; message?: string }>(
      `/canal/public/${encodeURIComponent(token)}`,
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'accéder à ce canal.")
  }
}

/* ─────────────────────────────── Adhésion ──────────────────────────────── */

/** POST /api/canal/join — rejoindre un canal (public direct ou demande privé). */
export async function joinOrRequestCanal(
  userId: string,
  canalId: string,
  type: "direct" | "request",
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      "/canal/join",
      { userId, canalId, type },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de rejoindre ce canal.")
  }
}

/** POST /api/requestJoinCanal — demande d'adhésion explicite pour canal privé. */
export async function requestJoinCanal(
  userId: string,
  canalId: string,
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      "/requestJoinCanal",
      { user_id: userId, canal_id: canalId },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'envoyer la demande d'adhésion.")
  }
}

/** POST /api/canal/leave — quitter un canal. */
export async function leaveCanal(
  userId: string,
  canalId: string,
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      "/canal/leave",
      { userId, canalId },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de quitter ce canal.")
  }
}

/* ─────────────────────────────── CRUD canal ────────────────────────────── */

/** POST /api/canal — créer ou mettre à jour un canal (multipart). */
export async function createOrUpdateCanal(
  userId: string,
  values: CanalFormValues,
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  const formData = buildCanalFormData(userId, values)
  try {
    const res = await apiClient.post<CanalMutationResponse>("/canal", formData, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'enregistrer le canal.")
  }
}

/** DELETE /api/canal/:id — supprimer un canal (mot de passe requis). */
export async function deleteCanal(
  canalId: string,
  userId: string,
  password: string,
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      `/canal/${encodeURIComponent(canalId)}`,
      { userId, password, _method: "DELETE" },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer le canal.")
  }
}

/** POST /api/canal/status — activer/désactiver un canal. */
export async function updateCanalStatus(
  userId: string,
  canalId: string,
  isActive: boolean,
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      "/canal/status",
      { userId, canalId, isActive },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de mettre à jour le statut.")
  }
}

/* ─────────────────────────────── Membres ───────────────────────────────── */

/** GET /api/canal/members/:canalId — liste des membres. */
export async function fetchAdherents(canalId: string, signal?: AbortSignal): Promise<CanalMember[]> {
  try {
    const res = await apiClient.get<{ success: boolean; members?: CanalMember[] }>(
      `/canal/members/${encodeURIComponent(canalId)}`,
      { signal }
    )
    return res.data.members ?? []
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les membres.")
  }
}

/** POST /api/canal/members/:canalId — accepter/refuser une demande d'adhésion. */
export async function handleJoinRequest(
  requestId: string,
  userId: string,
  accept: boolean,
  canalId?: string,
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      `/canal/members/${encodeURIComponent(requestId)}`,
      { userId, accept, canalId },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de traiter la demande d'adhésion.")
  }
}

/* ─────────────────────────────── Favoris ───────────────────────────────── */

/** POST /api/canal/favorites — toggle favori. */
export async function toggleFavorite(
  userId: string,
  canalId: string,
  action: "add" | "remove",
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      "/canal/favorites",
      { userId, canalId, action },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de mettre à jour les favoris.")
  }
}

/** GET /api/canal/favorites — liste paginée des favoris. */
export async function fetchFavorites(
  userId: string,
  options: { page?: number; categoryId?: string; signal?: AbortSignal } = {}
): Promise<CanalsListResponse> {
  try {
    const res = await apiClient.get<CanalsListResponse>("/canal/favorites", {
      params: {
        userId,
        page: (options.page ?? 1) > 1 ? options.page : undefined,
        categoryId: options.categoryId,
      },
      signal: options.signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les favoris.")
  }
}

/* ─────────────────────────────── Messages ──────────────────────────────── */

/** POST /api/canal/messages — messages paginés d'un canal. */
export async function fetchCanalMessages(
  canalId: string,
  userId: string,
  page = 1,
  signal?: AbortSignal
): Promise<CanalMessagesResponse> {
  try {
    const res = await apiClient.post<CanalMessagesResponse>(
      "/canal/messages",
      { canalId, userId },
      { params: { page: page > 1 ? page : undefined }, signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les messages.")
  }
}

/** POST /api/canal/messages/:canalId — envoyer un message (multipart). */
export async function sendCanalMessage(
  canalId: string,
  payload: CanalMessagePayload,
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  const formData = buildMessageFormData(payload)
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      `/canal/messages/${encodeURIComponent(canalId)}`,
      formData,
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'envoyer le message.")
  }
}

/** POST /api/canal/messages/:messageId — modifier un message (multipart). */
export async function updateCanalMessage(
  messageId: string,
  payload: CanalMessagePayload,
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  const formData = buildMessageFormData(payload)
  formData.append("_action", "update")
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      `/canal/messages/${encodeURIComponent(messageId)}`,
      formData,
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de modifier le message.")
  }
}

/** DELETE /api/canal/messages/:messageId — supprimer un message. */
export async function deleteCanalMessage(messageId: string, signal?: AbortSignal): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.delete<CanalMutationResponse>(
      `/canal/messages/${encodeURIComponent(messageId)}`,
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer le message.")
  }
}

/** POST /api/canal/messages/:canalId/:messageId/reactions — réagir à un message. */
export async function reactCanalMessage(
  canalId: string,
  messageId: string,
  userId: string,
  reaction: string,
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      `/canal/messages/${encodeURIComponent(canalId)}/${encodeURIComponent(messageId)}/reactions`,
      { userId, reaction },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'ajouter la réaction.")
  }
}

/* ─────────────────────────────── Sondages ──────────────────────────────── */

/** POST /api/canal/polls — créer un sondage. */
export async function createPoll(
  canalId: string,
  payload: CanalPollPayload,
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>(
      "/canal/polls",
      { canalId, ...payload },
      { signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de créer le sondage.")
  }
}

/** POST /api/canal/polls/vote — voter sur un sondage. */
export async function votePoll(payload: CanalVotePayload, signal?: AbortSignal): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>("/canal/polls/vote", payload, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'enregistrer votre vote.")
  }
}

/* ─────────────────────────────── Médias & Docs ─────────────────────────── */

/** GET /api/canal/media/:canalId — médias d'un canal. */
export async function fetchCanalMedia(canalId: string, signal?: AbortSignal): Promise<CanalMedia[]> {
  try {
    const res = await apiClient.get<{ success: boolean; media?: CanalMedia[] }>(
      `/canal/media/${encodeURIComponent(canalId)}`,
      { signal }
    )
    return res.data.media ?? []
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les médias.")
  }
}

/** GET /api/canal/documents/:canalId — documents d'un canal. */
export async function fetchCanalDocuments(canalId: string, signal?: AbortSignal): Promise<CanalDocument[]> {
  try {
    const res = await apiClient.get<{ success: boolean; documents?: CanalDocument[] }>(
      `/canal/documents/${encodeURIComponent(canalId)}`,
      { signal }
    )
    return res.data.documents ?? []
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les documents.")
  }
}

/* ─────────────────────────────── Notifications ─────────────────────────── */

/** GET /api/canal/notifications/received — notifications en attente. */
export async function fetchReceivedNotifications(
  userId: string,
  canalId: string,
  page = 1,
  signal?: AbortSignal
): Promise<CanalNotificationsResponse> {
  try {
    const res = await apiClient.get<CanalNotificationsResponse>("/canal/notifications/received", {
      params: { userId, canalId, page: page > 1 ? page : undefined },
      signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les notifications.")
  }
}

/** GET /api/canal/notifications/processed — notifications traitées. */
export async function fetchProcessedNotifications(
  userId: string,
  canalId: string,
  page = 1,
  signal?: AbortSignal
): Promise<CanalNotificationsResponse> {
  try {
    const res = await apiClient.get<CanalNotificationsResponse>("/canal/notifications/processed", {
      params: { userId, canalId, page: page > 1 ? page : undefined },
      signal,
    })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les notifications traitées.")
  }
}

/** DELETE /api/canal/notifications/:id — supprimer une notification. */
export async function deleteNotification(
  notificationId: string,
  options: { userId?: string; canalId?: string } = {},
  signal?: AbortSignal
): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.delete<CanalMutationResponse>(
      `/canal/notifications/${encodeURIComponent(notificationId)}`,
      {
        params: { userId: options.userId, canalId: options.canalId },
        signal,
      }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de supprimer la notification.")
  }
}

/* ─────────────────────────────── Signalement ───────────────────────────── */

/** POST /api/canal/report — signaler un canal. */
export async function reportCanal(payload: CanalReportPayload, signal?: AbortSignal): Promise<CanalMutationResponse> {
  try {
    const res = await apiClient.post<CanalMutationResponse>("/canal/report", payload, { signal })
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible d'envoyer le signalement.")
  }
}
