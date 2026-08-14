const STORAGE_KEY = "dughu_my_reactions"

export function readMyReactions(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function writeMyReactions(reactions: Record<string, string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reactions))
  } catch {
    /* silent */
  }
}
