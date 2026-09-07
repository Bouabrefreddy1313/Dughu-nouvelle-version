/**
 * Types du domaine Notifications.
 *
 * Représente la structure des notifications Dughu issues de GET /getNotifications/{userId}
 * et les payloads d'envoi vers POST /sendCustomNotification.
 */

export interface NotificationNotifier {
  userId: number | string
  fullName: string
  avatar: string
}

export type NotificationType =
  | "pokes"
  | "reaction_post"
  | "comment_post"
  | "like_page"
  | "join_group"
  | "follow_request"
  | "points_bonus_inc"
  | string

export interface NotificationItem {
  id: number | string
  title?: string
  type: NotificationType
  type2?: string
  text: string
  url: string
  fullLink?: string
  seen: number // 0 = non lue, 1 = lue
  createdAt: string
  time?: number
  notifier: NotificationNotifier
}

export interface NotificationsResponse {
  success: boolean
  notifications: NotificationItem[]
  total: number
  currentPage: number
  perPage: number
  lastPage: number
  hasMore: boolean
  unreadCount: number
}

export type NotificationFilter =
  | "all"
  | "relation"
  | "points"
  | "badges"
  | "poke"
  | "comment"
  | "reaction"
  | "capsules"
  | "event"
  | "akwaplay"
  | "finance"
  | "group"
  | "space"
  | "channel"
  | "satrivium"
  | "unread"
  | string

export interface NotificationCategory {
  id: string
  label: string
  filterValue: string
  description?: string
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  { id: "all", label: "Tout", filterValue: "all" },
  { id: "relation", label: "Relation", filterValue: "relation", description: "Follow, abonnements et interactions relationnelles" },
  { id: "points", label: "Points", filterValue: "points", description: "Attributions et historique de points" },
  { id: "badges", label: "Badges", filterValue: "badges", description: "Badges débloqués et récompenses" },
  { id: "pokes", label: "Pokes", filterValue: "poke", description: "Pokes reçus et signes" },
  { id: "comment", label: "Commentaire", filterValue: "comment", description: "Commentaires sur vos publications" },
  { id: "reaction", label: "Réactions", filterValue: "reaction", description: "J'aime et réactions reçues" },
  { id: "capsules", label: "Capsules", filterValue: "capsules", description: "Interactions sur vos capsules" },
  { id: "event", label: "Événement", filterValue: "event", description: "Invitations et rappels d'événements" },
  { id: "akwaplay", label: "Akwaplay", filterValue: "akwaplay", description: "Activités et vidéos Akwaplay" },
  { id: "finance", label: "Finances", filterValue: "finance", description: "Opérations et notifications financières" },
  { id: "group", label: "Groupe", filterValue: "group", description: "Invitations et activités de vos groupes" },
  { id: "space", label: "Espaces", filterValue: "space", description: "Interactions et actualités des espaces" },
  { id: "channel", label: "Canaux", filterValue: "channel", description: "Publications des canaux suivis" },
  { id: "satrivium", label: "Satrivium IA", filterValue: "satrivium", description: "Messages et réponses de l'IA Satrivium" },
]

export interface SendNotificationPayload {
  receiverUserId: number | string
  title: string
  description: string
  typeNotif: string
  url: string
}

export interface SendNotificationResponse {
  success: boolean
  message?: string
  [key: string]: unknown
}
