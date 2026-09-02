import { useInfiniteQuery } from "@tanstack/react-query"
import { fetchUserGroups } from "@/services/groups/groups.service"

export function useUserGroups(searchTerm: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["groups", "mine", searchTerm],
    queryFn: ({ pageParam, signal }) => fetchUserGroups({
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