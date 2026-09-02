/**
 * Hook d'accès à l'utilisateur courant via la route interne /api/auth/me.
 * Utilise TanStack Query et appelle le service frontend auth.service.ts ; il
 * ne doit JAMAIS importer Axios ni faire d'appel HTTP direct.
 *
 * Comportement conservé : la requête échoue (erreur "Non connecte" — gérée via
 * `retry: false`) quand la session est absente ou le réseau indisponible.
 */

import { useQuery } from "@tanstack/react-query"
import { me } from "@/services/auth/auth.service"

// TODO(lot feed/flash) : typer précisément le retour lorsque les domaines
// feed/flash/hashtags auront été migrés — le `any` est TEMPORAIRE : le passer
// à `Promise<AuthUser>` dès maintenant fait remonter des faiblesses de typage
// préexistantes hors domaine (home/page.tsx, HashtagPage.tsx).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchCurrentUser(): Promise<any> {
  try {
    const data = await me()
    if (data.success && data.user) return data.user
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