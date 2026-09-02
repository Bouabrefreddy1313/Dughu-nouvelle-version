import { useInfiniteQuery } from "@tanstack/react-query"
import { fetchPublicGroupFeed } from "@/services/groups/groups.service"

export function useGroupsFeed(searchTerm: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["groups", "feed", searchTerm],
    queryFn: ({ pageParam, signal }) => fetchPublicGroupFeed({
      page: pageParam,
      searchTerm,
      signal,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.hasMore
      ? lastPage.pagination.currentPage + 1
      : undefined,
    enabled,
    staleTime: 30_000,
  })
}