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

function requestUserId(item: any, direction: "incoming" | "outgoing"): string {
  const relation = item?.relation ?? item
  return String(
    item?.user?.user_id ??
    item?.user?.id ??
    item?.user_id ??
    (direction === "incoming"
      ? item?.sender_id ?? item?.from_id ?? relation?.follower_id
      : item?.receiver_id ?? item?.target_id ?? relation?.following_id) ??
    ""
  )
}

function requestType(item: any): string {
  return String(item?.type ?? item?.relation?.type ?? "")
}

export function normalizeProfileRelations(
  profile: any,
  requestsData: any | any[],
  targetUserId: string
): ProfileRelations {
  const result: ProfileRelations = { ...EMPTY_PROFILE_RELATIONS }
  const source = profileSource(profile)

  if (source.is_friend === true || source.is_friend === 1 || source.is_friend === "1") {
    result.friend = "accepted"
  }
  if (source.is_network === true || source.is_network === 1 || source.is_network === "1") {
    result.network = "accepted"
  }

  const responses = Array.isArray(requestsData) ? requestsData : [requestsData]
  const incoming = responses.flatMap((response) => Array.isArray(response?.incoming) ? response.incoming : [])
  const outgoing = responses.flatMap((response) => Array.isArray(response?.outgoing) ? response.outgoing : [])
  const target = String(targetUserId)

  for (const type of ["friend", "network"] as const) {
    if (result[type] === "accepted") continue

    if (outgoing.some((item) => requestUserId(item, "outgoing") === target && requestType(item) === type)) {
      result[type] = "outgoing_pending"
      continue
    }
    if (incoming.some((item) => requestUserId(item, "incoming") === target && requestType(item) === type)) {
      result[type] = "incoming_pending"
    }
  }

  return result
}
