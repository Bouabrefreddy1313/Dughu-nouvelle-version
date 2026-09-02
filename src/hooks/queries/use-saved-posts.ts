"use client"

// Hook du domaine Publications — page « Mes sauvegardes ».
// Les appels HTTP passent par le service frontend posts.service.ts (instance
// Axios cliente). Aucun fetch ici.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchSavedPosts, storeSave } from "@/services/posts/posts.service"

const SAVED_POSTS_KEY = (dughuUserId: string | undefined) => ["saved-posts", dughuUserId]

/**
 * Charge la liste des posts sauvegardés de l'utilisateur connecté
 * (GET /api/get-post-save/:dughuUserId). L'API Dughu pagine la réponse
 * (10 posts/page) : on récupère toutes les pages successivement pour
 * reconstruire la liste complète — le cache reste un tableau plat, la page
 * n'a pas besoin de gérer de pagination.
 */
export function useSavedPosts(dughuUserId: string | undefined) {
  return useQuery({
    queryKey: SAVED_POSTS_KEY(dughuUserId),
    queryFn: async () => {
      // Sécurité : plafond de pages pour éviter une boucle infinie si l'API
      // renvoyait une pagination incohérente.
      const MAX_PAGES = 50
      const all: Record<string, unknown>[] = []

      for (let page = 1; page <= MAX_PAGES; page++) {
        const data = await fetchSavedPosts(dughuUserId!, { page })
        if (!data.success) {
          throw new Error(data.message || "Impossible de charger vos sauvegardes.")
        }
        all.push(...((data.posts ?? []) as Record<string, unknown>[]))
        if (!data.hasMore) break
      }

      return all
    },
    enabled: !!dughuUserId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

/**
 * Retire un post des sauvegardes via POST /api/store-save (endpoint toggle
 * Dughu : le post étant déjà sauvegardé, l'appel le désauvegarde).
 *
 * Mise à jour optimiste : le post est retiré de la liste immédiatement,
 * puis réinséré en cas d'échec. Aucun retry automatique (mutation non
 * idempotente — un second envoi re-sauvegarderait le post).
 */
export function useUnsavePost(dughuUserId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) =>
      storeSave({ postId, dughuUserId: dughuUserId }),
    retry: 0,
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: SAVED_POSTS_KEY(dughuUserId) })
      const previous = queryClient.getQueryData<Record<string, unknown>[]>(SAVED_POSTS_KEY(dughuUserId))
      queryClient.setQueryData<Record<string, unknown>[]>(
        SAVED_POSTS_KEY(dughuUserId),
        (old) => (old ?? []).filter((post) => post.id !== postId)
      )
      return { previous }
    },
    onError: (_error, _postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SAVED_POSTS_KEY(dughuUserId), context.previous)
      }
    },
    onSettled: () => {
      // Resynchronisation avec l'état réel du serveur.
      queryClient.invalidateQueries({ queryKey: SAVED_POSTS_KEY(dughuUserId) })
    },
  })
}
