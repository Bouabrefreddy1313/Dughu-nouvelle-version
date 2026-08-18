"use client"

// Le fil peut afficher plusieurs posts du même auteur. Ce cache évite que
// chaque carte reparte de « S'abonner » et déclenche une requête identique.
const followingByPair = new Map<string, boolean>()

function key(currentUserId: string | null | undefined, authorId: string) {
  return `${currentUserId ?? "anonymous"}:${authorId}`
}

export function getCachedFollowing(currentUserId: string | null | undefined, authorId: string) {
  return followingByPair.get(key(currentUserId, authorId))
}

export function setCachedFollowing(
  currentUserId: string | null | undefined,
  authorId: string,
  following: boolean
) {
  followingByPair.set(key(currentUserId, authorId), following)
}
