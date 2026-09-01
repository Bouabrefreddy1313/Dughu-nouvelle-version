// MIGRÉ (lot 4 — feed) : les appels HTTP passent désormais par le service
// frontend posts.service.ts (instance Axios cliente). Aucun fetch ici.

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchPosts, isAbortError } from "@/services/posts/posts.service"

const POSTS_PER_PAGE = 10

interface FeedParams {
  userId: string
  page: number
}

async function fetchFeed({ userId, page }: FeedParams) {
  try {
    const data = await fetchPosts({ page, userId })
    if (!data.success) throw new Error(data.message || "Erreur feed")
    return data
  } catch (error) {
    if (isAbortError(error)) throw new Error("Chargement trop long, reessayez.")
    throw error
  }
}

export function useFeed(userId: string | undefined, page: number) {
  return useQuery({
    queryKey: ["feed", userId, page],
    queryFn: () => fetchFeed({ userId: userId!, page }),
    enabled: !!userId && page > 0,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })
}

/** Précharge la page suivante pour un scroll fluide */
export function usePrefetchNextPage(userId: string | undefined, page: number) {
  const queryClient = useQueryClient()

  const prefetch = () => {
    if (!userId) return
    queryClient.prefetchQuery({
      queryKey: ["feed", userId, page + 1],
      queryFn: () => fetchFeed({ userId, page: page + 1 }),
      staleTime: 15_000,
    })
  }

  return prefetch
}
