/**
 * Mapper du domaine Relations — normalisation défensive entre le contrat
 * externe Dughu (instable) et le modèle métier de l'interface.

 * Fonctions pures, sans dépendance React/Axios : testables unitairement.
 NOTE :
 * déplacé depuis src/lib/profile-relations.ts et src/lib/relation-requests.ts
 * (facades temporaires de réexport conservées tant que des importeurs restent).
 */

import {
  EMPTY_PROFILE_RELATIONS,
  type IncomingRelationRequest,
  type ProfileRelations,
  type RelationAction,
  type RelationState,
  type RelationType,
} from "@/types/relations/relation.types"

type UnknownRecord = Record<string, unknown>

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
}

function text(...values: unknown[]): string {
  const value = values.find((candidate) =>
    (typeof candidate === "string" || typeof candidate === "number") && String(candidate).trim()
  )
  return value === undefined ? "" : String(value).trim()
}

// ── Règles d'action (états → actions autorisées, et état suivant) ──────────

/** Actions autorisées pour un état dev relation donné. */
export function actionAllowed(state: RelationState, action: RelationAction): boolean {
  switch (state) {
    case "none": return action === "request"
    case "outgoing_pending": return action === "request"
    case "incoming_pending": return action === "accept" || action === "decline"
    case "accepted": return action === "remove"
    default: return false
  }
}

/** État optimiste résultant d'une action sur un état dev relation donné. */
export function nextStateFor(state: RelationState, action: RelationAction): RelationState {
  if (action === "request") return state === "outgoing_pending" ? "none" : "outgoing_pending"
  if (action === "accept") return "accepted"
  return "none"
}

// ── Normalisation des états dev relation d'un profil ──────────────────────────────

/** Résout l'enveloppe du profil Dughu (result/user/data/profile…). */
function profileSource(profile: unknown): UnknownRecord {
  const src = record(profile)
  const value = src.result ?? src.user ?? src.data ?? src.profile ?? profile ?? {}
  return record(value)
}

function isAccepted(value: unknown): boolean {
  return value === true || value === 1 || value === "1"
}

/** Résout l'enveloppe d'une réponse relation/requests (entry/response/result/data….). */
function requestsSource(entry: unknown): UnknownRecord {
  const source = record(entry)
  const response = record(source.response ?? entry)
  const value = response.result ?? response.data ?? response ?? {}
  return record(value)
}

/**
 * ID Dughu de l'utilisateur porteur d'une demande dev relation, selon la
 * direction considérée (incoming/outgoing).
 */
function requestUserId(item: unknown, direction: "incoming" | "outgoing"): string {
  const source = record(item)
  const relation = record(source.relation ?? item)
  const user = record(source.user)

  const nestedUserId = text(user.user_id, user.id)
  if (nestedUserId) return nestedUserId

  return direction === "outgoing"
    ? text(relation.following_id, relation.receiver_id, relation.target_id, relation.user_id)
    : text(relation.follower_id, relation.sender_id, relation.from_id, relation.user_id)
}

function requestMatches(
  item: unknown,
  targetUserId: string,
  type: RelationType,

  direction: "incoming" | "outgoing"
): boolean {
  const source = record(item)
  const relation = record(source.relation)
  const itemType = text(relation.type, source.type)
  return requestUserId(item, direction) === targetUserId && itemType === type
}

