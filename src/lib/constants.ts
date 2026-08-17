// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES PARTAGEES — DUGHU
// ═══════════════════════════════════════════════════════════════════════════════

// ── Reactions ─────────────────────────────────────────────────────────────────

/** Mapping ID de reaction → type API (utilise pour les appels API) */
export const REACTION_ID_TO_TYPE: Record<number, string> = {
  1: "like",
  2: "love",
  3: "haha",
  4: "wow",
  5: "sad",
  6: "angry",
}

/** Mapping type API → ID de reaction */
export const REACTION_TYPE_TO_ID: Record<string, number> = {
  like: 1,
  love: 2,
  haha: 3,
  wow: 4,
  sad: 5,
  angry: 6,
}

/** Definition des 6 reactions disponibles (picker, toasts, icones) */
export const REACTIONS = [
  { id: 1, name: "J'aime", icon: "👍" },
  { id: 2, name: "J'adore", icon: "😍" },
  { id: 3, name: "Haha", icon: "🤣" },
  { id: 4, name: "Wow", icon: "🤩" },
  { id: 5, name: "Triste", icon: "🥺" },
  { id: 6, name: "Grrr", icon: "😤" },
] as const

// ── Couleurs de fond pour les publications ────────────────────────────────────

export const POST_COLORS = [
  { bg: "linear-gradient(45deg, #ff9a9e 0%, #fecfef 100%)", text: "#fff" },
  { bg: "linear-gradient(45deg, #a18cd1 0%, #fbc2eb 100%)", text: "#fff" },
  { bg: "linear-gradient(45deg, #84fab0 0%, #8fd3f4 100%)", text: "#fff" },
  { bg: "#B87333", text: "#fff" },
  { bg: "linear-gradient(45deg, #ffecd2 0%, #fcb69f 100%)", text: "#333" },
  { bg: "linear-gradient(45deg, #667eea 0%, #764ba2 100%)", text: "#fff" },
  { bg: "#F5C33B", text: "#333" },
  { bg: "linear-gradient(45deg, #f093fb 0%, #f5576c 100%)", text: "#fff" },
  { bg: "linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)", text: "#fff" },
  { bg: "#333", text: "#fff" },
  { bg: "linear-gradient(45deg, #43e97b 0%, #38f9d7 100%)", text: "#333" },
  { bg: "linear-gradient(45deg, #fa709a 0%, #fee140 100%)", text: "#fff" },
] as const
