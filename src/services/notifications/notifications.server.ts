/**
 * Service SERVEUR du domaine Notifications.
 *
 * Exécuté uniquement côté serveur (Route Handlers /api/notifications).
 * Utilise l'instance Axios serveur `dughuServerGet` et `dughuServerJson`
 * protégée avec le jeton d'API X-AppApiToken.
 */

import { dughuServerGet, dughuServerJson } from "@/lib/api/server/dughu-instance"
import { mapNotificationsResponse } from "./notifications.mapper"
import type {
  NotificationsResponse,
  SendNotificationPayload,
  SendNotificationResponse,
} from "@/types/notifications/notification.types"

interface GetNotificationsParams {
  userId: string | number
  filter?: string
  page?: number
}

/**
 * Récupère les notifications d'un utilisateur via GET /getNotifications/{userId}.
 */
export async function getNotificationsServer({
  userId,
  filter = "all",
  page = 1,
}: GetNotificationsParams): Promise<NotificationsResponse> {
  const queryParams: Record<string, string | number> = {
    filter,
    page,
  }

  const raw = await dughuServerGet<any>(`/getNotifications/${encodeURIComponent(String(userId))}`, queryParams, {
    retry: true,
  })

  return mapNotificationsResponse(raw, page)
}

/**
 * Envoie une notification personnalisée via POST /sendCustomNotification.
 *
 * Transmet le jeton de session utilisateur dans Authorization: Bearer si disponible.
 */
export async function sendCustomNotificationServer(
  payload: SendNotificationPayload,
  authToken?: string
): Promise<SendNotificationResponse> {
  const body: Record<string, unknown> = {
    receiver_user_id: payload.receiverUserId,
    title: payload.title,
    description: payload.description,
    typeNotif: payload.typeNotif,
    url: payload.url,
  }

  const headers: Record<string, string> = {}
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`
  }

  const raw = await dughuServerJson<any>("/sendCustomNotification", body, {
    headers,
  })

  return {
    success: raw?.success !== false,
    message: raw?.message || "Notification envoyée",
  }
}
