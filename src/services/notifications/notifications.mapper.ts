/**
 * Mappeur de données pour les Notifications Dughu.
 *
 * Normalise défensivement les réponses issues de l'API Dughu :
 * - Déballage de raw.result / raw.data ;
 * - Normalisation des avatars avec resolveMediaUrl ;
 * - Résolution des URLs de redirection (ex. IDs de post numériques -> /post/:id) ;
 * - Normalisation des indicateurs de lecture et de pagination.
 */

import { resolveMediaUrl } from "@/lib/dughu"
import type {
  NotificationItem,
  NotificationsResponse,
} from "@/types/notifications/notification.types"

/**
 * Nettoie et normalise une URL de notification pour la navigation Next.js.
 */
export function normalizeNotificationUrl(rawUrl?: string | null, fullLink?: string | null, type?: string): string {
  const normType = String(type || "").toLowerCase()

  // Si c'est une notification d'attribution ou de gestion de points
  if (
    normType.includes("point") ||
    (rawUrl && rawUrl.includes("historique-points")) ||
    (fullLink && fullLink.includes("historique-points")) ||
    (rawUrl && rawUrl.includes("points-history")) ||
    (fullLink && fullLink.includes("points-history"))
  ) {
    return "/points"
  }

  if (fullLink && typeof fullLink === "string" && fullLink.trim() !== "") {
    const trimmed = fullLink.trim()

    if (trimmed.includes("historique-points") || trimmed.includes("points-history")) {
      return "/points"
    }

    // Si c'est un lien externe ou un chemin absolu
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        const parsed = new URL(trimmed)
        if (parsed.pathname.includes("/getSpecificUser/")) {
          const username = parsed.pathname.split("/getSpecificUser/")[1]?.split("?")[0]
          return username ? `/profile/${username}` : "/home"
        }
        if (parsed.pathname.includes("historique-points") || parsed.pathname.includes("points-history")) {
          return "/points"
        }
        // Si l'URL pointe vers une route interne sans être une API
        if (parsed.pathname && !parsed.pathname.startsWith("/api/")) {
          return parsed.pathname + parsed.search + parsed.hash
        }
      } catch {
        // Lien externe standard
      }
    }
    return trimmed
  }

  if (!rawUrl || typeof rawUrl !== "string") {
    return "/home"
  }

  const url = rawUrl.trim()

  if (url.includes("historique-points") || url.includes("points-history")) {
    return "/points"
  }

  // Cas 1 : URL contenant /getSpecificUser/username -> redirige vers /profile/username
  if (url.includes("/getSpecificUser/")) {
    const username = url.split("/getSpecificUser/")[1]?.split("?")[0]
    return username ? `/profile/${username}` : "/home"
  }

  // Cas 2 : URL est un identifiant numérique pur (souvent renvoyé pour reaction_post)
  if (/^\d+$/.test(url)) {
    return `/post/${url}`
  }

  // Cas 3 : URL relative commençant par un slash
  if (url.startsWith("/")) {
    return url
  }

  // Cas 4 : URL complète
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }

  return `/${url}`
}

/**
 * Détermine si une notification concerne l'IA Satrivium.
 */
export function isSatriviumNotification(
  type?: string,
  type2?: string,
  notifierName?: string,
  text?: string
): boolean {
  const t1 = String(type || "").toLowerCase()
  const t2 = String(type2 || "").toLowerCase()
  const name = String(notifierName || "").toLowerCase()
  const content = String(text || "").toLowerCase()
  return (
    t1.includes("satrivium") ||
    t2.includes("satrivium") ||
    name.includes("satrivium") ||
    content.includes("satrivium")
  )
}

/**
 * Détermine si une notification concerne une attribution ou un retrait de points.
 */
export function isPointNotification(
  type?: string,
  type2?: string,
  text?: string,
  url?: string
): boolean {
  const t1 = String(type || "").toLowerCase()
  const t2 = String(type2 || "").toLowerCase()
  const content = String(text || "").toLowerCase()
  const u = String(url || "").toLowerCase()

  return (
    t1 === "points_bonus_inc" ||
    t1 === "points_withdrawal" ||
    t1 === "points_gain" ||
    t1 === "gain" ||
    t1 === "retrait" ||
    t1 === "penalty" ||
    t1.includes("point") ||
    t2.includes("point") ||
    content.includes("point") ||
    content.includes("attribué") ||
    content.includes("attribue") ||
    content.includes("retrait") ||
    content.includes("retiré") ||
    content.includes("retire") ||
    content.includes("déduit") ||
    content.includes("deduit") ||
    content.includes("vos points") ||
    content.includes("gain de points") ||
    u.includes("historique-points") ||
    u.includes("points-history") ||
    u === "/points"
  )
}

