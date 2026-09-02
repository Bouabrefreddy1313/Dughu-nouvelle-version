/**
 * Service SERVEUR du domaine Relations — utilisé UNIQUEMENT par les Route
 * Handlers (BFF). Il appelle l'API externe Dughu avec l'instance Axios
 * serveur, valide/normalise les réponses externes et ne retourne jamais de
 * secret ni de token au navigateur.
 *
 * NB SERVER-ONLY : ce module lit des secrets par transitivité (dughu-instance
 * → env.ts). Ne jamais l'importer depuis un composant client ou un hook.
 */

import { dughuServerMultipart } from "@/lib/api/server/dughu-instance"
import { ApiError } from "@/lib/api/api-error"
import { normalizeIncomingRelationRequests, normalizeOutgoingRequestUserIds } from "@/services/relations/relation.mapper"
import type {
  IncomingRelationRequest,
  RelationAction,
  RelationMutationPayload,
  RelationRequestsEntry,
  RelationResponse,
  RelationType,
} from "@/types/relations/relation.types"

export const RELATION_TYPES: RelationType[] = ["friend", "network"]
const RELATION_ACTIONS: RelationAction[] = ["request", "accept", "decline", "remove"]

/**
 * Cartographie action → endpoint Dughu.
 * NB : « remove » (suppression d'une relation acceptée) est traité par
 * l'endpoint relation/request, qui fonctionne comme un toggle côté Dughu
 * (conforme au cahier des charges : « relation/request … fonctionne comme
 * un toggle »).
 */
const ENDPOINTS: Record<RelationAction, string> = {
  request: "relation/request",
  accept: "relation/accept",
  decline: "relation/decline",
  remove: "relation/request",
}

function messageFrom(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object" || !("message" in data)) return fallback
  const message = (data as { message?: unknown }).message
  return typeof message === "string" && message ? message : fallback
}

function relationRequestsForm(authUserId: string, userId: string, type: RelationType): FormData {
  const formData = new FormData()
  formData.append("auth_user_id", authUserId)
  formData.append("user_id", userId)
  formData.append("type", type)
  return formData
}

interface RelationRequestsResult {
  requests: IncomingRelationRequest[]
  unavailableTypes: RelationType[]
}

/**
 * Charge les demandes dev relation du viewer connecté (les deux types) et les
 * normalise. Ne lève pas d'exception quand un type est indisponible : cette
 * information est exposée via `unavailableTypes` (la route décide du statut final).
 */
export async function getRelationRequestsForUser(
  authUserId: string
): Promise<RelationRequestsResult> {
  const results = await Promise.allSettled(
    RELATION_TYPES.map((type) =>
      dughuServerMultipart<{ success?: boolean; message?: string }>("relation/requests", relationRequestsForm(authUserId, authUserId, type), { retry: true })
    )
  )
  const unavailableTypes: RelationType[] = []
  const requests = results.flatMap((result, index) => {
    const type = RELATION_TYPES[index]
    if (result.status === "rejected" || result.value?.success === false) {
      unavailableTypes.push(type)
      return []
    }
    return normalizeIncomingRelationRequests(result.value, type)
  })

  return {
    requests: [...new Map(requests.map((request) => [`${request.type}:${request.userId}`, request])).values()],
    unavailableTypes,
  }
}

/**
 * Données de vérification des relations d'un profil donné du point de vue du
 * viewer (matrice consommée par normalizeProfileRelations dans le mapper).
 */
/**
 * IDs Dughu des destinataires des demandes SORTANTES (envoyées par le viewer,
 * tous types confondus) — sert à pré-remplir l'état « Demande envoyée » du
 * bouton Fraterniser après rechargement de la page.
 */
export async function getOutgoingRequestUserIds(authUserId: string): Promise<string[]> {
  const results = await Promise.allSettled(
    RELATION_TYPES.map((type) =>
      dughuServerMultipart<{ success?: boolean }>(
        "relation/requests",
        relationRequestsForm(authUserId, authUserId, type),
        { retry: true }
      )
    )
  )

  const ids = new Set<string>()
  results.forEach((result, index) => {
    if (result.status === "rejected" || result.value?.success === false) return
    for (const id of normalizeOutgoingRequestUserIds(result.value, RELATION_TYPES[index])) {
      ids.add(id)
    }
  })
  return [...ids]
}

export async function getRelationForProfile(
  viewerUserId: string,
  targetUserId: string | number
): Promise<RelationRequestsEntry[]> {
  const viewer = String(viewerUserId)
  const target = String(targetUserId)

  if (!viewer || viewer === "0" || target === viewer) return []

  return await Promise.all(
    RELATION_TYPES.map(async (type) => {
      try {
        const response = await dughuServerMultipart<{ success?: boolean }>("relation/requests", relationRequestsForm(viewer, target, type), { retry: true })
        return { type, ok: response?.success !== false, response: (response ?? null) as unknown } as RelationRequestsEntry
      } catch {
        return { type, ok: false, response: null } as RelationRequestsEntry
      }
    })
  )
}

/**
 * Soumet une mutation de relation à Dughu (multipart/form-data, aucun retry).
 * Retourne un résultat normalisé : messages utilisateur approuvés, jamais de
 * message backend brut ni de secret.
 */
export async function submitRelationAction(
  payload: RelationMutationPayload & { authUserId: string }
): Promise<RelationResponse> {
  if (!RELATION_TYPES.includes(payload.type) || !RELATION_ACTIONS.includes(payload.action)) {
    throw new ApiError("Paramètres invalides", { status: 400 })
  }

  const data = await dughuServerMultipart<{ success?: boolean; message?: string }>(
    ENDPOINTS[payload.action],
    relationRequestsForm(payload.authUserId, payload.targetId, payload.type)
  )

  if (data?.success === false) {
    return { success: false, message: "Erreur backend" }
  }

  return { success: true, message: messageFrom(data, "Action effectuée") }
}
