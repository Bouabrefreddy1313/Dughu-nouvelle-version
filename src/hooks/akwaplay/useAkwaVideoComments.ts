"use client"

import { useState, useEffect, useCallback } from "react"
import type { AkwaComment, AkwaCommentReply } from "@/types/akwaplay/akwaplay.types"
import {
  fetchVideoComments,
  storeComment,
  fetchCommentReplies,
  replyComment,
  toggleLikeComment,
  deleteComment,
  deleteReplyComment,
} from "@/services/akwaplay/akwaplayVideo.service"

interface UseAkwaVideoCommentsOptions {
  videoId: string | number
  userId?: string | number
}

export function useAkwaVideoComments({ videoId, userId }: UseAkwaVideoCommentsOptions) {
  const [comments, setComments] = useState<AkwaComment[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Suivi de pagination des réponses par commentId : { [commentId]: { page: number, hasMore: boolean, loading: boolean } }
  const [repliesState, setRepliesState] = useState<
    Record<string | number, { page: number; hasMore: boolean; loading: boolean }>
  >({})

  // 1. Charger les commentaires initiaux
  const loadComments = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      if (!videoId) return

      if (pageNum === 1) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      try {
        const res = await fetchVideoComments(videoId, userId || "", pageNum)
        setComments((prev) => (pageNum === 1 || isRefresh ? res.comments : [...prev, ...res.comments]))
        setHasMore(res.hasMore)
        setPage(pageNum)
      } catch (err: any) {
        setError(err?.message || "Impossible de charger les commentaires.")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [videoId, userId]
  )

  useEffect(() => {
    loadComments(1, true)
  }, [loadComments])

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      loadComments(page + 1)
    }
  }, [loading, loadingMore, hasMore, page, loadComments])

  // 2. Ajouter un commentaire
  const addComment = useCallback(
    async (content: string) => {
      if (!userId) throw new Error("Veuillez vous connecter pour commenter.")
      if (!content.trim()) return

      setSubmitting(true)
      try {
        const res = await storeComment({ videoId, content, userId })
        if (res.comment) {
          // Insérer le nouveau commentaire en tête
          setComments((prev) => [res.comment!, ...prev])
        }
        return res
      } finally {
        setSubmitting(false)
      }
    },
    [videoId, userId]
  )

  // 3. Charger les réponses d'un commentaire (lazy loading)
  const loadReplies = useCallback(
    async (commentId: string | number) => {
      if (!commentId) return

      const currentState = repliesState[commentId] || { page: 0, hasMore: true, loading: false }
      if (currentState.loading || !currentState.hasMore) return

      const nextPage = currentState.page + 1

      setRepliesState((prev) => ({
        ...prev,
        [commentId]: { ...currentState, loading: true },
      }))

      try {
        const res = await fetchCommentReplies(commentId, userId || "", nextPage)

        setComments((prev) =>
          prev.map((c) => {
            if (String(c.id) !== String(commentId)) return c
            const existingReplies = c.replies || []
            // Fusionner en évitant les doublons
            const existingIds = new Set(existingReplies.map((r) => String(r.id)))
            const newReplies = res.replies.filter((r) => !existingIds.has(String(r.id)))
            return {
              ...c,
              replies: [...existingReplies, ...newReplies],
            }
          })
        )

        setRepliesState((prev) => ({
          ...prev,
          [commentId]: {
            page: nextPage,
            hasMore: res.hasMore,
            loading: false,
          },
        }))
      } catch {
        setRepliesState((prev) => ({
          ...prev,
          [commentId]: { ...currentState, loading: false },
        }))
      }
    },
    [repliesState, userId]
  )

  // 4. Répondre à un commentaire
  const addReply = useCallback(
    async (commentId: string | number, content: string) => {
      if (!userId) throw new Error("Veuillez vous connecter pour répondre.")
      if (!content.trim()) return

      const res = await replyComment({ commentId, content, userId })
      if (res.reply) {
        setComments((prev) =>
          prev.map((c) => {
            if (String(c.id) !== String(commentId)) return c
            return {
              ...c,
              repliesCount: (c.repliesCount || 0) + 1,
              replies: [...(c.replies || []), res.reply!],
            }
          })
        )
      }
      return res
    },
    [userId]
  )

  // 5. Liker un commentaire ou une réponse (Optimistic UI)
  const toggleLike = useCallback(
    async (commentId?: string | number, replyId?: string | number) => {
      if (!userId) throw new Error("Veuillez vous connecter pour aimer un commentaire.")

      // Optimistic update
      setComments((prev) =>
        prev.map((c) => {
          if (!replyId && String(c.id) === String(commentId)) {
            const nextLiked = !c.isLiked
            return {
              ...c,
              isLiked: nextLiked,
              likesCount: Math.max(0, c.likesCount + (nextLiked ? 1 : -1)),
            }
          }
          if (replyId && c.replies?.length) {
            return {
              ...c,
              replies: c.replies.map((r) => {
                if (String(r.id) === String(replyId)) {
                  const nextLiked = !r.isLiked
                  return {
                    ...r,
                    isLiked: nextLiked,
                    likesCount: Math.max(0, r.likesCount + (nextLiked ? 1 : -1)),
                  }
                }
                return r
              }),
            }
          }
          return c
        })
      )

      try {
        await toggleLikeComment({ commentId, replyId, userId })
      } catch (err) {
        // Rollback en cas d'erreur réseau
        setComments((prev) =>
          prev.map((c) => {
            if (!replyId && String(c.id) === String(commentId)) {
              const prevLiked = !c.isLiked
              return {
                ...c,
                isLiked: prevLiked,
                likesCount: Math.max(0, c.likesCount + (prevLiked ? 1 : -1)),
              }
            }
            if (replyId && c.replies?.length) {
              return {
                ...c,
                replies: c.replies.map((r) => {
                  if (String(r.id) === String(replyId)) {
                    const prevLiked = !r.isLiked
                    return {
                      ...r,
                      isLiked: prevLiked,
                      likesCount: Math.max(0, r.likesCount + (prevLiked ? 1 : -1)),
                    }
                  }
                  return r
                }),
              }
            }
            return c
          })
        )
        throw err
      }
    },
    [userId]
  )

  // 6. Supprimer un commentaire
  const removeComment = useCallback(
    async (commentId: string | number) => {
      if (!userId) throw new Error("Non autorisé.")

      // Optimistic remove
      const previousComments = [...comments]
      setComments((prev) => prev.filter((c) => String(c.id) !== String(commentId)))

      try {
        await deleteComment(commentId, userId)
      } catch (err) {
        setComments(previousComments)
        throw err
      }
    },
    [userId, comments]
  )

  // 7. Supprimer une réponse
  const removeReply = useCallback(
    async (commentId: string | number, replyId: string | number) => {
      if (!userId) throw new Error("Non autorisé.")

      const previousComments = [...comments]
      setComments((prev) =>
        prev.map((c) => {
          if (String(c.id) !== String(commentId)) return c
          return {
            ...c,
            repliesCount: Math.max(0, c.repliesCount - 1),
            replies: c.replies?.filter((r) => String(r.id) !== String(replyId)),
          }
        })
      )

      try {
        await deleteReplyComment(replyId, userId)
      } catch (err) {
        setComments(previousComments)
        throw err
      }
    },
    [userId, comments]
  )

  return {
    comments,
    loading,
    loadingMore,
    hasMore,
    error,
    submitting,
    loadMore,
    addComment,
    loadReplies,
    addReply,
    toggleLikeComment: (commentId: string | number) => toggleLike(commentId, undefined),
    toggleLikeReply: (commentId: string | number, replyId: string | number) => toggleLike(commentId, replyId),
    deleteComment: removeComment,
    deleteReplyComment: removeReply,
    repliesState,
    refresh: () => loadComments(1, true),
  }
}
