"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchNotifications } from "@/services/notifications/notifications.service"
import type { NotificationItem, NotificationsResponse } from "@/types/notifications/notification.types"
import { notificationSound } from "@/lib/audio/notification-sound"
import { getNotificationPreferences } from "@/lib/notifications/notification-preferences"
import { usePushNotifications } from "./use-push-notifications"

export function useInAppNotifications(userId?: string) {
  const [activeBanner, setActiveBanner] = useState<NotificationItem | null>(null)
  const bannerQueueRef = useRef<NotificationItem[]>([])
  const isInitializedRef = useRef(false)
  const knownIdsRef = useRef<Set<string>>(new Set())

  const { sendSystemNotification } = usePushNotifications()

  // Polling régulier toutes les 15 secondes pour les nouvelles notifications
  const { data } = useQuery<NotificationsResponse>({
    queryKey: ["notifications", "in-app-stream", userId || ""],
    queryFn: () => fetchNotifications({ filter: "all", page: 1, userId: userId || "" }),
    enabled: !!userId && userId !== "0",
    refetchInterval: 15_000,
    staleTime: 5_000,
  })

  // Traitement de la file d'attente des bannières in-app
  const showNextBanner = useCallback(() => {
    if (bannerQueueRef.current.length > 0) {
      const next = bannerQueueRef.current.shift()!
      setActiveBanner(next)
    } else {
      setActiveBanner(null)
    }
  }, [])

  const dismissBanner = useCallback(() => {
    setActiveBanner(null)
    // Légère pause avant d'afficher la suivante si plusieurs sont arrivées en même temps
    setTimeout(() => {
      showNextBanner()
    }, 300)
  }, [showNextBanner])

  // Détection des nouvelles notifications
  useEffect(() => {
    if (!data?.notifications) return

    const notifications = data.notifications

    // 1er chargement : on mémorise tous les IDs existants pour ne pas spammer avec les anciennes notifs
    if (!isInitializedRef.current) {
      for (const n of notifications) {
        knownIdsRef.current.add(String(n.id))
      }
      isInitializedRef.current = true
      return
    }

    const prefs = getNotificationPreferences()
    const newItems: NotificationItem[] = []

    for (const n of notifications) {
      const idStr = String(n.id)
      if (!knownIdsRef.current.has(idStr)) {
        knownIdsRef.current.add(idStr)
        // Seules les notifications non lues déclenchent une alerte
        if (n.seen === 0) {
          newItems.push(n)
        }
      }
    }

    if (newItems.length === 0) return

    // Jouer le son d'alerte si activé
    if (prefs.soundEnabled) {
      notificationSound.play()
    }

    // Traitement selon la visibilité de l'onglet
    for (const item of newItems) {
      if (document.hidden) {
        // L'onglet est masqué ou minimisé -> notification système OS / Push
        void sendSystemNotification({
          id: item.id,
          title: item.title || item.notifier.fullName || "Dughu",
          body: item.text,
          icon: item.notifier.avatar || "/images/favicon.png",
          url: item.url,
        })
      } else if (prefs.inAppEnabled) {
        // L'onglet est au premier plan -> ajout à la file In-App
        bannerQueueRef.current.push(item)
      }
    }

    // Afficher la première bannière si aucune n'est active
    if (!activeBanner && bannerQueueRef.current.length > 0) {
      showNextBanner()
    }
  }, [data, activeBanner, showNextBanner, sendSystemNotification])

  return {
    activeBanner,
    dismissBanner,
  }
}