export const isPointAttributionNotification = isPointNotification

/**
 * Filtres supportés nativement côté backend dans GET /getNotifications/{userId}?filter={filter}.
 * Pour les catégories non supportées côté backend, le frontend interroge 'all' et applique
 * le filtrage strict basé sur NOTIF_TYPE_TO_CATEGORY.
 */
export const BACKEND_SUPPORTED_FILTERS = new Set<string>([
  "all",
  "points",
  "poke",
  "capsules",
  "event",
  "akwaplay",
  "group",
])

/**
 * Table de correspondance centralisée et extensible :
 * type (+ type2 si précisé avec format "type:type2") -> identifiant de catégorie du front.
 *
 * Catégories du front :
 * - "all" : Tout
 * - "relation" : Relation
 * - "points" : Points
 * - "badges" : Badges
 * - "pokes" : Pokes
 * - "comment" : Commentaire
 * - "reaction" : Réactions
 * - "capsules" : Capsules
 * - "event" : Événement
 * - "akwaplay" : Akwaplay
 * - "finance" : Finances
 * - "group" : Groupe
 * - "space" : Espaces
 * - "channel" : Canaux
 * - "satrivium" : Satrivium IA
 */
export const NOTIF_TYPE_TO_CATEGORY: Record<string, string> = {
  // ─── 1. Correspondances confirmées par l'utilisateur ───────────
  "join_group": "group",
  "reaction_post": "reaction",
  "invite_page:notification": "space",
  "invite_page": "space",
  "points_bonus_inc": "points",
  "gain:points_gain": "points",
  "gain": "points",

  // ─── 2. Types réels observés dans la base de données Dughu ────
  "points_bonus_dec": "points",
  "opportunite:points_opportunity": "points",
  "points_opportunity": "points",
  "points_withdrawal": "points",
  "like_page": "space",
  "group_join_request": "group",
  "follow": "relation",
  "follow_request": "relation",
  "follow_accept": "relation",
  "comment": "comment",
  "comment_post": "comment",
  "reaction": "reaction",
  "pokes": "pokes",
  "poke": "pokes",
  "report_capsule": "capsules",
  "new_capsule": "capsules",
  "capsule": "capsules",
  "capsules": "capsules",
  "reaction_akwaplay": "akwaplay",
  "akwaplay": "akwaplay",
  "report_canal": "channel",
  "channel": "channel",
  "canal": "channel",
  "event": "event",
  "events": "event",

  // ─── 3. Structure extensible pour les autres catégories ────────
  // Relation
  "relation": "relation",
  "friend": "relation",
  "accept_request": "relation",
  // Badges
  "badge": "badges",
  "badge_unlocked": "badges",
  // Finances
  "finance": "finance",
  "wallet": "finance",
  // Satrivium IA
  "satrivium": "satrivium",
  "satrivium_ia": "satrivium",
}

/**
 * Résout la catégorie d'affichage d'une notification à partir de son type et type2.
 */
export function resolveNotificationCategory(
  type?: string,
  type2?: string,
  notifierName?: string,
  text?: string
): string | undefined {
  const t = String(type || "").trim().toLowerCase()
  const t2 = String(type2 || "").trim().toLowerCase()

  // 1. Clé composite "type:type2"
  if (t && t2) {
    const compositeKey = `${t}:${t2}`
    if (NOTIF_TYPE_TO_CATEGORY[compositeKey]) {
      return NOTIF_TYPE_TO_CATEGORY[compositeKey]
    }
  }

  // 2. Clé simple "type"
  if (t && NOTIF_TYPE_TO_CATEGORY[t]) {
    return NOTIF_TYPE_TO_CATEGORY[t]
  }

  // 3. Clé simple "type2"
  if (t2 && NOTIF_TYPE_TO_CATEGORY[t2]) {
    return NOTIF_TYPE_TO_CATEGORY[t2]
  }

  // 4. Détection Satrivium
  if (isSatriviumNotification(type, type2, notifierName, text)) {
    return "satrivium"
  }

  return undefined
}

/**
 * Filtre un NotificationItem selon l'ID de catégorie demandée côté front.
 *
 * Règles strictes :
 * - "all" : affiche toutes les notifications sans distinction.
 * - "satrivium" : regroupe TOUTES les notifications Satrivium (y compris attributions de points).
 * - "points" : regroupe les attributions/retraits de points.
 * - Autres catégories : correspondance stricte via NOTIF_TYPE_TO_CATEGORY (aucune déduction par texte).
 * - Les notifications de points ne fuient jamais dans les autres catégories.
 */
