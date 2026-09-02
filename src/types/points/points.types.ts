/**
 * Types du domaine Points & Badges.
 *
 * Unité du contrat consommé par l'interface après normalisation côté route
 * interne /api. Ces types correspondent aux réponses des routes /api/pointsHistory,
 * /api/badge et /api/badge/[userId] — jamais à la réponse brute de l'API Dughu.
 */

/** Sens d'un mouvement de points : gain (vert) ou perte (rouge). */
export type PointsHistoryEntryType = "gain" | "perte"

/** Une ligne de l'historique des points. */
export interface PointsHistoryEntry {
  id: string
  /** Date ISO si résolue, sinon texte brut tel que renvoyé par l'API. */
  date: string | null
  type: PointsHistoryEntryType
  description: string
  /** Montant toujours positif — le sens est porté par `type`. */
  points: number
}

/** Filtre de période de l'historique (appliqué côté client). */
export type PointsPeriod = "all" | "today" | "week" | "month" | "year"

/**
 * Méta de pagination renvoyée par l'API Dughu (format Laravel paginator) :
 * `total` = recordsFiltered (tient compte de la recherche serveur),
 * `perPage` = taille de page fixée par l'API (10).
 */
export interface PointsHistoryMeta {
  total: number
  currentPage: number
  lastPage: number
  perPage: number
}

/** Réponse normalisée de GET /api/pointsHistory. */
export interface PointsHistoryResponse {
  success: boolean
  entries: PointsHistoryEntry[]
  meta: PointsHistoryMeta
  message?: string
}

/** Un badge Dughu (catalogue ou obtenu). */
export interface BadgeItem {
  id: string
  name: string
  /** Identifiant de catégorie tel que renvoyé par l'API (ex. « engagement »). */
  category: string
  description: string
  /** Emoji court ou URL d'icône. */
  icon: string
  /** Date d'obtention (ISO) si le badge a été obtenu, sinon null. */
  earnedAt: string | null
}

/** Réponse normalisée de GET /api/badge (catalogue complet). */
export interface BadgeCatalogueResponse {
  success: boolean
  badges: BadgeItem[]
  message?: string
}

/** Réponse normalisée de GET /api/badge/[userId] (badges de l'utilisateur). */
export interface UserBadgesResponse {
  success: boolean
  badges: BadgeItem[]
  message?: string
}
