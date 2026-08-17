import { useQuery } from "@tanstack/react-query"

async function fetchSuggestions(userId?: string) {
  const params = userId ? `?userId=${encodeURIComponent(userId)}` : ""
  const res = await fetch(`/api/suggestions${params}`)
  if (!res.ok) throw new Error("Erreur suggestions")
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Erreur suggestions")
  return data
}

export function useSuggestions(userId?: string) {
  return useQuery({
    queryKey: ["suggestions", userId],
    queryFn: () => fetchSuggestions(userId),
    enabled: !!userId,
    staleTime: 5 * 60_000, // 5 minutes
  })
}
