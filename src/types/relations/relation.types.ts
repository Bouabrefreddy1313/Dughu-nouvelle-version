/**
 * Types du domaine Relations.
 *
 * On distingue explicitement :
 *  - RelationApiDTO          : réponse brute reçue de l'API Dughu (instable) ;
 *  - RelationMutationPayload : payload envoyé par l'application ;
 *  - ProfileRelations        : modèle métier consommé par l'interface ;
 *  - RelationRequestsResponse : réponse de la route interne /api.
 */

export type RelationState = "none" | "outgoing_pending" | "incoming_pending" | "accepted" | "unknown"
export type RelationType = "friend" | "network"
export type RelationAction = "request" | "accept" | "decline" | "remove"

export interface ProfileRelations {
  friend: RelationState
  network: RelationState
}

export const EMPTY_PROFILE_RELATIONS: ProfileRelations = {
  friend: "none",
  network: "none",
}

/** Demande de relation reçue, normalisée pour l'interface. */
export interface IncomingRelationRequest {
  id: string
  userId: string
  name: string
  username: string | null
  avatar: string | null
  type: RelationType
  createdAt: string | null
}

/**
 * Réponse brute de l'API Dughu (contrat instable) : on l'utilise comme
 * « unknown » et on la normalise de façon défensive dans le mapper.
 */
export interface RelationApiDTO {
  success?: boolean
  message?: string
  result?: unknown
  data?: unknown
  user?: unknown
  profile?: unknown
  relation?: unknown
  incoming?: unknown
  outgoing?: unknown
}

/** Payload envoyé par l'application pour une mutation de relation. */
export interface RelationMutationPayload {
  targetId: string
  type: RelationType
  action: RelationAction
}

/** Réponse d'une mutation de relation (route interne /api). */
export interface RelationResponse {
  success: boolean
  message?: string
}

/** Réponse de la route interne GET /api/profile/relations/requests. */
export interface RelationRequestsResponse {
  success: boolean
  message?: string
  requests: IncomingRelationRequest[]
  unavailableTypes: RelationType[]
}

/**
 * Entrée de la matrice de résultats « requests » consommée par
 * normalizeProfileRelations (un par type de relation).
 */
export interface RelationRequestsEntry {
  type: RelationType
  ok: boolean
  response: unknown | null
}
