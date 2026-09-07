// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES PARTAGEES — DUGHU
// ═══════════════════════════════════════════════════════════════════════════════

import { Globe, Network, Rss, UserCheck } from "lucide-react"

// ── Confidentialité des publications ──────────────────────────────────────────

export interface PostPrivacyOption {
  id: 0 | 1 | 2 | 3
  label: string
  hint: string
  /** Infobulle affichée sur le badge d'un post. */
  title: string
  icon: typeof Globe
}

/**
 * Les 4 niveaux de confidentialité Dughu avec une icône DISTINCTE par niveau
 * (Globe = Public, Rss = Abonnés, Network = Réseau, UserCheck = Amis).
 * Utilisé par le sélecteur du composer ET le badge des publications pour
 * éviter que Abonnés / Réseau / Amis partagent la même icône « groupe ».
 */
export const POST_PRIVACY_OPTIONS: PostPrivacyOption[] = [
  {
    id: 0,
    label: "Public",
    hint: "Tout le monde peut voir",
    title: "Visible par tout le monde",
    icon: Globe,
  },
  {
    id: 1,
    label: "Abonnés",
    hint: "Amis acceptés et abonnés",
    title: "Visible par vos abonnés",
    icon: Rss,
  },
  {
    id: 2,
    label: "Réseau",
    hint: "Réseau uniquement",
    title: "Visible par votre réseau",
    icon: Network,
  },
  {
    id: 3,
    label: "Amis",
    hint: "Amis acceptés uniquement",
    title: "Visible par vos amis uniquement",
    icon: UserCheck,
  },
] as const

// ── Reactions ─────────────────────────────────────────────────────────────────

/** Mapping ID de reaction → type API (utilise pour les appels API) */
// Mapping étendu d'IDs de réaction retournés par l'API Dughu vers les types canoniques
export const REACTION_ID_TO_TYPE: Record<number, string> = {
  1: "like",
  2: "love",
  3: "haha",
  4: "wow",
  5: "sad",
  6: "angry",
  // IDs alternatifs parfois retournés par l'API Dughu
  11: "haha",
  12: "love",
  13: "wow",
  14: "sad",
  15: "angry",
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
  { id: 2, name: "J'adore", icon: "❤️" },
  { id: 3, name: "Haha", icon: "😂" },
  { id: 4, name: "Wow", icon: "😮" },
  { id: 5, name: "Triste", icon: "😢" },
  { id: 6, name: "Grrr", icon: "😡" },
] as const

/** Aliases connus pour normaliser toute variante issue de l'API Dughu ou de la base */
const REACTION_ALIASES: Record<string, string> = {
  like: "like",
  jaime: "like",
  "j'aime": "like",
  pouce: "like",
  thumb: "like",
  thumbs_up: "like",
  love: "love",
  jadore: "love",
  "j'adore": "love",
  coeur: "love",
  heart: "love",
  aimer: "love",
  haha: "haha",
  rire: "haha",
  laugh: "haha",
  lol: "haha",
  mdr: "haha",
  wow: "wow",
  ouah: "wow",
  surpris: "wow",
  surprise: "wow",
  sad: "sad",
  triste: "sad",
  pleure: "sad",
  cry: "sad",
  angry: "angry",
  grrr: "angry",
  colere: "angry",
  colère: "angry",
  enerve: "angry",
  enervé: "angry",
  énervé: "angry",
  rage: "angry",
}

/**
 * Normalise toute valeur de réaction (id numérique, chaîne "1", nom "love", alias "heart" / "grrr" ou objet `{ id, name }`)
 * vers le type canonique ("like" | "love" | "haha" | "wow" | "sad" | "angry").
 */
export function normalizeReactionType(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>
    const fromId = normalizeReactionType(obj.id ?? obj.reaction_id ?? obj.reactionId ?? obj.reaction)
    if (fromId) return fromId
    const fromName = normalizeReactionType(obj.name ?? obj.type ?? obj.reaction_type)
    if (fromName) return fromName
    return null
  }
  if (typeof raw === "number") {
    return REACTION_ID_TO_TYPE[raw] || null
  }
  const s = String(raw).toLowerCase().trim()
  if (!s) return null
  if (/^\d+$/.test(s)) {
    const num = Number(s)
    return REACTION_ID_TO_TYPE[num] || null
  }
  return REACTION_ALIASES[s] || (["like", "love", "haha", "wow", "sad", "angry"].includes(s) ? s : null)
}

/**
 * Récupère les métadonnées (icône/emoji et nom lisible) d'un type de réaction.
 */
export function getReactionMeta(typeOrId: unknown): { id: number; name: string; icon: string; type: string } | null {
  const normType = normalizeReactionType(typeOrId)
  if (!normType) return null
  const id = REACTION_TYPE_TO_ID[normType] || 1
  const def = REACTIONS.find((r) => r.id === id) || REACTIONS[0]
  return {
    id: def.id,
    name: def.name,
    icon: def.icon,
    type: normType,
  }
}

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

