/**
 * Hook client Retrouvailles (TanStack Query).
 *
 * Utilise le service frontend retrouvailles.service.ts (aucun fetch ni Axios
 * ici), fournit une query par onglet et une fonction de rechargement.
 */

"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchRetrouvailles, isRetrouvaillesTab } from "@/services/retrouvailles/retrouvailles.service"
import type { RetrouvaillesResponse, RetrouvaillesTab } from "@/types/retrouvailles/retrouvailles.types"

export function useRetrouvailles(
  tab: RetrouvaillesTab,
  params: {
    userId?: string
    phoneNumbers?: string[]
    ville?: string
    school?: string
    promotionStart?: string
    promotionEnd?: string
    enabled?: boolean
  } = {}
) {
  const { userId, phoneNumbers = [], ville, school, promotionStart, promotionEnd, enabled = true } = params

  const queryKey = [
    "retrouvailles",
    tab,
    userId ?? "",
    JSON.stringify(phoneNumbers),
    ville ?? "",
    school ?? "",
    promotionStart ?? "",
    promotionEnd ?? "",
  ] as const

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (tab === "contacts") {
        return fetchRetrouvailles({ tab, userId, phoneNumbers }, signal)
      }
      if (tab === "anciens") {
        return fetchRetrouvailles({ tab, userId, ville, school, promotionStart, promotionEnd }, signal)
      }
      return fetchRetrouvailles({ tab, userId }, signal)
    },
    enabled: enabled && !!userId,
    staleTime: 30_000,
  })
}

export { isRetrouvaillesTab }
export type { RetrouvaillesResponse, RetrouvaillesTab }