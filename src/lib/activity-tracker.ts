/**
 * Traqueur d'activités utilisateur récentes côté client (Dughu).
 * 
 * Permet de capturer et d'afficher immédiatement les publications, likes,
 * commentaires et autres actions dans la section « Dernière activité » de la
 * RightSidebar, même avant que l'API externe ne les ait persistées.
 */

export interface TrackedActivityItem {
  id: string
  activityType: "post" | "reaction" | "comment" | "repost" | "share" | "follow"
  postId?: string | null
  description?: string
  createdAt: string
  user?: {
    id?: string
    name?: string | null
    avatar?: string | null
    username?: string | null
  } | null
}

const STORAGE_KEY_PREFIX = "dughu_recent_activities_"
const EVENT_NAME = "dughu:activity-updated"

export function getLocalActivities(userId?: string | null): TrackedActivityItem[] {
  if (typeof window === "undefined") return []
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId || "current"}`
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function recordUserActivity(
  activity: {
    activityType: "post" | "reaction" | "comment" | "repost" | "share" | "follow"
    postId?: string | number | null
    description?: string
    user?: {
      id?: string | number
      name?: string | null
      avatar?: string | null
      username?: string | null
    } | null
  },
  userId?: string | null
): TrackedActivityItem | null {
  if (typeof window === "undefined") return null
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId || "current"}`
    const existing = getLocalActivities(userId)

    const newItem: TrackedActivityItem = {
      id: `local-${activity.activityType}-${activity.postId || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      activityType: activity.activityType,
      postId: activity.postId ? String(activity.postId) : null,
      description: activity.description || "",
      createdAt: new Date().toISOString(),
      user: activity.user
        ? {
            id: activity.user.id ? String(activity.user.id) : undefined,
            name: activity.user.name ?? null,
            avatar: activity.user.avatar ?? null,
            username: activity.user.username ?? null,
          }
        : null,
    }

    // Éviter les doublons exacts récents (même postId et même type sous 30 secondes)
    const filtered = existing.filter(
      (a) =>
        !(
          a.postId === newItem.postId &&
          a.activityType === newItem.activityType &&
          Math.abs(new Date(a.createdAt).getTime() - new Date(newItem.createdAt).getTime()) < 30000
        )
    )

    const updated = [newItem, ...filtered].slice(0, 20)
    localStorage.setItem(key, JSON.stringify(updated))

    // Notifier immédiatement les composants abonnés (RightSidebar, etc.)
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: newItem }))
    return newItem
  } catch {
    return null
  }
}

export function subscribeToActivities(callback: (activity: TrackedActivityItem) => void): () => void {
  if (typeof window === "undefined") return () => {}
  const handler = (e: Event) => {
    const custom = e as CustomEvent<TrackedActivityItem>
    if (custom?.detail) {
      callback(custom.detail)
    }
  }
  window.addEventListener(EVENT_NAME, handler)
  return () => {
    window.removeEventListener(EVENT_NAME, handler)
  }
}
