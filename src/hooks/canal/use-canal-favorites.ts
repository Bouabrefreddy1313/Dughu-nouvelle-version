"use client"

/**
 * Hooks TanStack Query pour les favoris de canaux.
 */

import { useQuery } from "@tanstack/react-query"
import { fetchFavorites } from "@/services/canal/canal.service"

export const CANAL_FAVORITES_KEY = (userId?: string, params?: Record<string, unknown>) =>
  ["canals", "favorites", userId, params] as const

export function useCanalFavorites(
  userId: string | undefined,
  options: { page?: number; categoryId?: string; enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: CANAL_FAVORITES_KEY(userId, options),
    queryFn: ({ signal }) => fetchFavorites(userId!, { ...options, signal }),
    enabled: (options.enabled ?? true) && !!userId,
    staleTime: 30_000,
  })
}
