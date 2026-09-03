"use client"

import { useState, useEffect, useCallback } from "react"
import type { AkwaChannel, AkwaVideo } from "@/types/akwaplay/akwaplayChannel.types"
import {
  getChannelDetail,
  toggleFollowChannel,
} from "@/services/akwaplay/akwaplayChannel.service"

interface UseAkwaChannelDetailOptions {
  channelId?: string | number
  slug?: string
  userId?: string | number
}

export function useAkwaChannelDetail({
  channelId,
  slug,
  userId,
}: UseAkwaChannelDetailOptions) {
  const [channel, setChannel] = useState<AkwaChannel | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [subscribersCount, setSubscribersCount] = useState(0)
  const [videos, setVideos] = useState<AkwaVideo[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Charger les détails de la chaîne au montage
  const loadDetail = useCallback(async () => {
    if (!channelId && !slug) return

    setLoading(true)
    setError(null)

    try {
      const res = await getChannelDetail({
        channelId,
        slug,
        userId: userId || "",
      })

      setChannel(res.channel)
      setIsFollowing(res.isFollowing)
      setSubscribersCount(res.channel.subscribersCount || 0)
      setVideos(res.channel.videos || [])
    } catch (err: any) {
      setError(err?.message || "Impossible de charger la chaîne.")
    } finally {
      setLoading(false)
    }
  }, [channelId, slug, userId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  // 2. Basculer l'abonnement "Suivre" / "Se désabonner" avec Optimistic UI
  const handleToggleFollow = useCallback(async () => {
    if (!userId && userId !== 0) {
      throw new Error("Veuillez vous connecter pour suivre cette chaîne.")
    }

    const currentChannelId = channel?.id || channelId
    if (!currentChannelId) return

    // Optimistic toggle
    const prevFollowing = isFollowing
    const prevCount = subscribersCount

    const nextFollowing = !prevFollowing
    setIsFollowing(nextFollowing)
    setSubscribersCount((c) => Math.max(0, c + (nextFollowing ? 1 : -1)))

    try {
      const res = await toggleFollowChannel({
        channelId: currentChannelId,
        userId,
      })

      if (res.isFollowing !== undefined) {
        setIsFollowing(res.isFollowing)
      }
      if (res.subscribersCount !== undefined) {
        setSubscribersCount(res.subscribersCount)
      }
      return res
    } catch (err) {
      // Rollback en cas d'erreur
      setIsFollowing(prevFollowing)
      setSubscribersCount(prevCount)
      throw err
    }
  }, [userId, channel?.id, channelId, isFollowing, subscribersCount])

  return {
    channel,
    isFollowing,
    subscribersCount,
    videos,
    loading,
    error,
    toggleFollow: handleToggleFollow,
    refresh: loadDetail,
  }
}
