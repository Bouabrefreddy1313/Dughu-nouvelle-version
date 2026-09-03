"use client"

// Hook du domaine Publications — liste des personnes ayant réagi sur une
// publication. Les appels passent par le service frontend posts.service.ts
// (instance Axios cliente). Aucun fetch ici.
//
// Le chargement est LAZY : la requête n'est lancée que lorsque le modal des
// réactions est ouvert (`enabled`).

import { useQuery } from "@tanstack/react-query"
import { fetchPostReactions } from "@/services/posts/posts.service"
import type { ReactionUserItem } from "@/types/posts/post.types"

export interface PostReactionsData {
  users?: ReactionUserItem[]
  summary?: { type: string; count: number }[]
}

/**
 * Charge la liste des personnes ayant réagi sur une publication via
 * GET /api/reactions?postId=X&userId=Y (l'onglet réactions du modal).
 * Ne s'exécute que lorsque `enabled` est vrai (ouverture du modal).
 */
export function usePostReactions(
  postId: string | undefined,
  userId: string | undefined,
  enabled: boolean
): {
  data: PostReactionsData | undefined
  isLoading: boolean
  isError: boolean
  refetch: () => void
} {
  const query = useQuery({
    queryKey: ["post-reactions", postId],
    queryFn: async () => {
      const res = await fetchPostReactions({
        postId: postId!,
        userId: userId || undefined,
      })
      if (!res.success) throw new Error(res.message || "Impossible de charger les réactions")
      return {
        users: Array.isArray(res.users) ? res.users : [],
        summary: Array.isArray(res.summary) ? res.summary : [],
      } satisfies PostReactionsData
    },
    enabled: !!postId && enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  return {
    data: query.data,
    isLoading: query.isFetching,
    isError: query.isError,
    refetch: () => { void query.refetch() },
  }
}