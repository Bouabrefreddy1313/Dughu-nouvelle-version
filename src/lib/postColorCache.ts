const STORAGE_KEY = "dughu_post_colors"

/**
 * Lecture du cache local des couleurs de posts.
 * L'API Dughu n'enregistrant pas la couleur d'un post, on la mémorise
 * côté client par id de post pour pouvoir l'afficher.
 */
export function readPostColors(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  } catch {
    return {}
  }
}

export function writePostColor(postId: string, color: string) {
  const map = readPostColors()
  map[postId] = color
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* silencieux */
  }
}
