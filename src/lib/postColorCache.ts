// Cache mémoire (session navigateur) des couleurs de posts.
// Plus de localStorage : les données de session sont éphémères, perdues au
// refresh, et les sources de vérité sont les endpoints API Dughu.
const colors: Record<string, string> = {}

export function readPostColors(): Record<string, string> {
  return colors
}

export function writePostColor(postId: string, color: string) {
  colors[postId] = color
}

export function resetPostColors() {
  for (const k of Object.keys(colors)) delete colors[k]
}
