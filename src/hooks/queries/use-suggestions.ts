// MIGRÉ (lot 4 — feed) : les appels HTTP passent désormais par le service
// frontend feed.service.ts (instance Axios cliente). Aucun fetch ici.

import { useQuery } from "@tanstack/react-query"
import { fetchSuggestions } from "@/services/posts/feed.service"

export function useSuggestions(userId?: string) {
  return useQuery({
    queryKey: ["suggestions", userId],
    queryFn: () => fetchSuggestions(userId || ""),
    enabled: !!userId,
    staleTime: 5 * 60_000, // 5 minutes
  })
}
