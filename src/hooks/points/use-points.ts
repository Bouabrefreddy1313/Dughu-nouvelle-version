/**
 * Hook client Points (TanStack Query).
 *
 * Utilise les services frontend (aucun fetch ni Axios ici) :
 *  - `usePointsToday` : solde de points via la route interne /api/pointsToday/:userId
 *    (même source que le mini-profil → champ `total`), réutilise le service
 *    existant `fetchPointsToday` (src/services/posts/feed.service.ts) ;
 *  - `usePointsHistory` : historique des mouvements via /api/pointsHistory.
 */

"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchPointsHistory } from "@/services/points/points.service"
import { fetchPointsToday } from "@/services/posts/feed.service"
import type { PointsHistoryResponse } from "@/types/points/points.types"
import type { PointsTodayResponse } from "@/types/posts/post.types"

/**
 * Solde de points de l'utilisateur connecté (GET /api/pointsToday/:userId).
 * Expose `total` (points disponibles), `converted` et `gain_today`.
 */
export function usePointsToday(params: { userId?: string; enabled?: boolean } = {}) {
  const { userId, enabled = true } = params

  return useQuery<PointsTodayResponse>({
    queryKey: ["pointsToday", userId ?? ""],
    queryFn: ({ signal }) => fetchPointsToday(String(userId), { signal }),
    enabled: enabled && !!userId,
    staleTime: 30_000,
  })
}

export function usePointsHistory(params: { userId?: string; enabled?: boolean } = {}) {
  const { userId, enabled = true } = params

  return useQuery<PointsHistoryResponse>({
    queryKey: ["pointsHistory", userId ?? ""],
    queryFn: ({ signal }) => fetchPointsHistory({ userId }, signal),
    enabled: enabled && !!userId,
    staleTime: 30_000,
  })
}

