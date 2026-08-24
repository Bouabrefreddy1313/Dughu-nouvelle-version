import { useQuery } from "@tanstack/react-query"
import type { FlashPagination } from "@/lib/flash-service"

interface FetchParams {
  userId?: string
  page?: number
  perPage?: number
}

async function fetchFriendsFlash(params: FetchParams) {
  const qs = new URLSearchParams()
  if (params.userId) qs.set("userId", params.userId)
  if (params.page) qs.set("page", String(params.page))
  if (params.perPage) qs.set("perPage", String(params.perPage))
  const res = await fetch(`/api/stories/friends?${qs}`)
  if (!res.ok) throw new Error("Erreur Flash")
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Erreur Flash")
  return data
}

async function fetchUserFlash({ userId, targetUserId, page = 1 }: FetchParams & { targetUserId: string }) {
  const qs = new URLSearchParams()
  if (userId) qs.set("userId", userId)
  qs.set("targetUserId", targetUserId)
  qs.set("page", String(page))
  const res = await fetch(`/api/stories/user?${qs}`)
  if (!res.ok) throw new Error("Erreur Flash")
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Erreur Flash")
  return data
}

export interface FlashUserStory {
  userId: string
  user: { id: string; name?: string | null; username?: string | null; avatar?: string | null } | null
  stories: any[]
  allViewed: boolean | null
}

/* ─────────────────────────────────────────────────────────────
   ACTIONS Flash côté client (j'aime / suppression / vues)
   ───────────────────────────────────────────────────────────── */

/** Bascule le « j'aime » de l'utilisateur courant sur une story. */
export async function toggleStoryLikeClient({ storyId, userId }: { storyId: string; userId?: string }) {
  const res = await fetch("/api/stories/like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storyId, userId }),
  })
  const data = await res.json().catch(() => ({ success: false }))
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Erreur de réaction")
  }
  return data as { success: boolean; liked?: boolean }
}

/** Supprime un Flash (auteur uniquement). */
export async function deleteStoryClient(storyId: string) {
  const res = await fetch(`/api/stories/${encodeURIComponent(storyId)}`, { method: "DELETE" })
  const data = await res.json().catch(() => ({ success: false }))
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Erreur suppression")
  }
  return data
}

/** Enregistre une vue sur une story. */
export async function logStoryViewClient({ storyId, userId }: { storyId: string; userId?: string }) {
  const res = await fetch("/api/stories/logView", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storyId, userId }),
  })
  const data = await res.json().catch(() => ({ success: false }))
  return { ok: res.ok && !!data.success }
}

/** Récupère la liste des personnes ayant vu une story (auteur uniquement). */
export async function fetchStoryViewers({ storyId, userId }: { storyId: string; userId?: string }) {
  const qs = new URLSearchParams()
  qs.set("storyId", storyId)
  if (userId) qs.set("userId", userId)
  const res = await fetch(`/api/stories/logView?${qs}`)
  const data = await res.json().catch(() => ({ success: false, viewers: [] as any[] }))
  if (!res.ok || !data.success) {
    return [] as any[]
  }
  return (data.viewers as any[]) || []
}

export interface FlashFeedData {
  users: FlashUserStory[]
  stories: any[]
  pagination: FlashPagination
}

/**
 * Rail Flash principal : stories des amis/contacts.
 */
export function useFlashFeed(userId?: string, page = 1, perPage = 20) {
  return useQuery<FlashFeedData>({
    queryKey: ["flash", "feed", userId, page],
    queryFn: () => fetchFriendsFlash({ userId, page, perPage }),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

/**
 * Stories Flash d'un utilisateur précis (viewer plein écran, paginé).
 */
export function useUserStories(targetUserId?: string, userId?: string, page = 1) {
  return useQuery<{ stories: any[]; pagination: FlashPagination }>({
    queryKey: ["flash", "user", targetUserId, page],
    queryFn: () => fetchUserFlash({ userId, targetUserId: targetUserId!, page }),
    enabled: !!targetUserId,
    staleTime: 30_000,
  })
}
