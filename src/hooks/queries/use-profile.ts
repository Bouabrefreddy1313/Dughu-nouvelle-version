import { useQuery } from "@tanstack/react-query"

interface ProfileParams {
  userId?: string
  slug?: string
  currentUserId?: string
  dughuUserId?: string
  viewerDughuUserId?: string
}

async function fetchProfile({ userId, slug, currentUserId, dughuUserId, viewerDughuUserId }: ProfileParams) {
  const params = new URLSearchParams()
  if (userId) params.set("userId", userId)
  if (slug) params.set("slug", slug)
  if (currentUserId) params.set("currentUserId", currentUserId)
  if (dughuUserId) params.set("dughuUserId", dughuUserId)
  if (viewerDughuUserId) params.set("viewerDughuUserId", viewerDughuUserId)
  const res = await fetch(`/api/profile?${params}`)
  if (!res.ok) throw new Error("Profil introuvable")
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Erreur profil")
  return data
}

export function useProfile(params: ProfileParams) {
  const key = params.userId ?? params.slug ?? "me"
  return useQuery({
    queryKey: ["profile", key],
    queryFn: () => fetchProfile(params),
    enabled: !!(params.userId || params.slug),
    staleTime: 60_000,
  })
}
