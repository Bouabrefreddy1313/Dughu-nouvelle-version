/* eslint-disable @typescript-eslint/no-explicit-any -- Réponses Dughu externes non typées. */
export type RelationState = "none" | "outgoing_pending" | "incoming_pending" | "accepted"
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

function requestMatches(item: any, targetUserId: string, type: RelationType): boolean {
  return String(item?.user?.user_id ?? "") === targetUserId && item?.relation?.type === type
}

export function normalizeProfileRelations(
  profile: any,
  requestsData: any | any[],
  targetUserId: string
): ProfileRelations {
  const result: ProfileRelations = { ...EMPTY_PROFILE_RELATIONS }
  const source = profileSource(profile)

  if (isAccepted(source.is_friend)) result.friend = "accepted"
  if (isAccepted(source.is_network)) result.network = "accepted"

  const responses = Array.isArray(requestsData) ? requestsData : [requestsData]
  const incoming = responses.flatMap((entry) => {
    const response = entry?.response ?? entry
    return Array.isArray(response?.incoming) ? response.incoming : []
  })
  const outgoing = responses.flatMap((entry) => {
    const response = entry?.response ?? entry
    return Array.isArray(response?.outgoing) ? response.outgoing : []
  })
  const target = String(targetUserId)

  for (const type of ["friend", "network"] as const) {
    if (result[type] === "accepted") continue

    if (outgoing.some((item) => requestMatches(item, target, type))) {
      result[type] = "outgoing_pending"
      continue
    }
    if (incoming.some((item) => requestMatches(item, target, type))) {
      result[type] = "incoming_pending"
    }
  }

  return result
}
