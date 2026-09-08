"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/notifications/notification-preferences"

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [prefs, setPrefs] = useState(getNotificationPreferences())

  // Détection du support et initialisation
  useEffect(() => {
    if (typeof window === "undefined") return

    const supported = "serviceWorker" in navigator && "Notification" in window
    setIsSupported(supported)

    if ("Notification" in window) {
      setPermission(Notification.permission)
    }

    if (supported) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          setRegistration(reg)
        })
        .catch((err) => {
          console.warn("[Push] Enregistrement du service worker échoué:", err)
        })
    }

    const onPrefsChange = () => setPrefs(getNotificationPreferences())
    window.addEventListener("dughu_notification_prefs_changed", onPrefsChange)
    return () => window.removeEventListener("dughu_notification_prefs_changed", onPrefsChange)
  }, [])

  // Demande de permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!("Notification" in window)) return "denied"

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === "granted") {
        saveNotificationPreferences({ pushEnabled: true, promptDismissed: true })
      } else if (result === "denied") {
        saveNotificationPreferences({ pushEnabled: false, promptDismissed: true })
      }
      return result
    } catch (err) {
      console.error("[Push] Erreur lors de la demande de permission:", err)
      return "denied"
    }
  }, [])

  // Rejet ou fermeture du bandeau d'invitation
  const dismissPrompt = useCallback(() => {
    saveNotificationPreferences({ promptDismissed: true })
  }, [])

  // Envoi d'une notification système native (OS / Navigateur)
  const sendSystemNotification = useCallback(
    async (params: {
      title: string
      body: string
      icon?: string
      url?: string
      id?: string | number
    }) => {
      if (!isSupported || permission !== "granted" || !prefs.pushEnabled) return

      const title = params.title || "Dughu"
      const options: NotificationOptions = {
        body: params.body,
        icon: params.icon || "/images/favicon.png",
        badge: "/images/favicon.png",
        data: {
          url: params.url || "/home",
          id: params.id,
        },
        tag: params.id ? `dughu-${params.id}` : "dughu-notification",
      }

      try {
        if (registration && "showNotification" in registration) {
          await registration.showNotification(title, options)
        } else if ("Notification" in window) {
          const notif = new Notification(title, options)
          notif.onclick = () => {
            window.focus()
            if (params.url) {
              window.location.href = params.url
            }
            notif.close()
          }
        }
      } catch (err) {
        console.warn("[Push] Impossible d'afficher la notification système:", err)
      }
    },
    [isSupported, permission, prefs.pushEnabled, registration]
  )

  const showPrompt =
    isSupported &&
    permission === "default" &&
    !prefs.promptDismissed

  return {
    isSupported,
    permission,
    requestPermission,
    dismissPrompt,
    sendSystemNotification,
    showPrompt,
    preferences: prefs,
  }
}
