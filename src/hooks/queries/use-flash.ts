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
