import { useQuery } from "@tanstack/react-query"

async function fetchStories() {
  const res = await fetch("/api/stories")
  if (!res.ok) throw new Error("Erreur stories")
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Erreur stories")
  return data.stories || []
}

export function useStories(enabled = true) {
  return useQuery({
    queryKey: ["stories"],
    queryFn: fetchStories,
    enabled,
    staleTime: 30_000,
  })
}
