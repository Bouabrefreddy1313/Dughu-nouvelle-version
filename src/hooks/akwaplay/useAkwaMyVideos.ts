"use client"

import { useState, useEffect, useCallback } from "react"
import type { AkwaVideo, AkwaStoreVideoPayload } from "@/types/akwaplay/akwaplay.types"
import {
  getUserVideos,
  storeVideo,
  destroyVideo,
} from "@/services/akwaplay/akwaplayVideo.service"

interface UseAkwaMyVideosOptions {
  userId: string | number
  viewerId?: string | number
}

export function useAkwaMyVideos({ userId, viewerId }: UseAkwaMyVideosOptions) {
  const [videos, setVideos] = useState<AkwaVideo[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [deletingId, setDeletingId] = useState<string | number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const effectiveViewerId = viewerId ?? userId

  // 1. Charger les vidéos de l'utilisateur
  const loadVideos = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      if (!userId) return

      if (pageNum === 1) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      try {
        const res = await getUserVideos(userId, effectiveViewerId, pageNum)
        setVideos((prev) => (pageNum === 1 || isRefresh ? res.videos : [...prev, ...res.videos]))
        setHasMore(res.hasMore)
        setPage(pageNum)
      } catch (err: any) {
        setError(err?.message || "Impossible de charger vos vidéos.")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [userId, effectiveViewerId]
  )

  useEffect(() => {
    loadVideos(1, true)
  }, [loadVideos])

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      loadVideos(page + 1)
    }
  }, [loading, loadingMore, hasMore, page, loadVideos])

  // 2. Mettre à jour une vidéo existante (Édition)
  const updateExistingVideo = useCallback(
    async (payload: AkwaStoreVideoPayload, onProgress?: (e: any) => void) => {
      if (!payload.videoId) {
        throw new Error("L'identifiant de la vidéo est requis pour une modification.")
      }

      const res = await storeVideo(payload, onProgress)
      if (res.video) {
        // Mettre à jour l'élément dans la liste locale
        setVideos((prev) =>
          prev.map((v) => (String(v.id) === String(payload.videoId) ? res.video! : v))
        )
      }
      return res
    },
    []
  )

  // 3. Supprimer définitivement une vidéo
  const deleteVideo = useCallback(
    async (videoId: string | number) => {
      setDeletingId(videoId)
      try {
        const res = await destroyVideo(videoId, userId)
        if (res.success) {
          // Retirer la vignette de la liste locale
          setVideos((prev) => prev.filter((v) => String(v.id) !== String(videoId)))
        }
        return res
      } finally {
        setDeletingId(null)
      }
    },
    [userId]
  )

  return {
    videos,
    loading,
    loadingMore,
    hasMore,
    error,
    deletingId,
    loadMore,
    updateVideo: updateExistingVideo,
    deleteVideo,
    refresh: () => loadVideos(1, true),
  }
}
