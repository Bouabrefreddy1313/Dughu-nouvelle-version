"use client"

// â”€â”€ Hook client Capsules (React Query) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Les hooks appellent le service frontend capsules.service.ts (aucun fetch
// ni Axios ici). Les fonctions d'action sont rÃ©exportÃ©es pour compatibilitÃ©
// avec les composants existants â€” leur dÃ©placement vers hooks/capsules/ se
// fera au lot de rÃ©organisation finale.

import { useQuery } from "@tanstack/react-query"
import type { CapsuleComment } from "@/lib/capsule-service"
import {
  fetchCapsulesFeed,
  fetchUserCapsules,
  toggleCapsuleLike,
  toggleCapsuleDislike,
  logCapsuleView,
  fetchCapsuleComments,
  addCapsuleComment,
  replyCapsuleComment,
  likeCapsuleComment,
  reportCapsule,
  deleteCapsule,
  createCapsule,
} from "@/services/capsules/capsules.service"

/** Feed des capsules (utilisÃ© par la page /capsules et le rail du fil). */
export function useCapsulesFeed(params: { userId?: string; page?: number; perPage?: number }) {
  return useQuery({
    queryKey: ["capsules", "feed", params.userId ?? "", params.page ?? 1, params.perPage ?? ""],
    queryFn: ({ signal }) => fetchCapsulesFeed(params, signal),
    enabled: !!params.userId,
    staleTime: 60_000,
  })
}

/** Like / unlike une capsule. */
export function toggleCapsuleLikeClient({ capsuleId, userId }: { capsuleId: string; userId?: string }) {
  return toggleCapsuleLike({ capsuleId, userId }) as Promise<{ success: boolean; liked?: boolean }>
}

/** Dislike / undislike une capsule. */
export function toggleCapsuleDislikeClient({ capsuleId, userId }: { capsuleId: string; userId?: string }) {
  return toggleCapsuleDislike({ capsuleId, userId }) as Promise<{ success: boolean; disliked?: boolean }>
}

/** Enregistre une vue sur une capsule (best effort, sans erreur bloquante). */
export function logCapsuleViewClient({ capsuleId, userId }: { capsuleId: string; userId?: string }) {
  return logCapsuleView({ capsuleId, userId })
}

/** Commentaires d'une capsule (page demandÃ©e â†’ commentaires distants + pagination). */
export function fetchCapsuleCommentsClient({
  capsuleId,
  userId,
  page = 1,
}: {
  capsuleId: string
  userId?: string
  page?: number
}) {
  return fetchCapsuleComments({ capsuleId, userId, page })
}

/** Ajoute un commentaire sur une capsule. */
export function addCapsuleCommentClient({ capsuleId, userId, content }: { capsuleId: string; userId?: string; content: string }) {
  return addCapsuleComment({ capsuleId, userId, content }) as
    Promise<{ success: boolean; comment?: CapsuleComment | null }>
}

/** RÃ©pond Ã  un commentaire (ou Ã  une rÃ©ponse) d'une capsule. */
export function replyCapsuleCommentClient({
  capsuleId,
  commentId,
  userId,
  content,
  isReplyReply = false,
}: {
  capsuleId: string
  commentId: string
  userId?: string
  content: string
  isReplyReply?: boolean
}) {
  return replyCapsuleComment({ capsuleId, commentId, userId, content, isReplyReply }) as
    Promise<{ success: boolean; reply?: CapsuleComment | null }>
}

/** Like / unlike un commentaire de capsule. */
export function likeCapsuleCommentClient({
  capsuleId,
  commentId,
  userId,
}: {
  capsuleId: string
  commentId: string
  userId?: string
}) {
  return likeCapsuleComment({ capsuleId, commentId, userId }) as
    Promise<{ success: boolean; liked?: boolean; likesCount?: number }>
}

/** Signale une capsule. */
export function reportCapsuleClient({ capsuleId, userId, reason }: { capsuleId: string; userId?: string; reason?: string }) {
  return reportCapsule({ capsuleId, userId, reason })
}

/** Supprime une capsule (auteur uniquement). */
export function deleteCapsuleClient(capsuleId: string) {
  return deleteCapsule(capsuleId)
}

/** CrÃ©e une capsule (POST /store/capsule Dughu via la route interne multipart). */
export function createCapsuleClient({
  video,
  caption,
  userId,
}: {
  video: File
  caption?: string
  userId?: string
}) {
  return createCapsule({ video, caption, userId })
}

/** Capsules d'un utilisateur prÃ©cis (GET /shortsUser/{user_id} Dughu). */
export function useUserCapsules(targetUserId?: string, viewerId?: string) {
  return useQuery({
    queryKey: ["capsules", "user", String(targetUserId ?? ""), String(viewerId ?? "")],
    queryFn: ({ signal }) => fetchUserCapsules(String(targetUserId), viewerId, signal),
    enabled: !!targetUserId,
    staleTime: 60_000,
  })
}

