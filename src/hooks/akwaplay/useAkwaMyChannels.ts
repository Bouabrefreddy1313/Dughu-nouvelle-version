"use client"

import { useState, useEffect, useCallback } from "react"
import type { AkwaChannel } from "@/types/akwaplay/akwaplayChannel.types"
import {
  getUserChannels,
  destroyChannel,
} from "@/services/akwaplay/akwaplayChannel.service"

interface UseAkwaMyChannelsOptions {
  userId?: string | number
}

export function useAkwaMyChannels({ userId }: UseAkwaMyChannelsOptions = {}) {
  const [channels, setChannels] = useState<AkwaChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 1. Charger les chaînes de l'utilisateur
  const loadChannels = useCallback(async () => {
    if (!userId && userId !== 0) return

    setLoading(true)
    setError(null)

    try {
      const list = await getUserChannels(userId)
      setChannels(list)
    } catch (err: any) {
      setError(err?.message || "Impossible de charger vos chaînes.")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  // 2. Supprimer une chaîne avec confirmation et mise à jour locale
  const deleteChannel = useCallback(
    async (channelId: string | number) => {
      if (!userId && userId !== 0) throw new Error("Non autorisé.")

      setDeletingId(channelId)
      try {
        const res = await destroyChannel(channelId, userId)
        if (res.success) {
          // Retirer la chaîne de la liste locale
          setChannels((prev) => prev.filter((c) => String(c.id) !== String(channelId)))
        }
        return res
      } finally {
        setDeletingId(null)
      }
    },
    [userId]
  )

  return {
    channels,
    loading,
    error,
    deletingId,
    deleteChannel,
    refresh: loadChannels,
  }
}
