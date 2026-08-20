import { useQuery } from "@tanstack/react-query"

async function fetchCurrentUser() {
  // Le serveur est la source de vérité : /api/auth/me lit exclusivement les
  // cookies Dughu et interroge l'API. Plus de cache localStorage.
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" })
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.user) return data.user
    }
  } catch {
    // Réseau indisponible → on laisse la requête échouer (pas de repli local)
  }
  throw new Error("Non connecte")
}

export function useAuth() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: false,
  })
}
