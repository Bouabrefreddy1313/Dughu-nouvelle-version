// ═══════════════════════════════════════════════════════════════════════════════
// FLASH SERVICE — Système de stories "Flash" (API Dughu, source de vérité unique)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Endpoints utilisés (documentés ici) :
//   - GET /getFriendsStories?user_id={userId}&per_page={perPage}&page={page}
//       → stories des amis / contacts pour le feed principal Flash (FlashFeed).
//   - GET /getUserStories?user_id={userId}&target_user_id={targetUserId}&per_page={perPage}&page={page}
//       → stories d'un utilisateur précis (profil / FlashViewer dédié).
//   - GET /media/download?path={filePath}
//       → résout/affiche le média d'une story quand seul le chemin fichier est reçu.
//
// À noter (non implémentés, prévoir points d'extension) :
//   - POST /createStory, DELETE /deleteStory, POST /viewStory, POST /likeStory,
//     POST /replyStory — endpoints non confirmés dans la collection Dughu, à
//     brancher plus tard une fois validés.
//
// ⚠️ Ce module est réservé aux routes API (il utilise `dughuApi`, côté serveur).
//    Ne pas l'importer dans un composant client.
// ═══════════════════════════════════════════════════════════════════════════════

import { dughu, dughuApi, mapStories, normalizeStory, resolveMediaUrl, resolveStoryMediaUrl } from "@/lib/dughu"

/** Pagination par défaut du rail Flash. */
export const FLASH_PAGE_SIZE = 20

export interface FlashPaginationOptions {
  /** Nombre d'éléments par page (paramètre `per_page`). */
  perPage?: number
  /** Numéro de page (paramètre `page`). */
  page?: number
}

export interface FlashPagination {
  page: number
  perPage: number
  total: number
  hasMore: boolean
}

export interface FlashStory {
  id: string
  userId: string
  image?: string
  video?: string
  text?: string
  bg?: string
  viewed: boolean
  createdAt: string
  user: {
    id: string
    name?: string | null
    username?: string | null
    avatar?: string | null
  } | null
}

/** Un utilisateur ayant au moins une story active (une entrée du rail Flash). */
export interface FlashUserStory {
  userId: string
  user: FlashStory["user"]
  /** Stories de cet utilisateur, triées de la plus récente à la plus ancienne. */
  stories: FlashStory[]
  /** Toutes les stories de l'utilisateur ont-elles été vues (statut API sinon null). */
  allViewed: boolean | null
}

/** Détermine si le plugin stories est actif (clé API configurée). */
export const flashEnabled = dughu.enabled

/** Récupère le "chemin fichier" brut d'une story si présent (fallback média). */
function pickPath(s: any): string {
  for (const k of ["path", "file_path", "filePath", "file", "media_path", "url", "media_url"]) {
    const v = s?.[k]
    if (v && typeof v === "string" && v.trim()) return v.trim()
    const sub = s?.media?.[k] || s?.media?.url
    if (sub && typeof sub === "string" && sub.trim()) return sub.trim()
  }
  return ""
}

