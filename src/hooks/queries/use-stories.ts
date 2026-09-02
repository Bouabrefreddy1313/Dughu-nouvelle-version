import { useQuery } from "@tanstack/react-query"
import { fetchStories } from "@/services/stories/stories.service"

export function useStories(enabled = true) {
  return useQuery({
    queryKey: ["stories"],
    queryFn: ({ signal }) => fetchStories(signal),
    enabled,
    staleTime: 30_000,
  })
}
