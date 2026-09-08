/**
 * Gestion des préférences locales de notification pour Dughu.
 *
 * Permet à l'utilisateur de configurer finement les notifications In-App, Push et Sonores.
 */

export interface NotificationPreferences {
  inAppEnabled: boolean
  pushEnabled: boolean
  soundEnabled: boolean
  promptDismissed: boolean
}

const STORAGE_KEY = "dughu_notification_preferences"

const DEFAULT_PREFERENCES: NotificationPreferences = {
  inAppEnabled: true,
  pushEnabled: true,
  soundEnabled: true,
  promptDismissed: false,
}

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(raw)
    return {
      inAppEnabled: parsed.inAppEnabled ?? true,
      pushEnabled: parsed.pushEnabled ?? true,
      soundEnabled: parsed.soundEnabled ?? true,
      promptDismissed: parsed.promptDismissed ?? false,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function saveNotificationPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES
  try {
    const current = getNotificationPreferences()
    const updated = { ...current, ...prefs }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event("dughu_notification_prefs_changed"))
    return updated
  } catch {
    return DEFAULT_PREFERENCES
  }
}