export function filterNotificationItemByCategory(
  item: NotificationItem,
  categoryId: string
): boolean {
  if (!categoryId || categoryId === "all") return true

  // Dans la catégorie "satrivium", afficher toutes les notifications Satrivium
  if (categoryId === "satrivium") {
    return (
      isSatriviumNotification(item.type, item.type2, item.notifier?.fullName, item.text) ||
      isPointNotification(item.type, item.type2, item.text, item.url)
    )
  }

  // Si c'est une notification de points
  const isPoint =
    resolveNotificationCategory(item.type, item.type2) === "points" ||
    isPointNotification(item.type, item.type2, item.text, item.url)

  if (categoryId === "points") {
    return isPoint
  }

  // Les notifications de points ne doivent JAMAIS apparaître dans les autres catégories !
  if (isPoint) {
    return false
  }

  const resolved = resolveNotificationCategory(
    item.type,
    item.type2,
    item.notifier?.fullName,
    item.text
  )
  if (!resolved) return false

  // Normalisation des clés équivalentes
  const norm = (c: string) => (c === "poke" ? "pokes" : c)
  return norm(resolved) === norm(categoryId)
}

/**
 * Analyse de date robuste pour les dates de notifications (format MySQL 'YYYY-MM-DD HH:mm:ss' ou ISO).
 */
export function parseNotificationDate(dateStr?: string): number {
  if (!dateStr || typeof dateStr !== "string") return 0
  const clean = dateStr.trim()
  const normalized = clean.includes("T") ? clean : clean.replace(" ", "T")
  const ts = new Date(normalized).getTime()
  if (!isNaN(ts)) return ts
  const fallback = new Date(clean).getTime()
  return isNaN(fallback) ? 0 : fallback
}

/**
 * Mappe un élément brut de notification en NotificationItem typé et sécurisé.
 */
export function mapNotificationItem(raw: any): NotificationItem {
  const notifierRaw = raw?.notifier || {}
  const rawAvatar = notifierRaw.avatar || notifierRaw.photo || ""
  const type = String(raw?.type || "custom")
  const type2 = raw?.type2 ? String(raw.type2) : ""
  const fullName = String(notifierRaw.fullName || notifierRaw.name || "Utilisateur")
  const text = String(raw?.text || "Nouvelle notification")
  const rawUrl = raw?.url || ""
  const rawFullLink = raw?.full_link || raw?.fullLink || ""

  // Cas particuliers : Satrivium IA et Attribution/Retrait de points -> titre 'Satrivium' et icône fixe /images/logoSat/souriire.png
  const isSatrivium = isSatriviumNotification(type, type2, fullName, text)
  const isPoint = isPointNotification(type, type2, text, rawUrl)
  const isSatriviumOrPoint = isSatrivium || isPoint

  const avatar = isSatriviumOrPoint
    ? "/images/logoSat/souriire.png"
    : rawAvatar
    ? resolveMediaUrl(rawAvatar)
    : "/images/avatar.png"

  const url = normalizeNotificationUrl(rawUrl, rawFullLink, type)

  return {
    id: raw?.id || String(Math.random()).slice(2),
    title: isSatriviumOrPoint ? "Satrivium" : raw?.title || fullName,
    type,
    type2,
    text,
    url,
    fullLink: rawFullLink ? String(rawFullLink) : undefined,
    seen: Number(raw?.seen) === 1 ? 1 : 0,
    createdAt: String(raw?.created_at || new Date().toISOString()),
    time: typeof raw?.time === "number" ? raw.time : 0,
    notifier: {
      userId: notifierRaw.user_id || notifierRaw.id || "",
      fullName: isSatriviumOrPoint ? "Satrivium" : fullName,
      avatar,
    },
  }
}

/**
 * Mappe la réponse globale de GET /getNotifications/{userId}.
 */
export function mapNotificationsResponse(raw: any, fallbackPage = 1): NotificationsResponse {
  const container = raw?.result && typeof raw.result === "object" ? raw.result : raw

  const rawItems = Array.isArray(container?.data)
    ? container.data
    : Array.isArray(container?.notifications)
    ? container.notifications
    : Array.isArray(container)
    ? container
    : []

  const notifications = rawItems.map(mapNotificationItem)

  const total = Number(container?.total ?? notifications.length)
  const currentPage = Number(container?.current_page ?? fallbackPage)
  const perPage = Number(container?.per_page ?? 10)
  const lastPage = Number(container?.last_page ?? Math.max(1, Math.ceil(total / (perPage || 1))))
  const hasMore = Boolean(container?.has_more ?? (currentPage < lastPage))
  const unreadCount = Number(container?.unread_count ?? notifications.filter((n: NotificationItem) => n.seen === 0).length)

  return {
    success: true,
    notifications,
    total,
    currentPage,
    perPage,
    lastPage,
    hasMore,
    unreadCount,
  }
}