export function normalizeProfileRelations(
  profile: unknown,
  requestsData: unknown | unknown[],
  targetUserId: string,
  viewerUserId?: string
): ProfileRelations {
  const result: ProfileRelations = { ...EMPTY_PROFILE_RELATIONS }
  const source = profileSource(profile)

  if (isAccepted(source.is_friend)) result.friend = "accepted"
  if (isAccepted(source.is_network)) result.network = "accepted"

  const responses = Array.isArray(requestsData) ? requestsData : [requestsData]
  const successfulResponses = responses.filter((entry) => record(entry).ok !== false)

const incoming = successfulResponses.flatMap((entry) => {
    const response = requestsSource(entry)
    return Array.isArray(response.incoming) ? response.incoming as unknown[] : []
  })

  const outgoing = successfulResponses.flatMap((entry) => {
    const response = requestsSource(entry)
    return Array.isArray(response.outgoing) ? response.outgoing as unknown[] : []
  })

  const target = String(targetUserId)
  const viewer = String(viewerUserId ?? "")



  for (const type of ["friend", "network"] as const) {
    if (result[type] === "accepted") continue

    // /relation/requests est interprété du point de vue du profil ciblé (B).
    // Si A apparaît dans incoming de B, A a envoyé la demande : elle est donc
    // sortante du point de vue du viewer A.



    if (viewer && incoming.some((item) => requestMatches(item, viewer, type, "incoming"))) {
      result[type] = "outgoing_pending"
      continue
    }

    // Si A apparaît dans outgoing de B, B a envoyé la demande à A : elle est
    // donc entrante du point de vue du viewer A.



    if (viewer && outgoing.some((item) => requestMatches(item, viewer, type, "outgoing"))) {
      result[type] = "incoming_pending"
      continue
    }

    // Compatibilité avec une éventuelle réponse déjà orientée côté viewer.


    if (outgoing.some((item) => requestMatches(item, target, type, "outgoing"))) {
      result[type] = "outgoing_pending"
      continue
    }

    if (incoming.some((item) => requestMatches(item, target, type, "incoming"))) {
      result[type] = "incoming_pending"
      continue
    }

    const typeResponses = responses.filter((entry) => record(entry).type === type)
    const typeRequestsUnavailable =
      typeResponses.length > 0 && typeResponses.every((entry) => record(entry).ok === false)
    if (typeRequestsUnavailable) {
      result[type] = "unknown"
    }
  }

  return result
}

// ── Normalisation des demandes de relations reçues ──────────────────────────────

function responseSource(payload: unknown): UnknownRecord {
  const root = record(payload)
  return record(root.result ?? root.data ?? root)
}

function incomingItems(payload: unknown): unknown[] {
  const incoming = responseSource(payload).incoming
  return Array.isArray(incoming) ? incoming : []
}

function normalizeItem(
  item: unknown,
  fallbackType: RelationType
): IncomingRelationRequest | null {
  const source = record(item)
  const relation = record(source.relation ?? item)
  const user = record(source.user ?? source.sender ?? source.profile ?? source)

  const rawType = text(relation.type, source.type)
  const type: RelationType = rawType === "friend" || rawType === "network" ? rawType : fallbackType

  const userId = text(
    user.user_id,
    user.id,
    source.user_id,
    source.sender_id,
    source.follower_id,
    relation.follower_id,
    relation.sender_id,
    relation.user_id
  )

  if (!userId) return null

  const firstName = text(user.first_name, user.firstname, user.firstName)
  const lastName = text(user.last_name, user.lastname, user.lastName)
  const username = text(user.username, user.slug)
  const name = text(user.name, [firstName, lastName].filter(Boolean).join(" "), username, "Utilisateur Dughu")

  return {
    id: text(relation.id, source.id, `${type}-${userId}`),
    userId,
    name,
    username: username || null,
    avatar: text(user.avatar, user.image, user.profile_photo, user.photo, user.picture) || null,
    type,
    createdAt: text(relation.created_at, relation.createdAt, source.created_at, source.createdAt) || null,
  }
}

/** Normalise une liste de demandes de relations reçues, dédoublonnée par type+userId. */
export function normalizeIncomingRelationRequests(
  payload: unknown,
  fallbackType: RelationType
): IncomingRelationRequest[] {
  const unique = new Map<string, IncomingRelationRequest>()

  for (const item of incomingItems(payload)) {
    const request = normalizeItem(item, fallbackType)
    if (request) unique.set(`${request.type}:${request.userId}`, request)
  }

  return [...unique.values()]
}

/**
 * IDs Dughu des destinataires des demandes SORTANTES (envoyées par le viewer)
 * d'un type donné — sert à pré-remplir l'état « Demande envoyée » du bouton
 * Fraterniser après rechargement de la page.
 */
export function normalizeOutgoingRequestUserIds(
  payload: unknown,
  fallbackType: RelationType
): string[] {
  const outgoing = responseSource(payload).outgoing
  if (!Array.isArray(outgoing)) return []

  const ids = new Set<string>()
  for (const item of outgoing) {
    const source = record(item)
    const relation = record(source.relation ?? item)
    const rawType = text(relation.type, source.type)
    const type: RelationType = rawType === "friend" || rawType === "network" ? rawType : fallbackType
    if (type !== fallbackType) continue
    const userId = requestUserId(item, "outgoing")
    if (userId) ids.add(userId)
  }
  return [...ids]
}