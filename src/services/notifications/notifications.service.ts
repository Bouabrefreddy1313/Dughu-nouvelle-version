/**
 * Service FRONTEND du domaine Notifications.
 *
 * Utilise l'instance Axios cliente `apiClient` pour communiquer avec les
 * Route Handlers internes /api/notifications. Ne connaît aucun secret,
 * gère la normalisation des erreurs et fournit des fonctions prêtes à l'emploi
 * pour l'ensemble des cas d'envoi de notification du projet.
 */

import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type {
  NotificationsResponse,
  SendNotificationPayload,
  SendNotificationResponse,
} from "@/types/notifications/notification.types"

function toServiceApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(error.message || fallback, { cause: error })
  return new ApiError(fallback)
}

/**
 * Récupère les notifications depuis GET /api/notifications.
 */
export async function fetchNotifications(
  params: { filter?: string; page?: number; userId?: string } = {},
  options: { signal?: AbortSignal } = {}
): Promise<NotificationsResponse> {
  const { filter = "all", page = 1, userId = "" } = params
  try {
    const res = await apiClient.get<NotificationsResponse>(
      `/notifications?filter=${encodeURIComponent(filter)}&page=${page}&userId=${encodeURIComponent(userId)}`,
      { signal: options.signal }
    )
    return res.data
  } catch (error) {
    throw toServiceApiError(error, "Impossible de charger les notifications.")
  }
}

/**
 * Envoie une notification personnalisée via POST /api/notifications/send.
 */
export async function sendNotification(
  payload: SendNotificationPayload
): Promise<SendNotificationResponse> {
  try {
    const res = await apiClient.post<SendNotificationResponse>(
      "/notifications/send",
      payload
    )
    return res.data
  } catch (error) {
    console.warn("Échec silencieux de l'envoi de notification:", error)
    return { success: false }
  }
}

/**
 * Marque une notification comme lue via POST /api/notifications/read.
 */
export async function markNotificationAsRead(
  notificationId: number | string
): Promise<{ success: boolean }> {
  try {
    const res = await apiClient.post<{ success: boolean }>(
      "/notifications/read",
      { notificationId }
    )
    return res.data
  } catch {
    return { success: true }
  }
}

/**
 * Marque toutes les notifications comme lues.
 */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  try {
    const res = await apiClient.post<{ success: boolean }>(
      "/notifications/read",
      { all: true }
    )
    return res.data
  } catch {
    return { success: true }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CATALOGUE DES NOTIFICATIONS APPLICATIVES (DÉCLENCHEURS RÉUTILISABLES)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Notification lors d'une réaction (J'aime, J'adore, etc.) sur une publication.
 */
export async function notifyPostReaction({
  authorUserId,
  senderName,
  postId,
}: {
  authorUserId: number | string
  senderName: string
  postId: number | string
}) {
  return sendNotification({
    receiverUserId: authorUserId,
    title: "Nouvelle réaction",
    description: `${senderName || "Un utilisateur"} a réagi à votre publication.`,
    typeNotif: "reaction_post",
    url: `/post/${postId}`,
  })
}

/**
 * Notification lors de l'ajout d'un commentaire sur une publication.
 */
export async function notifyPostComment({
  authorUserId,
  senderName,
  postId,
}: {
  authorUserId: number | string
  senderName: string
  postId: number | string
}) {
  return sendNotification({
    receiverUserId: authorUserId,
    title: "Nouveau commentaire",
    description: `${senderName || "Un utilisateur"} a commenté votre publication.`,
    typeNotif: "comment_post",
    url: `/post/${postId}`,
  })
}

/**
 * Notification lors de l'envoi d'un poke.
 */
export async function notifyPoke({
  targetUserId,
  senderName,
}: {
  targetUserId: number | string
  senderName: string
}) {
  return sendNotification({
    receiverUserId: targetUserId,
    title: "Nouveau Poke !",
    description: `${senderName || "Un utilisateur"} vous a envoyé un poke ! Faites-lui signe en retour.`,
    typeNotif: "pokes",
    url: "/pokes",
  })
}

/**
 * Notification lors d'une demande de fraternisation ou réseau.
 */
export async function notifyRelationRequest({
  targetUserId,
  senderName,
  relationType,
}: {
  targetUserId: number | string
  senderName: string
  relationType: "friend" | "network"
}) {
  const isNetwork = relationType === "network"
  return sendNotification({
    receiverUserId: targetUserId,
    title: isNetwork ? "Demande de réseau" : "Demande de fraternisation",
    description: isNetwork
      ? `${senderName || "Un utilisateur"} souhaite rejoindre votre réseau professionnel.`
      : `${senderName || "Un utilisateur"} souhaite fraterniser avec vous.`,
    typeNotif: "follow_request",
    url: `/profile/relations?type=${relationType}`,
  })
}

/**
 * Notification lors de l'adhésion à un groupe.
 */
export async function notifyGroupJoin({
  ownerUserId,
  senderName,
  groupName,
  groupId,
}: {
  ownerUserId: number | string
  senderName: string
  groupName: string
  groupId: number | string
}) {
  return sendNotification({
    receiverUserId: ownerUserId,
    title: "Nouveau membre de groupe",
    description: `${senderName || "Un utilisateur"} a rejoint votre groupe ${groupName}.`,
    typeNotif: "join_group",
    url: `/groups/${groupId}`,
  })
}

/**
 * Notification lors d'un J'aime sur un espace / une page.
 */
export async function notifyPageLike({
  ownerUserId,
  senderName,
  pageName,
  pageId,
}: {
  ownerUserId: number | string
  senderName: string
  pageName: string
  pageId: number | string
}) {
  return sendNotification({
    receiverUserId: ownerUserId,
    title: "Nouvelle mention J'aime",
    description: `${senderName || "Un utilisateur"} a aimé votre espace ${pageName}.`,
    typeNotif: "like_page",
    url: `/espaces/${pageId}`,
  })
}
