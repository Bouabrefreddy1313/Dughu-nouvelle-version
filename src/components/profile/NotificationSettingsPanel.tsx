"use client"

import { useState, useEffect } from "react"
import { Bell, Volume2, Monitor, Check, AlertCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications/notification-preferences"
import { usePushNotifications } from "@/hooks/notifications/use-push-notifications"
import { notificationSound } from "@/lib/audio/notification-sound"

export function NotificationSettingsPanel() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(getNotificationPreferences())
  const { isSupported, permission, requestPermission } = usePushNotifications()

  useEffect(() => {
    const onPrefsChange = () => setPrefs(getNotificationPreferences())
    window.addEventListener("dughu_notification_prefs_changed", onPrefsChange)
    return () => window.removeEventListener("dughu_notification_prefs_changed", onPrefsChange)
  }, [])

  const handleToggleInApp = (checked: boolean) => {
    const updated = saveNotificationPreferences({ inAppEnabled: checked })
    setPrefs(updated)
  }

  const handleToggleSound = (checked: boolean) => {
    const updated = saveNotificationPreferences({ soundEnabled: checked })
    setPrefs(updated)
    if (checked) {
      notificationSound.play()
    }
  }

  const handleTogglePush = async (checked: boolean) => {
    if (checked && permission !== "granted") {
      const result = await requestPermission()
      if (result === "granted") {
        const updated = saveNotificationPreferences({ pushEnabled: true })
        setPrefs(updated)
      }
    } else {
      const updated = saveNotificationPreferences({ pushEnabled: checked })
      setPrefs(updated)
    }
  }

  return (
    <div className="mt-6 space-y-4 max-w-xl">
      {/* 1. Notifications In-App */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#985810]/10 text-[#985810] mt-0.5">
            <Bell size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1C1E21] dark:text-[#F3F4F6]">
              Bannières In-App en direct
            </h4>
            <p className="text-xs text-[#65676B] dark:text-[#A1A1AA] mt-1 leading-relaxed">
              Affiche une alerte flottante interactive lorsque vous êtes connecté sur Dughu et qu&apos;une personne réagit ou commente.
            </p>
          </div>
        </div>
        <Switch
          checked={prefs.inAppEnabled}
          onCheckedChange={handleToggleInApp}
          aria-label="Activer les bannières In-App"
        />
      </div>

      {/* 2. Notifications Push (Système / Navigateur) */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 mt-0.5">
            <Monitor size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#1C1E21] dark:text-[#F3F4F6]">
                Notifications Push du navigateur
              </h4>
              {permission === "granted" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  <Check size={10} />
                  Autorisé
                </span>
              )}
            </div>
            <p className="text-xs text-[#65676B] dark:text-[#A1A1AA] mt-1 leading-relaxed">
              Recevez les alertes du système même lorsque votre navigateur est minimisé ou que l&apos;écran est en veille.
            </p>
            {!isSupported && (
              <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                Les notifications push ne sont pas supportées par ce navigateur.
              </p>
            )}
            {permission === "denied" && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                Notifications bloquées dans les paramètres de votre navigateur.
              </p>
            )}
          </div>
        </div>
        <Switch
          disabled={!isSupported || permission === "denied"}
          checked={prefs.pushEnabled && permission === "granted"}
          onCheckedChange={handleTogglePush}
          aria-label="Activer les notifications push"
        />
      </div>

      {/* 3. Son de notification */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 mt-0.5">
            <Volume2 size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1C1E21] dark:text-[#F3F4F6]">
              Sonnerie discrète
            </h4>
            <p className="text-xs text-[#65676B] dark:text-[#A1A1AA] mt-1 leading-relaxed">
              Joue un carillon doux lors de l&apos;arrivée d&apos;une nouvelle notification In-App.
            </p>
          </div>
        </div>
        <Switch
          checked={prefs.soundEnabled}
          onCheckedChange={handleToggleSound}
          aria-label="Activer la sonnerie discrète"
        />
      </div>
    </div>
  )
}
