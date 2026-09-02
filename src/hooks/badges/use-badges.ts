/**
 * Hook client Badges (TanStack Query).
 *
 * Utilise le service frontend badges.service.ts (aucun fetch ni Axios ici) et
 * fournit deux queries : le catalogue complet des badges et les badges obtenus
 * par l'utilisateur connecté.
 */

"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchBadgeCatalogue, fetchUserBadges } from "@/services/badges/badges.service"
import type { BadgeCatalogueResponse, UserBadgesResponse } from "@/types/points/points.types"

export function useBadgeCatalogue(params: { enabled?: boolean } = {}) {
  const { enabled = true } = params

  return useQuery<BadgeCatalogueResponse>({
    queryKey: ["badges", "catalogue"],
    queryFn: ({ signal }) => fetchBadgeCatalogue(signal),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useUserBadges(params: { userId?: string; enabled?: boolean } = {}) {
  const { userId, enabled = true } = params

  return useQuery<UserBadgesResponse>({
    queryKey: ["badges", "user", userId ?? ""],
    queryFn: ({ signal }) => fetchUserBadges(String(userId), signal),
    enabled: enabled && !!userId,
    staleTime: 60_000,
  })
}
