/* eslint-disable @typescript-eslint/no-explicit-any -- Réponses Dughu externes non typées, normalisées avant exposition. */
export type RelationType = "friend" | "network"
export type RelationState = "none" | "outgoing_pending" | "incoming_pending" | "accepted"

export interface ProfileRelations {
  friend: RelationState
  network: RelationState
}

export const EMPTY_PROFILE_RELATIONS: ProfileRelations = {
  friend: "none",
  network: "none",
}

function relationUserId(item: any): string {
  return String(item?.user?.user_id ?? item?.user?.id ?? item?.user_id ?? "")
}

function isAccepted(relation: any, type: RelationType): boolean {
  return relation?.[`is_${type}`] === true || relation?.[`${type}_status`] === "accepted"
}

function isPending(relation: any, type: RelationType): boolean {
  return relation?.[`is_${type}_pending`] === true || relation?.[`${type}_status`] === "pending"
}

export function normalizeProfileRelations(
  profile: any,
  requestResponses: any[],
  targetUserId: string
): ProfileRelations {
  const states: ProfileRelations = { ...EMPTY_PROFILE_RELATIONS }
  const profileSources = [profile, profile?.user, profile?.data, profile?.profile, profile?.result]

  for (const type of ["friend", "network"] as const) {
    if (profileSources.some((source) => isAccepted(source, type))) states[type] = "accepted"
  }

  for (const response of requestResponses) {
    for (const [bucket, pendingState] of [
      ["incoming", "incoming_pending"],
      ["outgoing", "outgoing_pending"],
    ] as const) {
      const items = Array.isArray(response?.[bucket]) ? response[bucket] : []
      for (const item of items) {
        if (relationUserId(item) !== String(targetUserId)) continue
        const relation = item?.relation ?? item
        for (const type of ["friend", "network"] as const) {
          if (isAccepted(relation, type)) states[type] = "accepted"
          else if (states[type] !== "accepted" && isPending(relation, type)) states[type] = pendingState
        }
      }
    }
  }

  return states
}

export function normalizeMutationRelation(relation: any): ProfileRelations {
  return {
    friend: isAccepted(relation, "friend") ? "accepted" : isPending(relation, "friend") ? "outgoing_pending" : "none",
    network: isAccepted(relation, "network") ? "accepted" : isPending(relation, "network") ? "outgoing_pending" : "none",
  }
}
