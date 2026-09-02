/**
 * Hook TanStack Query du domaine Profil : chargement d'un profil via
 * /api/profile en passant par le service frontend profile.service.ts.
 * Ce hook n'importe jamais Axios ni fetch et ne contient aucun DTO brut.
 *
 * Emplacement cible de l'architecture (src/hooks/profile/) ; l'ancien chemin
 * src/hooks/queries/use-profile.ts est conservé comme façade transitoire.
 */

import { useQuery } from "@tanstack/react-query"
import { fetchProfile } from "@/services/profile/profile.service"
import type { ProfileParams, ProfileApiResponse } from "@/types/profile/profile.types"

export type { ProfileParams }

export function useProfile(params: ProfileParams) {
  const key = params.userId ?? params.slug ?? "me"
  return useQuery<ProfileApiResponse>({
    queryKey: ["profile", key],
    queryFn: ({ signal }) => fetchProfile(params, { signal }),
    enabled: !!(params.userId || params.slug),
    staleTime: 60_000,
  })
}
