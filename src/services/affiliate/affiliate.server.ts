/**
 * Service SERVEUR du domaine Affiliation — utilisé UNIQUEMENT par les Route Handlers
 * /api/affiliate et /api/affiliate/users. Il appelle l'API Dughu avec l'instance Axios serveur
 * (secrets et tokens protégés côté serveur), normalise les réponses et renvoie des modèles métier.
 */

import { dughuServerGet } from "@/lib/api/server/dughu-instance"
import { ApiError } from "@/lib/api/api-error"
import {
  normalizeAffiliateDetails,
  normalizeAffiliateUsers,
} from "@/services/affiliate/affiliate.mapper"
import type {
  AffiliateDetails,
  AffiliatePagination,
  AffiliateUser,
} from "@/types/affiliate/affiliate.types"

/**
 * Récupère les détails du lien d'affiliation depuis GET /getSpecificUser/{userId}/{userId}
 */
export async function getAffiliateDetails(userId: string): Promise<AffiliateDetails> {
  if (!userId) {
    throw new ApiError("Identifiant utilisateur manquant.", { status: 422 })
  }

  try {
    const raw = await dughuServerGet<unknown>(
      `/getSpecificUser/${encodeURIComponent(userId)}/${encodeURIComponent(userId)}`,
      undefined,
      { retry: true }
    )
    return normalizeAffiliateDetails(raw, userId)
  } catch (error) {
    throw new ApiError("Impossible de récupérer votre lien d'affiliation.", {
      cause: error,
    })
  }
}

/**
 * Récupère la liste des utilisateurs inscrits via le lien depuis GET /getAffiliateUsers/{userId}?page={page}
 */
export async function getAffiliateUsers(params: {
  userId: string
  page?: number
}): Promise<{
  users: AffiliateUser[]
  pagination: AffiliatePagination
}> {
  if (!params.userId) {
    throw new ApiError("Identifiant utilisateur manquant.", { status: 422 })
  }

  const page = params.page && params.page > 0 ? params.page : 1

  try {
    const raw = await dughuServerGet<unknown>(
      `/getAffiliateUsers/${encodeURIComponent(params.userId)}`,
      { page },
      { retry: true }
    )
    return normalizeAffiliateUsers(raw)
  } catch (error) {
    throw new ApiError("Impossible de récupérer la liste des utilisateurs parrainés.", {
      cause: error,
    })
  }
}
