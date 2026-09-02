/**
 * Service SERVEUR du domaine Badges — utilisé UNIQUEMENT par les Route Handlers
 * /api/badge et /api/badge/[userId]. Il appelle l'API Dughu avec l'instance
 * Axios serveur (jamais de secret ni de token exposé au navigateur), normalise
 * les réponses via le mappeur et ne retourne que des modèles métier.
 */

import { dughuServerGet } from "@/lib/api/server/dughu-instance"
import { ApiError } from "@/lib/api/api-error"
import { normalizeBadgeList } from "@/services/badges/badges.mapper"
import type { BadgeCatalogueResponse, UserBadgesResponse } from "@/types/points/points.types"

/**
 * Catalogue complet des badges de la plateforme — API Dughu `GET /badge`.
 * Lecture idempotente : retry limité possible.
 */
export async function fetchBadgeCatalogue(): Promise<BadgeCatalogueResponse> {
  try {
    const raw = await dughuServerGet<unknown>("badge", undefined, { retry: true })
    return { success: true, badges: normalizeBadgeList(raw) }
  } catch (error) {
    throw new ApiError("Impossible de charger le catalogue des badges.", { cause: error })
  }
}

/**
 * Badges obtenus par un utilisateur — API Dughu `GET /badge/{userId}`.
 * `userId` est l'ID Dughu numérique. Lecture idempotente : retry limité possible.
 */
export async function fetchUserBadges(userId: string): Promise<UserBadgesResponse> {
  if (!userId) {
    throw new ApiError("Identifiant utilisateur requis.", { status: 422 })
  }
  try {
    const raw = await dughuServerGet<unknown>(
      `badge/${encodeURIComponent(userId)}`,
      undefined,
      { retry: true }
    )
    return { success: true, badges: normalizeBadgeList(raw) }
  } catch (error) {
    throw new ApiError("Impossible de charger vos badges.", { cause: error })
  }
}
