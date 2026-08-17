import { useQuery } from "@tanstack/react-query"

async function fetchCurrentUser() {
  // D'abord localStorage (rapide)
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("dughu_user")
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        localStorage.removeItem("dughu_user")
      }
    }
  }
  // Sinon API
  const res = await fetch("/api/auth/me")
  if (!res.ok) throw new Error("Non connecte")
  const data = await res.json()
  if (data.success && data.user) {
    localStorage.setItem("dughu_user", JSON.stringify(data.user))
    return data.user
  }
  throw new Error("Non connecte")
}

export function useAuth() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchCurrentUser,
    staleTime: Infinity, // Ne refetch jamais automatiquement
    gcTime: Infinity,
    retry: false,
  })
}
