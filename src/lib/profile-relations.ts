/* eslint-disable @typescript-eslint/no-explicit-any -- Réponses Dughu externes non typées. */
export type RelationState = "none" | "outgoing_pending" | "incoming_pending" | "accepted" | "unknown"
export type RelationType = "friend" | "network"

export interface ProfileRelations {
  friend: RelationState
  network: RelationState
}

export const EMPTY_PROFILE_RELATIONS: ProfileRelations = {
  friend: "none",
  network: "none",
}

function profileSource(profile: any): any {
  return profile?.result ?? profile?.user ?? profile?.data ?? profile?.profile ?? profile ?? {}
}

function isAccepted(value: any): boolean {
  return value === true || value === 1 || value === "1"
}

function requestsSource(entry: any): any {
  const response = entry?.response ?? entry
  return response?.result ?? response?.data ?? response ?? {}
}

function requestUserId(item: any, direction: "incoming" | "outgoing"): string {
  const relation = item?.relation ?? item ?? {}
  const nestedUserId = item?.user?.user_id ?? item?.user?.id
  if (nestedUserId !== undefined && nestedUserId !== null && nestedUserId !== "") {
    return String(nestedUserId)
  }

  return String(
    direction === "outgoing"
      ? relation.following_id ?? relation.receiver_id ?? relation.target_id ?? relation.user_id ?? ""
      : relation.follower_id ?? relation.sender_id ?? relation.from_id ?? relation.user_id ?? ""
  )
}

function requestMatches(
  item: any,
  targetUserId: string,
  type: RelationType,
  direction: "incoming" | "outgoing"
): boolean {
  const itemType = item?.relation?.type ?? item?.type
  return requestUserId(item, direction) === targetUserId && itemType === type
}

export function normalizeProfileRelations(
  profile: any,
  requestsData: any | any[],
  targetUserId: string,
  viewerUserId?: string
): ProfileRelations {
  const result: ProfileRelations = { ...EMPTY_PROFILE_RELATIONS }
  const source = profileSource(profile)

  if (isAccepted(source.is_friend)) result.friend = "accepted"
  if (isAccepted(source.is_network)) result.network = "accepted"

  const responses = Array.isArray(requestsData) ? requestsData : [requestsData]
  const successfulResponses = responses.filter((entry) => entry?.ok !== false)
  const incoming = successfulResponses.flatMap((entry) => {
    const response = requestsSource(entry)
    return Array.isArray(response?.incoming) ? response.incoming : []
  })
  const outgoing = successfulResponses.flatMap((entry) => {
    const response = requestsSource(entry)
    return Array.isArray(response?.outgoing) ? response.outgoing : []
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

    const typeResponses = responses.filter((entry) => entry?.type === type)
    const typeRequestsUnavailable = typeResponses.length > 0 && typeResponses.every((entry) => entry?.ok === false)
    if (typeRequestsUnavailable) {
      result[type] = "unknown"
    }
  }

  return result
}
