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

import { dughu, dughuApi, mapStories, normalizeStory, normalizeUser, pick, resolveMediaUrl, resolveStoryMediaUrl, DughuApiError } from "@/lib/dughu"

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
  thumbnail?: string
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

  // `normalizeStory` place les champs génériques (`file`, `postFile`, `media`)
  // dans `image`, même si le fichier est en réalité une vidéo. On déduit donc
  // le vrai type par l'extension pour éviter qu'une vidéo soit traitée comme
  // une image (ce qui affichait « Flash sans contenu visible »).
  const imageUrl = m.image ? resolveStoryMediaUrl(m.image) : ""
  const videoUrl = m.video ? resolveStoryMediaUrl(m.video) : ""
  const pathUrl = rawPath ? resolveStoryMediaUrl(rawPath) : ""
  const thumbRaw = pick(raw, ["thumbnail", "thumb", "story_thumbnail", "storyThumb", "video_thumb", "videoThumb", "poster", "thumbnail_url", "thumb_url", "cover"])
  const thumbUrl = thumbRaw ? resolveStoryMediaUrl(String(thumbRaw)) : ""

  let image: string | undefined
  let video: string | undefined
  let thumbnail: string | undefined

  if (isVideoPath(videoUrl) || isVideoPath(imageUrl) || isVideoPath(pathUrl)) {
    video = isVideoPath(videoUrl) ? videoUrl : isVideoPath(imageUrl) ? imageUrl : pathUrl
  }
  if (isImagePath(imageUrl) || isImagePath(videoUrl) || isImagePath(pathUrl)) {
    image = isImagePath(imageUrl) ? imageUrl : isImagePath(videoUrl) ? videoUrl : pathUrl
  }

  // Vignette dédiée fournie par l'API (uniquement utile pour une vidéo).
  // On ne l'applique que si la story est bien une vidéo, pour ne pas écraser
  // l'image d'un flash image.
  if (video && isImagePath(thumbUrl)) thumbnail = thumbUrl

  // Si une image accompagne une vidéo, c'est en réalité son thumbnail : on la
  // sort de `image` pour ne pas casser la détection vidéo du visualiseur.
  if (video && image) {
    if (!thumbnail) thumbnail = image
    image = undefined
  }

  // Repli : média sans extension reconnue → on le place là où il était déclaré.
  if (!image && !video && !thumbnail) {
    if (videoUrl) video = videoUrl
    else if (imageUrl) image = imageUrl
    else if (pathUrl) image = pathUrl
  }

  return {
    id: String(m.id || ""),
    userId: String(m.userId || m.user?.id || ""),
    image,
    video,
    thumbnail,
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

/** Aplatit les entrées : si un item contient un tableau `stories` imbriqué
 * (ou `{ user: { stories: [...] } }` renvoyé par getFriendsStories), on propage
 * ses stories à plat en héritant les infos user / user_id du parent. */
function flattenNested(rawItems: any[]): any[] {
  const out: any[] = []
  for (const it of rawItems) {
    if (!it || typeof it !== "object") continue
    const userObj = it.user && typeof it.user === "object" ? it.user : null
    const nested =
      it?.stories ?? it?.items ?? it?.data ??
      userObj?.stories ?? userObj?.items ?? userObj?.data
    if (Array.isArray(nested) && nested.length) {
      for (const child of nested) {
        if (!child || typeof child !== "object") continue
        // Le parent est souvent { user_id, user, stories } OU { user: { stories } }
        // (getFriendsStories) ; on hérite les infos si l'enfant n'a pas les siennes.
        const merged = { ...child }
        if (userObj && !merged.user) merged.user = it.user
        if (!merged.user && it.user) merged.user = it.user
        if (userObj && !merged.user_id && !merged.userId && (userObj.user_id || userObj.userId || userObj.id)) {
          merged.user_id = userObj.user_id || userObj.userId || userObj.id
        }
        if (!merged.user_id && !merged.userId && (it.user_id || it.userId || it.id)) {
          merged.user_id = it.user_id || it.userId || it.id
        }
        if (!merged.id && (it.id || it.story_id || it.storyId)) {
          merged.id = it.id || it.story_id || it.storyId
        }
        out.push(merged)
      }
    } else {
      out.push(it)
    }
  }
  return out
}

/** Extrait le tableau d'items d'une réponse Dughu (formes multiples). */
function itemsOf(raw: any): any[] {
  if (!raw || typeof raw !== "object") return []
  const unwrapped = raw?.result && typeof raw.result === "object" && !Array.isArray(raw.result) ? raw.result : raw
  const items: any[] = []
  const seenRefs = new Set<object>()

  const pushAll = (list: any[]) => {
    for (const it of list) {
      if (it && typeof it === "object") {
        if (seenRefs.has(it)) continue // même référence déjà collectée
        seenRefs.add(it)
      }
      items.push(it)
    }
  }

  // Clés connues porteuses d'un tableau de stories.
  const arrayKeys = [
    "authStories", "auth_stories", "myStories", "my_stories",
    "userStories", "user_stories", "friendsStories", "friends_stories",
    "friendStories", "friend_stories", "stories", "data", "items",
    "users", "friends", "contacts", "storiesByUser", "storyList", "list",
  ]
  for (const k of arrayKeys) {
    const list = unwrapped?.[k] ?? raw?.[k] ?? raw?.data?.[k]
    if (Array.isArray(list)) pushAll(list)
  }

  // Objet mappé par userId : { stories: { "28341": [...], "28342": [...] } }
  // ou directement { "28341": [...], "28342": [...] }.
  const mapKeys = ["stories", "data", "items", "users", "friends", "storiesByUser", "byUser"]
  for (const k of mapKeys) {
    const map = unwrapped?.[k] ?? raw?.[k]
    if (map && typeof map === "object" && !Array.isArray(map)) {
      for (const val of Object.values(map)) {
        if (Array.isArray(val)) pushAll(val)
      }
    }
  }

  const userStories = raw?.user?.stories || raw?.user?.data || unwrapped?.user?.stories || unwrapped?.user?.data
  if (Array.isArray(userStories)) pushAll(userStories)

  // Repli final : uniquement si aucune clé connue n'a produit d'items.
  if (items.length === 0) {
    const arr = Array.isArray(unwrapped) ? unwrapped : (unwrapped?.data || unwrapped?.stories || unwrapped?.items || unwrapped?.friends || unwrapped?.friendStories || [])
    if (Array.isArray(arr)) pushAll(arr)
  }

  return flattenNested(items)
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

/** Déduplique les stories par id (getFriendsStories renvoie aussi MES stories
 * dans `authStories`, qui dupliquent celles de getUserStories). */
function dedupeStories(stories: FlashStory[]): FlashStory[] {
  const seen = new Set<string>()
  const out: FlashStory[] = []
  for (const s of stories) {
    if (!s.id || seen.has(s.id)) continue
    seen.add(s.id)
    out.push(s)
  }
  return out
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
  const stories = dedupeStories(
    storyItems
      .map(toFlashStory)
      .filter((s): s is FlashStory => s !== null && !!s.id)
  )

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

  // L'endpoint getUserStories ne renvoie pas toujours les infos de l'auteur
  // (user absent des items). On récupère alors le profil Dughu de la cible une
  // seule fois et on l'attache aux stories pour que le FlashViewer affiche bien
  // le nom et la photo de profil de la personne qui a publié le Flash.
  if (stories.length > 0) {
    const firstUser = stories[0]?.user
    const needsProfile =
      !firstUser ||
      !firstUser.name ||
      firstUser.name === "Utilisateur" ||
      !firstUser.avatar ||
      firstUser.avatar === "/images/avatar.png"
    if (needsProfile) {
      try {
        const targetRaw = await dughuApi.getUser(targetUserId, userId)
        const target = normalizeUser(
          targetRaw?.result && typeof targetRaw.result === "object" && !Array.isArray(targetRaw.result)
            ? targetRaw.result
            : targetRaw
        )
        if (target && (target.name || target.avatar)) {
          // Ne propage que des infos utiles : on n'écrase pas un vrai nom/avatar
          // déjà fourni par l'API stories, mais on remplace les valeurs vides
          // ou génériques (placeholder) par celles du profil Dughu.
          const resolvedName =
            target.name && target.name !== "Utilisateur" ? target.name : undefined
          const resolvedAvatar =
            target.avatar && target.avatar !== "/images/avatar.png" ? target.avatar : undefined
          if (resolvedName || resolvedAvatar) {
            for (const st of stories) {
              if (!st.user) {
                st.user = {
                  id: String(target.id || targetUserId),
                  name: resolvedName || null,
                  username: target.username || null,
                  avatar: resolvedAvatar || null,
                }
              } else {
                if (!st.user.name || st.user.name === "Utilisateur") st.user.name = resolvedName || st.user.name
                if (!st.user.avatar || st.user.avatar === "/images/avatar.png") st.user.avatar = resolvedAvatar || st.user.avatar
              }
            }
          }
        }
      } catch {
        // Ignoré : l'affichage retombera sur le nom générique par défaut.
      }
    }
  }

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
   ACTIONS STORY — coupling vers les routes /api/stories/* (côté serveur).
   Encapsulle les endpoints Dughu confirmés :
     DELETE  /delStory/{storyId}   → suppression d'un Flash
     POST    /toggleLikeStory      → j'aime / je n'aime plus une story
     POST    /logView             → enregistre une vue sur une story
     GET     /logView             → liste des personnes ayant vu une story
   ────────────────────────────────────────────────────────────────────────────── */

export interface StoryActionResult {
  success: boolean
  message?: string
  liked?: boolean
}

/** Bascule le « j'aime » d'un utilisateur sur une story. */
export async function toggleStoryLike(userId: string, storyId: string): Promise<StoryActionResult> {
  const fd = new FormData()
  fd.append("user_id", String(userId))
  fd.append("story_id", String(storyId))
  // Dughu exige un champ `reaction` (validation "The reaction field is required.").
  // Même convention que le like de commentaire : réaction numérique, "1" = like.
  fd.append("reaction", "1")
  let raw: any
  try {
    raw = await dughuApi.toggleLikeStory(fd)
  } catch (error) {
    // Dughu renvoie un code ≠2xx → remonter le détail réel au lieu d'une erreur générique.
    console.error("TOGGLE STORY LIKE DUGHU ERROR:", error)
    if (error instanceof DughuApiError) {
      const detail = error.data
      let message = error.message
      if (detail && typeof detail === "object") {
        const d = detail as any
        message =
          d?.message ||
          d?.message_text ||
          d?.error?.message ||
          (d?.errors ? `Validation: ${JSON.stringify(d.errors)}` : "") ||
          JSON.stringify(d)
      }
      return { success: false, message }
    }
    return { success: false, message: error instanceof Error ? error.message : "Erreur de réaction (API Dughu)." }
  }
  if (raw?.success === false) {
    return { success: false, message: raw?.message || "Erreur de réaction (API Dughu)." }
  }
  // Statut « aimé » : Dughu peut renvoyer is_like / liked / removed / un booléen brut.
  const liked =
    (typeof raw?.is_like === "boolean" && raw.is_like) ||
    (typeof raw?.liked === "boolean" && raw.liked) ||
    (raw?.is_like === 1) ||
    (raw?.liked === 1)
  return { success: true, liked }
}

/** Supprime un Flash (seul son auteur). */
export async function deleteStory(storyId: string): Promise<{ success: boolean; message?: string }> {
  const raw = await dughuApi.delStory(storyId)
  if (raw?.success === false) {
    return { success: false, message: raw?.message || "Erreur suppression (API Dughu)." }
  }
  return { success: true }
}

/** Log une vue : appelé quand un utilisateur (non-auteur) ouvre la story. */
export async function logStoryView(userId: string, storyId: string): Promise<{ success: boolean; message?: string }> {
  const fd = new FormData()
  fd.append("user_id", String(userId))
  fd.append("story_id", String(storyId))
  const raw = await dughuApi.logStoryView(fd)
  if (raw?.success === false) {
    return { success: false, message: raw?.message || "Erreur vue (API Dughu)." }
  }
  return { success: true }
}

/** Un spectateur (personne ayant vu une story). */
export interface StoryViewer {
  id: string
  name?: string
  username?: string
  avatar?: string | null
  viewedAt?: string
}

function normalizeViewer(v: any): StoryViewer | null {
  if (!v || typeof v !== "object") return null
  const id = String(v?.user_id || v?.userId || v?.id || v?.viewer_id || "")
  if (!id) return null
  const u = v?.user || v?.viewer || v?.userInfo || v
  const firstName = String(u?.first_name || u?.firstName || "")
  const lastName = String(u?.last_name || u?.lastName || "")
  const name =
    String(u?.name || u?.full_name || u?.fullName || u?.nickname || "") ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "Utilisateur"
  return {
    id,
    name,
    username: String(u?.username || u?.user_name || u?.slug || ""),
    avatar: u?.avatar ? resolveMediaUrl(String(u.avatar)) : null,
    viewedAt: String(v?.viewed_at || v?.viewedAt || v?.created_at || v?.seen_at || ""),
  }
}

/** Extrait la liste de vues d'une réponse Dughu (formes multiples). */
function extractViewers(raw: any): StoryViewer[] {
  if (!raw || typeof raw !== "object") return []
  const unwrapped = raw?.result && typeof raw.result === "object" && !Array.isArray(raw.result) ? raw.result : raw
  const candidates: any[] = []
  for (const k of ["viewers", "views", "users", "data", "items", "logs", "storyViews", "authStories"]) {
    const list = unwrapped?.[k] || raw?.[k]
    if (Array.isArray(list)) candidates.push(...list)
  }
  if (Array.isArray(unwrapped)) candidates.push(...unwrapped)
  return candidates.map(normalizeViewer).filter((v): v is StoryViewer => !!v)
}

/** Liste les personnes ayant vu une story (auteur de la story uniquement). */
export async function getStoryViewers(storyId: string, userId?: string): Promise<StoryViewer[]> {
  const raw = await dughuApi.getStoryViewers(storyId, userId)
  return extractViewers(raw)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createStory(_payload: unknown): Promise<unknown> {
  // La création passe par POST /api/stories (contrat POST /postStory).
  return Promise.resolve({ success: false, message: "createStory : passer par POST /api/stories." })
}

// probe write ok