function isImagePath(p: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg|avif|heic|jfif)(\?|#|$)/i.test(p)
}
function isVideoPath(p: string): boolean {
  return /\.(mp4|webm|mkv|mov|m4v|3gp|mpeg|avi|ogv|m3u8)(\?|#|$)/i.test(p)
}

/** Normalise un objet story (appelle normalizeStory et force la résolution média). */
function toFlashStory(raw: any): FlashStory | null {
  const m = normalizeStory(raw) || mapStories(raw)[0]
  if (!m) return null
  const rawPath = pickPath(raw)
  const image = m.image ? resolveStoryMediaUrl(m.image) : rawPath && isImagePath(rawPath) ? resolveStoryMediaUrl(rawPath) : undefined
  const video = m.video ? resolveStoryMediaUrl(m.video) : rawPath && isVideoPath(rawPath) ? resolveStoryMediaUrl(rawPath) : undefined
  return {
    id: String(m.id || ""),
    userId: String(m.userId || m.user?.id || ""),
    image,
    video,
    text: String(m.text || ""),
    bg: String(m.bg || ""),
    viewed: !!m.viewed,
    createdAt: String(m.createdAt || new Date().toISOString()),
    user: m.user
      ? {
          id: String(m.user.id || ""),
          name: m.user.name ?? null,
          username: m.user.username ?? null,
          avatar: m.user.avatar ? resolveMediaUrl(String(m.user.avatar)) : null,
        }
      : null,
  }
}

/** Extrait le tableau d'items d'une réponse Dughu (formes multiples). */
function itemsOf(raw: any): any[] {
  if (!raw || typeof raw !== "object") return []
  const unwrapped = raw?.result && typeof raw.result === "object" && !Array.isArray(raw.result) ? raw.result : raw
  const items: any[] = []
  for (const k of ["authStories", "auth_stories", "myStories", "my_stories", "userStories", "user_stories"]) {
    const list = unwrapped?.[k] || raw?.[k]
    if (Array.isArray(list)) items.push(...list)
  }
  const userStories = raw?.user?.stories || raw?.user?.data || unwrapped?.user?.stories || unwrapped?.user?.data
  if (Array.isArray(userStories)) items.push(...userStories)

  let arr = Array.isArray(unwrapped) ? unwrapped : unwrapped?.data || unwrapped?.stories || unwrapped?.items || unwrapped?.friends || unwrapped?.friendStories || []
  if (Array.isArray(arr)) items.push(...arr)

  return items
}

/** Extrait les métadonnées de pagination d'une réponse (si l'API les renvoie). */
function paginationOf(raw: any, page: number, perPage: number): FlashPagination {
  const meta = raw?.meta || raw?.pagination || raw?.pageInfo || raw?.result?.meta || {}
  const count = itemsOf(raw).length
  const total = Number(meta?.total ?? meta?.total_count ?? meta?.count ?? count) || count
  const lastPage = Number(meta?.last_page ?? meta?.lastPage ?? meta?.pages) || 1
  const hasMore = page < lastPage || !!meta?.has_more || count >= perPage
  return { page, perPage, total, hasMore }
}

/**
 * Récupère les stories des amis/contacts (feed principal des Flash).
 * Encapsule GET /getFriendsStories?user_id={userId}&per_page=…&page=….
 */
export async function fetchFriendsFlash(userId: string, opts: FlashPaginationOptions = {}): Promise<{
  users: FlashUserStory[]
  stories: FlashStory[]
  pagination: FlashPagination
}> {
  const perPage = opts.perPage || FLASH_PAGE_SIZE
  const page = opts.page || 1

  // Stories des amis (réponse brute de getFriendsStories) + MES propres
  // stories (getUserStories) pour que mes Flash apparaissent dans le rail.
  const raw = await dughuApi.getFriendsStories(userId, { perPage, page })
  const friendsItems = itemsOf(raw)
  const myRaw = await dughuApi.getUserStories(userId, userId, { perPage: 50, page: 1 }).catch(() => null)
  const myItems = myRaw ? itemsOf(myRaw) : []

  const storyItems = [...myItems, ...friendsItems]
  const stories = storyItems
    .map(toFlashStory)
    .filter((s): s is FlashStory => s !== null && !!s.id)

  // Passe mes propres stories en premier : l'utilisateur courant est le 1er du rail.
  const grouped = groupStoriesByUser(stories)
  const selfIndex = grouped.findIndex((g) => String(g.userId) === String(userId))
  let users = grouped
  if (selfIndex > 0) {
    const [self] = users.splice(selfIndex, 1)
    users = [self, ...users]
  }

  return { users, stories, pagination: paginationOf(raw, page, perPage) }
}

/**
 * Récupère les stories d'un utilisateur précis (profil / page story dédiée).
 * Encapsule GET /getUserStories?user_id={userId}&target_user_id={targetUserId}&per_page=…&page=….
 */
export async function fetchUserFlash(
  userId: string,
  targetUserId: string,
  opts: FlashPaginationOptions = {}
): Promise<{ stories: FlashStory[]; pagination: FlashPagination }> {
  const perPage = opts.perPage || FLASH_PAGE_SIZE
  const page = opts.page || 1
  const raw = await dughuApi.getUserStories(userId, targetUserId, { perPage, page })
  const stories = itemsOf(raw)
    .map(toFlashStory)
    .filter((s): s is FlashStory => s !== null && !!s.id)
  return { stories, pagination: paginationOf(raw, page, perPage) }
}

/**
 * Regroupe les stories par utilisateur ET déduit le statut "vu / non vu"
 * (si l'API le fournit via `viewed`/`is_viewed`, sinon null → état local du UI).
 */
export function groupStoriesByUser(stories: FlashStory[]): FlashUserStory[] {
  const map = new Map<string, FlashUserStory>()
  for (const s of stories) {
    const key = s.userId || s.id
    const entry = map.get(key) || { userId: key, user: s.user, stories: [], allViewed: null }
    entry.stories.push(s)
    map.set(key, entry)
  }
  const users: FlashUserStory[] = []
  for (const entry of map.values()) {
    entry.stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const flags = entry.stories.map((s) => s.viewed)
    entry.allViewed = flags.every((v) => v) ? true : flags.some((v) => !v) ? false : null
    users.push(entry)
  }
  return users
}

/* ──────────────────────────────────────────────────────────────────────────────
   POINTS D'EXTENSION — endpoints NON confirmés dans la collection Dughu.
   À brancher plus tard une fois les endpoints validés :
     POST /createStory, DELETE /deleteStory, POST /viewStory,
     POST /likeStory, POST /replyStory
   ────────────────────────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createStory(_payload: unknown): Promise<unknown> {
  // TODO: POST /createStory (non confirmé)
  return Promise.resolve({ success: false, message: "createStory non implémenté (endpoint non confirmé)" })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function deleteStory(_storyId: string): Promise<unknown> {
  // TODO: DELETE /deleteStory (non confirmé)
  return Promise.resolve({ success: false, message: "deleteStory non implémenté (endpoint non confirmé)" })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function markStoryViewed(_userId: string, _storyId: string): Promise<unknown> {
  // TODO: POST /viewStory (non confirmé)
  return Promise.resolve({ success: false })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function likeStory(_userId: string, _storyId: string): Promise<unknown> {
  // TODO: POST /likeStory (non confirmé)
  return Promise.resolve({ success: false })
}

// probe write ok
