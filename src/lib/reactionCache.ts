// Cache mémoire (session navigateur) des réactions "mes likes".
// Plus de localStorage : les données de session sont éphémères et les sources
// de vérité sont les endpoints API Dughu (toggleLikePost, getCommentReactions...).
const reactions: Record<string, string> = {}

export function readMyReactions(): Record<string, string> {
  return reactions
}

export function writeMyReactions(updated: Record<string, string>) {
  for (const [k, v] of Object.entries(updated)) {
    if (v === null || v === undefined || v === "") delete reactions[k]
    else reactions[k] = v
  }
}

export function resetMyReactions() {
  for (const k of Object.keys(reactions)) delete reactions[k]
}
