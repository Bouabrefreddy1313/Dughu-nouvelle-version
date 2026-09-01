import { useQuery, type QueryClient } from "@tanstack/react-query"
import type { FlashPagination } from "@/lib/flash-service"
import {
  fetchFriendsFlash,
  fetchUserFlash,
  toggleStoryLike,
  deleteStory,
  logStoryView,
  fetchStoryViewers,
} from "@/services/stories/stories.service"

export interface FlashUserStory {
  userId: string
  user: { id: string; name?: string | null; username?: string | null; avatar?: string | null } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stories: any[]
  allViewed: boolean | null
}

/* ─────────────────────────────────────────────────────────────
   ACTIONS Flash côté client (j'aime / suppression / vues)
   Déléguées au service frontend stories.service.ts.
   ───────────────────────────────────────────────────────────── */

/** Bascule le « j'aime » de l'utilisateur courant sur une story. */
export function toggleStoryLikeClient({ storyId, userId }: { storyId: string; userId?: string }) {
  return toggleStoryLike({ storyId, userId })
}

/** Supprime un Flash (auteur uniquement). */
export function deleteStoryClient(storyId: string) {
  return deleteStory(storyId)
}

/** Enregistre une vue sur une story (best effort, sans erreur bloquante). */
export function logStoryViewClient({ storyId, userId }: { storyId: string; userId?: string }) {
  return logStoryView({ storyId, userId })
}

/** Récupère la liste des personnes ayant vu une story (auteur uniquement, best effort). */
export function getStoryViewers({ storyId, userId }: { storyId: string; userId?: string }) {
  return fetchStoryViewers({ storyId, userId })
}

export interface FlashFeedData {
  users: FlashUserStory[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stories: any[]
  pagination: FlashPagination
}

/** Réexport du service pour compatibilité avec les importeurs existants. */
export { fetchStoryViewers } from "@/services/stories/stories.service"

/**
 * Rail Flash principal : stories des amis/contacts.
 */
export function useFlashFeed(userId?: string, page = 1, perPage = 20) {
  return useQuery<FlashFeedData>({
    queryKey: ["flash", "feed", userId, page],
    // Cast transitoire : le service normalise encore les story items en `unknown[]`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: async ({ signal }) => (await fetchFriendsFlash({ userId, page, perPage }, signal)) as any,
    enabled: !!userId,
    staleTime: 30_000,
  })
}

/**
 * Stories Flash d'un utilisateur précis (viewer plein écran, paginé).
 */
export function useUserStories(targetUserId?: string, userId?: string, page = 1) {
  // `any[]` transitoire (contrat legacy des story items) — sera typé au lot de
  // normalisation Stories.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useQuery<{ stories: any[]; pagination: FlashPagination }>({
    queryKey: ["flash", "user", targetUserId, page],
    queryFn: ({ signal }) => fetchUserFlash({ userId, targetUserId: targetUserId!, page }, signal),
    enabled: !!targetUserId,
    staleTime: 30_000,
  })
}

/**
 * Marque immédiatement les Flash d'un utilisateur comme « vus » dans le cache
 * React Query du feed Flash (toutes les pages mises en cache). Utilisé par le
 * visualiseur au moment où il enregistre une vue, pour que l'anneau autour des
 * avatars (rail Flash + cartes de posts) passe en gris sans attendre que l'API
 * Dughu rafraîchisse son propre statut « vu ».
 */
export function markFlashFeedUserViewed(
  queryClient: QueryClient,
  ownerId: string | undefined,
  targetUserId: string | number
) {
  if (!ownerId || !targetUserId) return
  queryClient.setQueriesData<FlashFeedData>(
    { queryKey: ["flash", "feed", ownerId] },
    (previous) => {
      if (!previous?.users) return previous
      const users = previous.users.map((u) =>
        String(u.userId) === String(targetUserId) ? { ...u, allViewed: true } : u
      )
      return { ...previous, users }
    }
  )
}

