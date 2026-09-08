"use client"

/**
 * Hooks TanStack Query pour les Notifications Dughu.
 *
 * - useNotifications : charge les notifications selon le filtre ("all", "poke", etc.) et la page ;
 * - useNotificationUnreadCount : effectue un polling léger (toutes les 30s) pour maintenir
 *   le badge du header synchronisé en arrière-plan ;
 * - useMarkNotificationRead : met à jour le statut 'seen' instantanément en local et en cache ;
 * - useSendNotification : mutation réutilisable pour envoyer des notifications.
 */

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchNotifications,
  sendNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/notifications/notifications.service"
import type {
  NotificationItem,
  NotificationsResponse,
  SendNotificationPayload,
} from "@/types/notifications/notification.types"
import { parseNotificationDate } from "@/services/notifications/notifications.mapper"

const SEEN_NOTIFS_STORAGE_KEY = "dughu_seen_notifications"

function getLocalSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(SEEN_NOTIFS_STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.map(String) : [])
  } catch {
    return new Set()
  }
}

function saveLocalSeenIds(set: Set<string>) {
  if (typeof window === "undefined") return
  try {
    const arr = Array.from(set).slice(-500) // Conserver les 500 derniers
    localStorage.setItem(SEEN_NOTIFS_STORAGE_KEY, JSON.stringify(arr))
  } catch {
    // ignore
  }
}

/**
 * Hook principal de récupération des notifications avec filtre et pagination.
 */
export function useNotifications(params: {
  filter?: string
  page?: number
  userId?: string
  enabled?: boolean
} = {}) {
  const { filter = "all", page = 1, userId = "", enabled = true } = params
  const [localSeen, setLocalSeen] = useState<Set<string>>(() => getLocalSeenIds())

  useEffect(() => {
    setLocalSeen(getLocalSeenIds())
  }, [])

  const query = useQuery<NotificationsResponse>({
    queryKey: ["notifications", filter, page, userId],
    queryFn: () => fetchNotifications({ filter, page, userId }),
    enabled: enabled && (!userId || userId !== "0"),
    staleTime: 15_000,
  })

  // Applique les statuts 'seen' locaux sur les données distantes
  const enrichedNotifications: NotificationItem[] = (query.data?.notifications || []).map((n) => {
    const isSeenLocally = localSeen.has(String(n.id))
    return {
      ...n,
      seen: isSeenLocally ? 1 : n.seen,
    }
  })

  const localUnreadCount = enrichedNotifications.filter((n) => n.seen === 0).length

  return {
    ...query,
    notifications: enrichedNotifications,
    unreadCount: Math.max(0, (query.data?.unreadCount ?? localUnreadCount) - ((query.data?.notifications?.length ?? 0) - localUnreadCount)),
    apiUnreadCount: query.data?.unreadCount ?? 0,
    hasMore: query.data?.hasMore ?? false,
    total: query.data?.total ?? 0,
    currentPage: query.data?.currentPage ?? page,
    perPage: query.data?.perPage ?? 10,
    lastPage: query.data?.lastPage ?? 1,
  }
}

/**
 * Hook de polling pour maintenir le compteur de notifications non lues à jour dans le header.
 * Interroge GET /api/notifications?filter=all toutes les 30 secondes.
 */
export function useNotificationUnreadCount(userId?: string) {
  const [localSeen, setLocalSeen] = useState<Set<string>>(() => getLocalSeenIds())

  useEffect(() => {
    const onStorage = () => setLocalSeen(getLocalSeenIds())
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const query = useQuery<NotificationsResponse>({
    queryKey: ["notifications", "unread-count", userId || ""],
    queryFn: () => fetchNotifications({ filter: "all", page: 1, userId: userId || "" }),
    enabled: !!userId && userId !== "0",
    refetchInterval: 30_000, // Polling automatique toutes les 30s
    staleTime: 10_000,
  })

  // Réinitialisation automatique en direct à minuit (00h00:00)
  const [, setMidnightTick] = useState(0)
  useEffect(() => {
    const now = new Date()
    const tomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 500)
    const msUntilMidnight = tomorrowMidnight.getTime() - now.getTime()

    const timer = setTimeout(() => {
      setMidnightTick((v) => v + 1)
      void query.refetch()
    }, Math.max(1000, msUntilMidnight))

    return () => clearTimeout(timer)
  }, [query])

  const items = query.data?.notifications || []

  // Début du jour actuel (00h00:00)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTodayMs = startOfToday.getTime()

  // Règle produit Dughu :
  // 1. Ne compte que les notifications NON LUES (seen === 0 et non marquées lues localement)
  // 2. Se réinitialise chaque jour à 00h00 : ne compte que les notifications du jour en cours (>= 00h00)
  const todayUnreadCount = items.filter((n) => {
    if (n.seen !== 0 || localSeen.has(String(n.id))) return false

    const ts =
      typeof n.time === "number" && n.time > 0
        ? n.time < 10_000_000_000
          ? n.time * 1000
          : n.time
        : parseNotificationDate(n.createdAt)

    return ts >= startOfTodayMs
  }).length

  // Total de toutes les notifications non lues toutes dates confondues
  const totalUnreadCount = items.filter((n) => n.seen === 0 && !localSeen.has(String(n.id))).length

  return {
    badgeCount24h: todayUnreadCount,
    unreadCount: todayUnreadCount,
    totalUnreadCount,
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}

/**
 * Hook pour marquer une notification comme lue.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  const markRead = useCallback(
    async (notificationId: string | number) => {
      const idStr = String(notificationId)
      const current = getLocalSeenIds()
      current.add(idStr)
      saveLocalSeenIds(current)

      // Invalidation douce des caches de notifications pour actualiser l'affichage
      queryClient.invalidateQueries({ queryKey: ["notifications"] })

      // Appel au backend
      void markNotificationAsRead(notificationId)
    },
    [queryClient]
  )

  const markAllRead = useCallback(
    async (currentNotificationIds?: (string | number)[]) => {
      const current = getLocalSeenIds()
      for (const id of currentNotificationIds || []) {
        current.add(String(id))
      }
      saveLocalSeenIds(current)

      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      void markAllNotificationsAsRead()
    },
    [queryClient]
  )

  return {
    markRead,
    markAllRead,
  }
}

/**
 * Mutation pour envoyer une notification.
 */
export function useSendNotification() {
  return useMutation({
    mutationFn: (payload: SendNotificationPayload) => sendNotification(payload),
  })
}
