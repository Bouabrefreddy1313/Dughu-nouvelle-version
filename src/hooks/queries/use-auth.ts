import { useQuery } from "@tanstack/react-query"

function readCachedUser(): any | null {
  if (typeof window === "undefined") return null
  const cached = localStorage.getItem("dughu_user")
  if (!cached) return null
  try {
    return JSON.parse(cached)
  } catch {
    localStorage.removeItem("dughu_user")
    return null
  }
}

async function fetchCurrentUser() {
  // Le serveur est la source de vérité (il resynchronise le miroir local depuis
  // Dughu) : on appelle toujours /api/auth/me, puis on met à jour le cache
  // localStorage pour que header/sidebar reflètent les dernières données.
  try {
    const res = await fetch("/api/auth/me")
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.user) {
        localStorage.setItem("dughu_user", JSON.stringify(data.user))
        return data.user
      }
    }
  } catch {
    // Réseau indisponible → repli sur le cache local
  }
  const cached = readCachedUser()
  if (cached) return cached
  throw new Error("Non connecte")
}

export function useAuth() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchCurrentUser,
    // Affiche immédiatement le cache localStorage (seed) mais le considère
    // comme obsolète pour re-synchroniser depuis le serveur au montage.
    initialData: readCachedUser(),
    initialDataUpdatedAt: () => 0,
    staleTime: 60_000, // re-synchronise au plus une fois par minute
    gcTime: Infinity,
    retry: false,
  })
}