// ── Mapping ID couleur Dughu → code CSS (source: GET /getPostColors) ────────
// Les IDs correspondent aux couleurs créées dans l'API Dughu.
// Référence unique : à utiliser dans tout le projet (posts, stories, flash).
export const COLOR_ID_TO_CSS: Record<string, { bg: string; text: string }> = {
  "17": { bg: "linear-gradient(135deg, #98b262, #66a399)", text: "#000000" },
  "18": { bg: "#000000", text: "#ffffff" },
  "19": { bg: "linear-gradient(135deg, #ffb0ff, #8080c0)", text: "#000000" },
  "24": { bg: "linear-gradient(135deg, #0000ff, #00ff00)", text: "#ffffff" },
  "25": { bg: "linear-gradient(135deg, #4e26ff, #ff0000)", text: "#000000" },
  "27": { bg: "linear-gradient(135deg, #ff0fff, #8080c0)", text: "#000000" },
  "30": { bg: "linear-gradient(135deg, #ffff00, #8080c0)", text: "#000000" },
  "31": { bg: "linear-gradient(135deg, #e8670c, #ffffff)", text: "#000000" },
  "32": { bg: "linear-gradient(135deg, #ff3dff, #ffffff)", text: "#000000" },
  "33": { bg: "linear-gradient(135deg, #91ff3d, #ff00ff)", text: "#000000" },
  "38": { bg: "linear-gradient(135deg, #ccb38d, #cfb391)", text: "#695366" },
  "34": { bg: "linear-gradient(135deg, #ccb38d, #ffffff)", text: "#000000" },
}

/**
 * Résout une valeur brute de couleur de post en son équivalent CSS.
 * Accepte tous les formats rencontrés :
 *  - Objet Dughu { color_1, color_2, text_color } → dégradé ou uni + couleur texte
 *  - ID numérique Dughu (string "17", number 17) → mapping COLOR_ID_TO_CSS
 *  - Chaîne hexadécimale ("#ff0000") → retournée telle quelle
 *  - Dégradé CSS ("linear-gradient(...)") → retourné tel quel
 *  - Chaîne JSON contenant { bg, text } → parsée et résolue
 *  - null / undefined / vide → null
 *
 * Retourne { bg: string, text: string } | null
 */
export function resolvePostColorCss(raw: unknown): { bg: string; text: string } | null {
  if (raw === null || raw === undefined || raw === "") return null

  // Normalise en objet exploitable (gère le cas string JSON ET le cas objet natif)
  let obj: Record<string, unknown> | null = null

  if (typeof raw === "object" && raw !== null) {
    obj = raw as Record<string, unknown>
  } else if (typeof raw === "string") {
    const value = raw.trim()
    if (!value) return null

    // ID numérique Dughu → mapping centralisé
    if (/^\d+$/.test(value)) {
      const entry = COLOR_ID_TO_CSS[value]
      return entry ? { ...entry } : { bg: value, text: "#ffffff" }
    }

    // Déjà un dégradé CSS ou une couleur hexadécimale
    if (value.startsWith("#") || value.startsWith("linear-gradient") || value.startsWith("radial-gradient")) {
      return { bg: value, text: "#ffffff" }
    }

    // Tente de parser comme JSON
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === "number") {
        const entry = COLOR_ID_TO_CSS[String(parsed)]
        return entry ? { ...entry } : { bg: String(parsed), text: "#ffffff" }
      }
      if (parsed && typeof parsed === "object") {
        obj = parsed as Record<string, unknown>
      }
    } catch {
      // Pas du JSON valide → fallback comme hex/string
      return { bg: value, text: "#ffffff" }
    }
  } else if (typeof raw === "number") {
    const entry = COLOR_ID_TO_CSS[String(raw)]
    return entry ? { ...entry } : { bg: String(raw), text: "#ffffff" }
  }

  // ── On a un objet : essaye les formats supportés ──
  if (obj) {
    // Format 1 : { bg, text } déjà construit
    if (obj.bg || obj.background) {
      return {
        bg: String(obj.bg || obj.background || ""),
        text: String(obj.text || obj.textColor || "#ffffff"),
      }
    }

    // Format 2 : { color_1, color_2, text_color } — format natif API Dughu
    const color1 = String(obj.color_1 || obj.color1 || "")
    const color2 = String(obj.color_2 || obj.color2 || "")
    const textColor = String(obj.text_color || obj.textColor || "#ffffff")

    if (color1 || color2) {
      // Détecter si color_2 est un chemin d'image
      const isImage =
        !!color2 &&
        !color2.startsWith("#") &&
        (color2.includes("/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i.test(color2))

      if (isImage) {
        return { bg: color2, text: textColor }
      }

      if (color1 && color2) {
        return { bg: `linear-gradient(135deg, ${color1}, ${color2})`, text: textColor }
      }

      if (color1) {
        return { bg: color1, text: textColor }
      }
    }
  }

  return null
}
