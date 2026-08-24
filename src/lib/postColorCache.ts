// Cache persistant (localStorage) des couleurs de posts.
// L'API Dughu ne renvoie pas toujours la couleur dans les posts (ex. POST /post
// accepte color_1/color_2/text_color mais ne les restitue pas dans GET /posts).
// On persiste donc côté client pour que le fond coloré survive au refresh.
const STORAGE_KEY = "dughu_post_colors"

function loadFromStorage(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToStorage(colors: Record<string, string>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
  } catch {
    // localStorage plein ou désactivé : on ignore
  }
}

let colors: Record<string, string> | null = null

function ensureLoaded(): Record<string, string> {
  if (!colors) colors = loadFromStorage()
  return colors
}

export function readPostColors(): Record<string, string> {
  return ensureLoaded()
}

export function writePostColor(postId: string, color: string) {
  const c = ensureLoaded()
  c[postId] = color
  saveToStorage(c)
}

export function resetPostColors() {
  colors = {}
  saveToStorage({})
}
