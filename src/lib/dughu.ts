/* eslint-disable @typescript-eslint/no-explicit-any */
const BASE_URL = (process.env.DUGHU_API_BASE_URL || "https://apitest.dughu.com/api").replace(/\/+$/, "")
const API_TOKEN = process.env.DUGHU_API_KEY || ""
// Origine racine du serveur Dughu (sans le suffixe /api) pour résoudre les fichiers relatifs
const DUGHU_ORIGIN = BASE_URL.replace(/\/api\/?$/, "")
// Par défaut, la messagerie utilise le même environnement que le reste de
// l'application. Cela évite d'envoyer un ID provenant d'apitest vers la base
// de production, où cet utilisateur n'existe pas.
const CHAT_BASE_URL = (process.env.DUGHU_CHAT_API_BASE_URL || BASE_URL).replace(/\/+$/, "")
const CHAT_ORIGIN = CHAT_BASE_URL.replace(/\/api\/?$/, "")
const TIMEOUT_MS = (Number(process.env.DUGHU_API_TIMEOUT) || 15) * 1000
const RETRY_TIMES = Number(process.env.DUGHU_API_RETRY_TIMES) || 2
const RETRY_SLEEP_MS = Number(process.env.DUGHU_API_RETRY_SLEEP) || 200
export const DUGHU_DEFAULT_MEDIA_URL = "https://dughuakwaplay.s3.eu-west-3.amazonaws.com/storage/photos/d-avatar.jpg"

export class DughuApiError extends Error {
  status: number
  data: unknown
  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = "DughuApiError"
    this.status = status
    this.data = data
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function dughuFetch(
  path: string,
  init: RequestInit = {},
  retries = RETRY_TIMES,
  baseUrl = BASE_URL
): Promise<any> {
  if (!API_TOKEN) {
    throw new DughuApiError("DUGHU_API_KEY manquant dans .env", 500)
  }
  const url = `${baseUrl}/${path.replace(/^\/+/, "")}`

  let attempt = 0
  while (true) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const headers = new Headers(init.headers)
      headers.set("X-AppApiToken", API_TOKEN)
      headers.set("Accept", "application/json")
      // Debug: log request metadata in non-production for troubleshooting
      if (process.env.NODE_ENV !== "production") {
        try {
          const method = (init.method || "GET").toUpperCase()
          const headerKeys = Array.from(headers.keys())
          const safeBody = typeof init.body === "string" ? init.body.slice(0, 1000) : undefined
          // Ne jamais logger la valeur du token — seulement l'existence de l'en-tête
          console.debug(`[dughuFetch] ${method} ${url} | hasToken:${headers.has("X-AppApiToken")} | headers:${headerKeys.join(",")} | bodyPreview:${safeBody ?? ""}`)
        } catch {
          /* ignore logging errors */
        }
      }
      const res = await fetch(url, { ...init, headers, signal: controller.signal })
      const text = await res.text()
      let data: unknown = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = text
      }
      if (!res.ok) {
        throw new DughuApiError(`Dughu API ${res.status} sur ${path}`, res.status, data)
      }
      return data
    } catch (err) {
      clearTimeout(timeout)
      if (attempt >= retries) throw err
      attempt += 1
      await sleep(RETRY_SLEEP_MS * attempt)
    }
  }
}

function buildQuery(params?: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v))
    }
  }
  const s = qs.toString()
  return s ? `?${s}` : ""
}

export const dughu = {
  enabled: !!API_TOKEN,

  get: (path: string, params?: Record<string, string | number | undefined>) =>
    dughuFetch(`${path}${buildQuery(params)}`, { method: "GET" }),

  form: (path: string, params: Record<string, string | number | undefined>) => {
    const body = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") body.set(k, String(v))
    }
    return dughuFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })
  },

  multipart: (path: string, formData: FormData) =>
    dughuFetch(path, { method: "POST", body: formData }),

  rootGet: (path: string, params?: Record<string, string | number | undefined>) =>
    dughuFetch(`${path}${buildQuery(params)}`, { method: "GET" }, RETRY_TIMES, DUGHU_ORIGIN),

  rootMultipart: (path: string, formData: FormData) =>
    dughuFetch(path, { method: "POST", body: formData }, RETRY_TIMES, DUGHU_ORIGIN),

  chatGet: (path: string, params?: Record<string, string | number | undefined>) =>
    dughuFetch(`${path}${buildQuery(params)}`, { method: "GET" }, RETRY_TIMES, CHAT_BASE_URL),

  chatRootMultipart: (path: string, formData: FormData) =>
    dughuFetch(path, { method: "POST", body: formData }, RETRY_TIMES, CHAT_ORIGIN),

  chatMultipart: (path: string, formData: FormData, authToken?: string) =>
    dughuFetch(path, {
      method: "POST",
      body: formData,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    }, RETRY_TIMES, CHAT_BASE_URL),
}

// ── Endpoints connus de l'API Dughu ──────────────────────────────────────────
export const dughuApi = {
  register: (data: {
    first_name: string
    last_name: string
    email: string
    gender: string
    password: string
    password_confirmation: string
    phone_number: string
    country_code?: string
    referrer?: string
  }) =>
    dughu.form("register", {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      gender: data.gender,
      password: data.password,
      password_confirmation: data.password_confirmation,
      phone_number: data.phone_number,
      country_code: data.country_code || "",
      referrer: data.referrer || "",
    }),

  login: (login: string, password: string) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)
    return dughu.form("login", {
      login,
      ...(isEmail ? { email: login } : { username: login }),
      password,
    })
  },

  // Connexion Google : le navigateur obtient un Google ID token (Google Identity
  // Services) et l'API Dughu le vérifie auprès de Google, puis renvoie (ou crée)
  // l'utilisateur Dughu. Contrat : POST /auth/google { token }.
  googleAuth: (token: string) => dughu.form("auth/google", { token }),

  createPost: (formData: FormData) => dughu.multipart("post", formData),

  // Endpoint dédié aux publications de texte coloré (contrat : GET)
  // GET /colored_posts?post_id=&user_id=&boost_days=   → header X-AppApiToken
  getColoredPosts: (params: {
    post_id?: string | number
    user_id?: string | number
    boost_days?: string | number
  }) => dughu.get("colored_posts", params),

  addComment: (formData: FormData) => dughu.multipart("add_comment", formData),

  replyComment: (formData: FormData) => dughu.multipart("storeCommentReplique", formData),

  toggleLikePost: (formData: FormData) => dughu.multipart("toggleLikePost", formData),

  // ── Gestion du menu des posts ──
  deletePost: (postId: string | number) =>
    dughuFetch(`deletePost/${encodeURIComponent(String(postId))}`, { method: "DELETE" }),

  savePost: (userId: string | number, postId: string | number) =>
    dughu.form("store-save", { user_id: String(userId), post_id: String(postId) }),

  hidePost: (userId: string | number, postId: string | number) =>
    dughu.form("hidePost", { user_id: String(userId), post_id: String(postId) }),

  // Épingler / désépingler une publication (réservé à l'auteur du post)
  togglePinStatus: (userId: string | number, postId: string | number) =>
    dughu.form(`togglePinStatus/${encodeURIComponent(String(postId))}`, { user_id: String(userId) }),

  // ── Stories ──
 getUserStories: (userId: string | number, targetUserId: string | number, opts?: { perPage?: number; page?: number }) =>
  dughu.get("getUserStories", {
    user_id: String(userId),
    target_user_id: String(targetUserId),
    per_page: opts?.perPage,
    page: opts?.page,
  }),

  getFriendsStories: (userId: string | number, opts?: { perPage?: number; page?: number }) =>
    dughu.get("getFriendsStories", {
      user_id: String(userId),
      per_page: opts?.perPage,
      page: opts?.page,
    }),

  postStory: (formData: FormData) => dughu.multipart("postStory", formData),

  delStory: (storyId: string | number) =>
    dughuFetch(`delStory/${encodeURIComponent(String(storyId))}`, { method: "DELETE" }),

  toggleLikeStory: (formData: FormData) => dughu.multipart("toggleLikeStory", formData),

  // Log une vue sur une story (POST form-data : user_id + story_id)
  logStoryView: (formData: FormData) => dughu.multipart("logView", formData),

  // Récupère les vues d'une story (GET /logView?story_id=…&user_id=…)
  getStoryViewers: (storyId: string | number, userId?: string | number) =>
    dughu.get("logView", {
      story_id: String(storyId),
      user_id: userId ? String(userId) : undefined,
    }),

  getUser: (identifier: string | number, viewer: string | number) =>
    dughu.get(`getSpecificUser/${encodeURIComponent(String(identifier))}/${encodeURIComponent(String(viewer))}`),

  getAllUsers: (page = 1) => dughu.get("getAllUsers", { page }),

  searchUsers: (params: { search?: string; username?: string; user_id?: string; page?: number }) =>
    dughu.form("searchUsers", {
      search: params.search || "",
      username: params.username || "",
      user_id: params.user_id || "",
      page: String(params.page || 1),
    }),

  getUserPosts: (userId: string | number, authUserId: string | number, page: number) =>
    dughu.form("userPost", { user_id: String(userId), auth_user_id: String(authUserId), page: String(page) }),

  getPostPageUser: (userId: string | number, page: number) =>
    dughu.get(`getPostPageUser/${encodeURIComponent(String(userId))}`, { page }),

  // Fil d'actualité principal (endpoint v1 / v2)
  getPostAllRepost: (userId: string | number, page: number) =>
    dughu.get(`getPostAllRepost/${encodeURIComponent(String(userId))}`, { page }),

  // Variante plus rapide du fil (getPostAll/{userId}) : utilisée en repli quand
  // getPostAllRepost tarde trop, pour éviter le timeout côté client.
  getPostAll: (userId: string | number, page: number) =>
    dughu.get(`getPostAll/${encodeURIComponent(String(userId))}`, { page }),

  // Liste des albums d'un utilisateur (chaque album contient ses medias)
  getAlbums: (userId: string | number) =>
    dughu.get("album", { user_id: String(userId) }),

  searchAll: (params: { search?: string; q?: string; type?: string; page?: number }) =>
    dughu.form("searchAll", {
      search: params.search || params.q || "",
      type: params.type || "",
      page: String(params.page || 1),
    }),

  // ── Suggestions (sidebar) ──
  suggestPages: (params: { user_id: string | number; searchTerm?: string; page?: number }) =>
    dughu.form(`suggestPages?page=${Number(params.page) || 1}`, {
      user_id: String(params.user_id),
      searchTerm: params.searchTerm || "",
    }),

  suggestGroups: (params: { user_id: string | number; searchTerm?: string; page?: number }) =>
    dughu.form(`suggestgroupes?page=${Number(params.page) || 1}`, {
      user_id: String(params.user_id),
      searchTerm: params.searchTerm || "",
    }),

  getHashtags: (q = "") => dughu.get("getHashtags", { q }),

  // Posts associés à un hashtag — le tag se passe SANS le « # » (sinon 404).
  getPostByHashtags: (hashtag: string | number, page = 1) =>
    dughu.get(`getPostByHashtags/${encodeURIComponent(String(hashtag).replace(/^#/, ""))}`, { page }),

  getPopularPosts: (userId: string | number) =>
    dughu.get(`getPopularPosts/${encodeURIComponent(String(userId))}`),

  getComments: (postId: string | number, userId: string | number, page = 1) =>
    dughu.get(`getComments/${encodeURIComponent(String(postId))}/${encodeURIComponent(String(userId))}`, { page }),

  getCommentReactions: (commentId: string | number) =>
    dughu.get(`getCommentReactions/${encodeURIComponent(String(commentId))}`),

  toggleLikeComment: (formData: FormData) => dughu.multipart("toggleLike_comment", formData),

  toggleLikeResponseComment: (formData: FormData) => dughu.multipart("toggleLikeResponseComment", formData),

  updateComment: (commentId: string | number, formData: FormData) =>
    dughu.multipart(`update/${encodeURIComponent(String(commentId))}`, formData),

  destroyComment: (commentId: string | number) =>
    dughuFetch(`destroy_comment/${encodeURIComponent(String(commentId))}`, { method: "DELETE" }),

  getReplies: (commentId: string | number) =>
    dughu.get(`getReplies/${encodeURIComponent(String(commentId))}`),

  getReplayReactions: (replyId: string | number) =>
    dughu.get(`getReplayReactions/${encodeURIComponent(String(replyId))}`),

  toggleLikeReply: (formData: FormData) => dughu.multipart("toggleLikeResponseComment", formData),

  updateReply: (replyId: string | number, formData: FormData) =>
    dughu.multipart(`update_reply/${encodeURIComponent(String(replyId))}`, formData),

  destroyReply: (replyId: string | number) =>
    dughuFetch(`destroy_reply/${encodeURIComponent(String(replyId))}`, { method: "DELETE" }),

  getUserPhotos: (username: string, page: number) =>
    dughu.get(`profile/${encodeURIComponent(username)}/photos`, { page }),

  getUserVideos: (username: string, page: number) =>
    dughu.get(`profile/${encodeURIComponent(username)}/videos`, { page }),

  getUserActivities: (username: string, page: number) =>
    dughu.get(`profile/${encodeURIComponent(username)}/activites`, { page }),

  getUserFriends: (userId: string | number) => dughu.get(`userFriends/${encodeURIComponent(String(userId))}`),

  getFollowers: (userId: string | number, authUserId: string | number) =>
    dughu.get(`listFollowers/${encodeURIComponent(String(userId))}/${encodeURIComponent(String(authUserId))}`),

  getFollowing: (userId: string | number, authUserId: string | number) =>
    dughu.get(`listFollowing/${encodeURIComponent(String(userId))}/${encodeURIComponent(String(authUserId))}`),

  getUserFollowerInfo: (userId: string | number) =>
    dughu.get(`info/user/follower/${encodeURIComponent(String(userId))}`),

  follow: (authUserId: string | number, userId: string | number) =>
    dughu.form("follow", { auth_user_id: String(authUserId), user_id: String(userId) }),

  unfollow: (authUserId: string | number, userId: string | number) =>
    dughu.form("unfollow", { auth_user_id: String(authUserId), user_id: String(userId) }),

  getRelationRequests: (authUserId: string | number, userId: string | number, type: "friend" | "network") => {
    const formData = new FormData()
    formData.append("auth_user_id", String(authUserId))
    formData.append("user_id", String(userId))
    formData.append("type", type)
    return dughu.multipart("relation/requests", formData)
  },

  blockUser: (authUserId: string | number, userId: string | number) =>
    dughu.form("block_user", { auth_user_id: String(authUserId), user_id: String(userId) }),

  listBlockUser: (authUserId: string | number) =>
    dughu.form("list_block_user", { auth_user_id: String(authUserId) }),

  // ── Points ──
  // Offre des points à l'auteur d'une publication.
  // Contrat : POST /points/give { user_id, user_offer_id, points, post_id }
  givePoints: (params: {
    user_id: string | number
    user_offer_id: string | number
    points: string | number
    post_id: string | number
  }) =>
    dughu.form("points/give", {
      user_id: String(params.user_id),
      user_offer_id: String(params.user_offer_id),
      points: String(params.points),
      post_id: String(params.post_id),
    }),

  // Points totaux d'un utilisateur (GET /pointsToday/{userId} → { total, converted, … }).
  getPointsToday: (userId: string | number) =>
    dughu.get(`pointsToday/${encodeURIComponent(String(userId))}`),

  getUsersWithBadges: () => dughu.get("usersWithBadges"),

  getOnline: (userId: string | number, token: string) =>
    dughu.get(`getOnline/${encodeURIComponent(String(userId))}/${encodeURIComponent(token)}`),

  // Messagerie Dughu : ces routes vivent à la racine, hors du préfixe /api.
  getUserChats: (userId: string | number) =>
    dughu.chatGet(`getUserChats/${encodeURIComponent(String(userId))}`),

  getConversationMessages: (userId: string | number, targetUserId: string | number) =>
    dughu.chatGet("getConversationMessages", {
      user_id: String(userId),
      target_user_id: String(targetUserId),
    }),

  getChatContact: (userId: string | number) =>
    dughu.chatGet(`contactChat/${encodeURIComponent(String(userId))}`),

  searchChatContacts: (query: string) =>
    dughu.chatGet("searchContact", { query }),

  sendMessage: (formData: FormData, authToken?: string) =>
    dughu.chatMultipart("sendMessage", formData, authToken),

  updateProfile: (formData: FormData) => dughu.multipart("updateProfile", formData),

  updatePrivacySettings: (formData: FormData) => dughu.multipart("updatePrivacySettings", formData),

  deleteUser: (formData: FormData) => dughu.multipart("deleteUser", formData),

  sendCustomNotification: (formData: FormData) => dughu.multipart("sendCustomNotification", formData),

  getLikedPosts: (userId: string | number) => dughu.get(`postLikeToUser/${encodeURIComponent(String(userId))}`),

  getReferrals: (userId: string | number) => dughu.get(`getUserReferer/${encodeURIComponent(String(userId))}`),

  // ── Authentification / session Dughu ──
  mobileTokenUser: (userId: string | number, mobileToken: string) =>
    dughu.form("mobileTokenUser", { user_id: String(userId), mobileToken }),

  submitVerification: (formData: FormData) => dughu.multipart("submitVerification", formData),

  getVerificationRequests: (userId: string | number) =>
    dughu.get(`getVerificationRequests/${encodeURIComponent(String(userId))}`),

  sessionsDestroy: () => dughu.form("sessionsDestroy", {}),
  // ── Mot de passe oublié ──
// ── Vérification email / OTP / connexion auto (flux inscription) ──
  askAuthCode: (email: string) =>
    dughuFetch(`ask_auth_code${buildQuery({ email })}`, {
      method: "GET",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    }),

  // GET /auth/me : profil courant à partir du token Dughu (Authorization)
  authMe: (token: string) =>
    dughuFetch("auth/me", {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  // POST /auth/refresh : rafraîchir le token de session Dughu
  authRefresh: (token: string) =>
    dughuFetch("auth/refresh", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  // GET /profile/me : profil courant (variante "moi")
  profileMe: (token: string) =>
    dughuFetch("profile/me", {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  // POST /loginAuto : connexion via le code reçu après ask_auth_code
  loginAuto: (email: string, code: string) =>
    dughu.form("loginAuto", { email, code }),
  // ── Mot de passe oublié ──
  sendResetLink: (email: string) =>
    dughu.form("password/sendResetLink", { email }),

  resetPassword: (data: {
    email: string
    otp: string
    password: string
    password_confirmation: string
  }) =>
    dughu.form("resetPassword", {
      email: data.email,
      otp: data.otp,
      password: data.password,
      password_confirmation: data.password_confirmation,
    }),

}

export function getDughuUserId(body: any, formData?: FormData): string {
  if (formData) return (formData.get("dughuUserId") as string) || ""
  return (body?.dughuUserId as string) || ""
}
export { dughuFetch }

// ── Helpers de normalisation (défensifs, l'API renvoie des noms de champs variés) ──
export function pick(obj: any, ...keys: Array<string | string[] | number | boolean>): any {
  if (!obj || typeof obj !== "object") return undefined
  for (const entry of keys) {
    if (Array.isArray(entry)) {
      for (const k of entry) {
        const v = obj[k]
        if (v !== undefined && v !== null && v !== "") return v
      }
    } else if (typeof entry === "string") {
      const v = obj[entry]
      if (v !== undefined && v !== null && v !== "") return v
    }
  }
  return undefined
}

// L'enveloppe de l'API est { success, message, result } — rejette le contenu utile
export function unwrap<T = any>(raw: any): T {
  return (raw?.result ?? raw) as T
}

const toUrl = (v: any): string => {
  if (typeof v !== "string") return ""
  if (v.startsWith("http") || v.startsWith("/")) return v
  return v
}

// Résout un chemin média éventuellement relatif renvoyé par l'API Dughu
// (ex. `replies/images/xxx.webp` renvoyé par replyComment) vers une URL absolue.
// Les URLs absolues et les ressources locales de l'application sont conservées telles quelles.
export function resolveMediaUrl(v: string): string {
  if (!v) return ""
  if (/^https?:\/\//i.test(v) || v.startsWith("data:") || v.startsWith("blob:")) return v
  // Ressources locales de l'application → inchangées
  if (v.startsWith("/uploads/") || v.startsWith("/images/") || v.startsWith("/media/")) return v
  const clean = v.replace(/^\/+/, "")
  // Chemins relatifs du stockage Dughu (bucket S3) renvoyés par certains endpoints
  // (inclut `uploads/comments/...` utilisé pour les anciens commentaires média)
  if (/^(comments|replies|videos|files|images|photos|uploads)\//i.test(clean)) {
    return `https://dughuprod.s3.amazonaws.com/${clean}`
  }
  // Repli : on résout contre l'origine du serveur Dughu
  return `${DUGHU_ORIGIN}/${clean}`
}

/**
 * Résout l'URL d'affichage d'un média de story renvoyé uniquement sous forme de
 * chemin fichier brut (champ `path`, `file`, `file_path`, … retourné par
 * /getUserStories & /getFriendsStories).
 *
 * - Si c'est déjà une URL absolue / data: / blob:, on la renvoie telle quelle.
 * - Sinon on construit l'URL de l'endpoint Dughu
 *   GET `/media/download?path={filePath}` qui sert le média.
 */
export function resolveStoryMediaUrl(raw: string | null | undefined): string {
  if (!raw) return ""
  const v = String(raw)
  if (/^https?:\/\//i.test(v) || v.startsWith("data:") || v.startsWith("blob:")) return v
  const clean = v.replace(/^\/+/, "")
  const resolved = resolveMediaUrl(v)
  // Si resolveMediaUrl donne déjà une URL absolue directe du stockage, on l'utilise
  if (/^https?:\/\//i.test(resolved) && resolved !== `${DUGHU_ORIGIN}/${clean}`) return resolved
  return `${DUGHU_ORIGIN}/media/download?path=${encodeURIComponent(clean)}`
}

// Déduit le type de média à partir de l'extension de l'URL (repli si file_type absent)
function detectMediaTypeFromUrl(url: string): string {
  const lower = url.split("?")[0].toLowerCase()
  if (/\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|jfif)$/.test(lower)) return "image"
  if (/\.(mp4|webm|ogg|ogv|mov|m4v|avi|mkv|3gp|mpeg|m3u8|wmv)$/.test(lower)) return "video"
  if (/\.(mp3|m4a|aac|wav|oga|opus|flac|weba|amr|m4b|wma)$/.test(lower)) return "audio"
  return "file"
}


function normalizeBirthday(v: any): string {
  if (typeof v !== "string") return ""
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return v
}

export function isDefaultDughuMedia(v: string): boolean {
  const normalized = resolveMediaUrl(v || "").replace(/\/+$/, "")
  const defaultUrl = DUGHU_DEFAULT_MEDIA_URL.replace(/\/+$/, "")
  return !!normalized && normalized === defaultUrl
}

export function normalizeUser(u: any): Record<string, any> | null {
  if (!u || typeof u !== "object") return null
  const id = pick(u, "id", "ID", "user_id", "userId", "userID") || ""
  if (!id) return null
  const firstName = pick(u, ["first_name", "firstName", "firstname"], "") || ""
  const lastName = pick(u, ["last_name", "lastName", "lastname"], "") || ""
  const name =
    pick(u, ["name", "full_name", "fullName", "nickname"], "") ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "Utilisateur"
  const onlineValue = pick(u, ["is_online", "isOnline", "online"], false)
  return {
    id: String(id),
    firstName: String(firstName),
    lastName: String(lastName),
    name: String(name),
    username: pick(u, ["username", "user_name", "userName", "slug"], ""),
    slug: pick(u, ["slug", "username", "user_name"], ""),
    email: pick(u, ["email", "mail"], ""),
    avatar: resolveMediaUrl(toUrl(pick(u, ["avatar", "profileImage", "profile_image", "profile_image_url", "profile_picture", "profilePicture", "photo", "image"], ""))) || "/images/avatar.png",
    cover: resolveMediaUrl(toUrl(
      pick(u, ["cover", "cover_image", "coverImage", "background", "banner", "coverImageUrl"], "")
    )) || "/images/group/default-cover.jpg",
    bio: pick(u, ["bio", "about", "description", "about_me"], ""),
    gender: pick(u, ["gender", "sexe", "sex"], ""),
    phone: pick(u, ["phone", "phone_number", "phoneNumber", "telephone"], ""),
    birthdate: normalizeBirthday(pick(u, ["birthdate", "birthday", "dateNaissance", "dob"], "")) || null,
    online: onlineValue === true || onlineValue === 1 || onlineValue === "1" || onlineValue === "true",
    lastSeen: pick(u, ["last_seen", "lastSeen", "last_activity", "lastActivity"], "") || null,
    isFollowing: (() => {
      const value = pick(u, ["is_following", "isFollowing", "follow_status", "followStatus", "following"], false)
      return value === true || value === 1 || value === "1" || value === "true"
    })(),
  }
}

export function parseCounts(details: string | any): Record<string, number> {
  let raw: any = details
  if (typeof details === "string") {
    try {
      raw = JSON.parse(details)
    } catch {
      raw = {}
    }
  }
  if (!raw || typeof raw !== "object") raw = {}
  const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  return {
    posts: num(pick(raw, ["posts", "post_count", "postCount", "publications"], 0)),
    followers: num(pick(raw, ["followers", "follower_count", "followerCount", "abonnes", "followers_count"], 0)),
    following: num(pick(raw, ["following", "following_count", "followingCount", "abonnements"], 0)),
    friends: num(pick(raw, ["friends", "friend_count", "friendCount", "amis"], 0)),
  }
}

export function normalizePhoto(p: any): Record<string, any> | null {
  if (!p || typeof p !== "object") return null
  const id = pick(p, ["id", "ID", "post_id", "postId", "photo_id"], "") || String(Math.random()).slice(2)
  // Chercher l'URL dans tous les champs possibles (l'API Dughu utilise postFile principalement)
  const raw = toUrl(pick(p, [
    "postFileLink", "postFile", "postPhoto", "file", "fileLink",
    "file_path", "image", "photo", "photoUrl", "photo_url",
    "url", "link", "thumb", "thumbnail",
  ], ""))
  const url = raw ? resolveMediaUrl(raw) : ""
  if (!url) return null
  return {
    id: String(id),
    url,
    createdAt: pick(p, ["createdAt", "created_at", "date", "uploaded_at", "time", "post_time"], "") || "",
  }
}

export function mapPhotos(raw: any): Record<string, any>[] {
  // L'API Dughu peut wrapper la réponse de différentes façons
  const arr = Array.isArray(raw)
    ? raw
    : raw?.data || raw?.photos || raw?.items
      || raw?.result?.data || raw?.result?.photos || raw?.result?.items || raw?.result?.posts
      || (Array.isArray(raw?.result) ? raw.result : null)
      || []
  if (!Array.isArray(arr)) return []
  return arr.map(normalizePhoto).filter((x): x is Record<string, any> => x !== null)
}

export function normalizeVideo(v: any): Record<string, any> | null {
  if (!v || typeof v !== "object") return null
  const id = pick(v, ["id", "ID", "post_id", "postId", "video_id"], "") || String(Math.random()).slice(2)
  // postFileLink (URL S3 absolue) prioritaire, comme pour les photos
  const raw = toUrl(pick(v, [
    "postFileLink", "postFile", "videoLink", "video_url", "videoUrl",
    "file", "fileLink", "file_path", "video", "media", "media_file",
    "url", "link", "thumb", "thumbnail",
  ], ""))
  const url = raw ? resolveMediaUrl(raw) : ""
  if (!url) return null
  const thumb = toUrl(pick(v, [
    "postFileThumb", "thumbnail", "thumb", "thumbnail_url", "video_thumb", "poster",
  ], ""))
  return {
    id: String(id),
    url,
    thumb: thumb ? resolveMediaUrl(thumb) : null,
    views: Number(pick(v, ["videoViews", "video_views", "views", "view_count", "count_views"])) || 0,
    createdAt: pick(v, ["createdAt", "created_at", "date", "time", "uploaded_at", "post_time"], "") || "",
  }
}

export function mapVideos(raw: any): Record<string, any>[] {
  // L'API Dughu peut wrapper la réponse de différentes façons
  const arr = Array.isArray(raw)
    ? raw
    : raw?.data || raw?.videos || raw?.items
      || raw?.result?.data || raw?.result?.videos || raw?.result?.items || raw?.result?.posts
      || (Array.isArray(raw?.result) ? raw.result : null)
      || []
  if (!Array.isArray(arr)) return []
  return arr.map(normalizeVideo).filter((x): x is Record<string, any> => x !== null)
}

export function mapFriends(raw: any): Record<string, any>[] {
  const arr = Array.isArray(raw) ? raw : raw?.data || raw?.users || raw?.friends || raw?.items || []
  if (!Array.isArray(arr)) return []
  return arr
    .map(normalizeUser)
    .filter((u): u is Record<string, any> => u !== null)
    .map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      avatar: u.avatar,
    }))
}

/** Normalise une story renvoyée par l'API Dughu vers la forme attendue par le frontend. */
export function normalizeStory(s: any): Record<string, any> | null {
  if (!s || typeof s !== "object") return null
  const id = pick(s, "id", "ID", "story_id", "storyId")
  if (!id) return null
  const userRaw = normalizeUser(s?.user || s?.author || s?.utilisateur)
  const image = resolveMediaUrl(toUrl(
    pick(s, ["image", "photo", "media", "file", "postFile", "story_image", "storyImage", "storyMedia", "story_url", "thumbnail", "thumb", "media_file"], "")
  ))
  const video = resolveMediaUrl(toUrl(
    pick(s, ["video", "story_video", "storyVideo", "media_video", "file_video", "postVideoURL"], "")
  ))
  const text = pick(s, ["text", "content", "description", "story_text", "storyText", "caption"]) || ""
  const bg = pick(s, ["bgColor", "bg_color", "backgroundColor", "background", "color"]) || ""
  const viewed =
    pick(s, ["viewed", "is_viewed", "isViewed", "seen"]) === true ||
    pick(s, ["viewed", "is_viewed", "isViewed"]) === "1" ||
    pick(s, ["viewed", "is_viewed", "isViewed"]) === 1
  return {
    id: String(id),
    userId: String(pick(s, ["user_id", "userId", "userID"]) || (userRaw?.id || "")),
    image,
    video,
    text: String(text || ""),
    bg: String(bg || ""),
    viewed: !!viewed,
    createdAt: toDate(pick(s, ["createdAt", "created_at", "date", "time", "post_date", "timestamp"])),
    user: userRaw
      ? { id: userRaw.id, name: userRaw.name, username: userRaw.username, avatar: userRaw.avatar }
      : null,
  }
}

export function mapStories(raw: any): Record<string, any>[] {
  const unwrapped = raw?.result && typeof raw.result === "object" && !Array.isArray(raw.result) ? raw.result : raw
  const arr = Array.isArray(unwrapped) ? unwrapped : unwrapped?.data || unwrapped?.stories || unwrapped?.items || []
  if (!Array.isArray(arr)) return []
  return arr.map(normalizeStory).filter((s): s is Record<string, any> => s !== null)
}

function toDate(v: any): string {
  if (!v) return new Date().toISOString()
  if (typeof v === "number") return new Date(v * 1000).toISOString()
  const s = String(v)
  if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000).toISOString()
  if (/^\d{13}$/.test(s)) return new Date(Number(s)).toISOString()
  return s
}

function isVideoUrl(v: any): boolean {
  return /\.(mp4|m4v|webm|mkv|mov|avi|ogg|3gp|mpeg|m3u8)(\?|#|$)/i.test(String(v || ""))
}

function isAudioUrl(v: any): boolean {
  return /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba|amr|m4b|wma)(\?|#|$)/i.test(String(v || ""))
}

/**
 * Désambiguïse les .webm : c'est une extension audio OU vidéo. On ne la traite
 * comme AUDIO que si le nom/chemin évoque un enregistrement vocal (post vocal
 * Laravel : voice_xxx.webm, audio_xxx.webm, enregistrement.webm, etc.).
 */
function isWebmAudioHint(v: any): boolean {
  const s = String(v || "")
  if (!/\.webm(\?|#|$)/i.test(s)) return false
  return /(voice|vocal|audio|son|sound|record|enregistr|micro|voix)/i.test(s)
}

function isAudioFileName(v: any): boolean {
  const s = String(v || "")
  if (isAudioUrl(s)) return true
  return isWebmAudioHint(s)
}

function isVideoPost(p: any): boolean {
  const type = String(pick(p, "postType", "post_type", "type", "media_type") || "").toLowerCase()
  const fileName = String(pick(p, "postFileName", "post_file_name", "fileName", "filename") || "")
  const anyMedia = toUrl(
    pick(p, "postFile", "postFileLink", "file", "postVideoURL", "video", "videoLink", "video_url", "hls_playlist", "postYoutube", "postVimeo")
  )
  return type === "video" || isVideoUrl(fileName) || isVideoUrl(anyMedia)
}

function postImages(p: any): string[] {
  const urls: string[] = []
  const image = pick(p, "postFile", "postPhoto", "postFileThumb", "thumbnail_url", "image", "photo", "photoUrl", "photo_url", "postFileLink", "file", "thumb", "thumbnail")
  if (image) {
    if (Array.isArray(image)) {
      for (const u of image) {
        const url = toUrl(typeof u === "object" ? pick(u, "url", "link", "file", "postFileLink", "postFile", "thumb", "thumbnail") : u)
        if (url) urls.push(url)
      }
    } else {
      const url = toUrl(image)
      if (url) urls.push(url)
    }
  }
  // Récupère le premier champ multi-images qui est un tableau NON VIDE.
  // ⚠️ On n'utilise PAS pick() ici : les posts album (postType="postAlbum")
  // possèdent un flag numérique `multi_image_post` (0/1). pick() renvoie cette
  // valeur (0 est « non vide » pour pick) et court-circuite le champ `album`
  // qui contient pourtant les images → les posts multi-images s'affichaient vides.
  // `album` est mis en tête car il est peuplé pour les posts album.
  const multiFrameKeys = [
    "album",
    "images",
    "photos",
    "files",
    "media",
    "attachments",
    "post_files",
    "postFiles",
    "multi_images",
    "multiple_images",
    "image_list",
    "images_list",
    "photos_list",
    "gallery",
    "fileInputForPost",
  ]
  let frames: any[] | null = null
  for (const k of multiFrameKeys) {
    const v = p?.[k]
    if (Array.isArray(v) && v.length > 0) {
      frames = v
      break
    }
  }
  if (frames) {
    for (const f of frames) {
      if (typeof f === "string") {
        const u = toUrl(f)
        if (u) urls.push(u)
      } else if (f && typeof f === "object") {
        const u = toUrl(pick(f, "postFileLink", "postFile", "file", "fileLink", "image", "photo", "url", "link", "thumb", "thumbnail", "photo_url", "photoUrl"))
        if (u) urls.push(u)
      }
    }
  }
  // Certaines réponses sérialisent la liste en JSON dans un champ unique
  const serialized = pick(p, "post_images", "postImages", "multi_images_json")
  if (typeof serialized === "string") {
    try {
      const parsed = JSON.parse(serialized)
      if (Array.isArray(parsed)) {
        for (const u of parsed) {
          const url = toUrl(typeof u === "object" ? pick(u, "url", "link", "file", "image", "photo", "postFile", "postFileLink") : u)
          if (url) urls.push(url)
        }
      }
    } catch {
      // champ non-JSON : ignoré
    }
  }
  return urls
}

// Mapping des IDs de réaction de l'API Dughu vers les types utilisés par l'app
const REACTION_ID_TO_TYPE_NAME: Record<number, string> = {
  1: "like",
  2: "love",
  3: "haha",
  4: "wow",
  5: "sad",
  6: "angry",
}
const KNOWN_REACTION_TYPES = ["like", "love", "haha", "wow", "sad", "angry"]

// Convertit une valeur de réaction (id numérique "1" ou type "like") en type
function toReactionTypeName(v: any): string | null {
  if (typeof v === "number") return REACTION_ID_TO_TYPE_NAME[v] || null
  const s = String(v || "").toLowerCase().trim()
  if (/^\d+$/.test(s)) return REACTION_ID_TO_TYPE_NAME[Number(s)] || null
  if (KNOWN_REACTION_TYPES.includes(s)) return s
  return null
}

/**
 * Extrait la répartition des réactions d'un post renvoyé par l'API Dughu,
 * sous la forme [{ type, count }]. Gère plusieurs formes possibles :
 *  - p.reactions = [{ reaction: 1, ... }, ...]  (liste de réactions utilisateurs)
 *  - p.reactions = { like: 3, love: 1 } ou { 1: 3, 2: 1 }  (compteur par type)
 *  - p.reaction_counts / p.reactionStats / p.reactions_count  (objet compteur)
 * Retourne null si aucune répartition n'est disponible.
 */
function extractReactionSummary(p: any): { type: string; count: number }[] | null {
  if (!p || typeof p !== "object") return null

  const counts: Record<string, number> = {}

  const rawList = pick(p, "reactions", "reactionList", "reaction_list")
  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (!item || typeof item !== "object") continue
      const type = toReactionTypeName(
        pick(item, "reaction", "reaction_id", "reactionId", "type", "typeLike", "type_like", "reaction_type")
      )
      if (type) counts[type] = (counts[type] || 0) + 1
    }
  } else if (rawList && typeof rawList === "object") {
    for (const [k, v] of Object.entries(rawList)) {
      const type = toReactionTypeName(k)
      const n = Number(v)
      if (type && Number.isFinite(n) && n > 0) counts[type] = n
    }
  }

  const rawCounts = pick(p, "reaction_counts", "reactionCounts", "reactionStats", "reaction_stats", "reactions_count", "reactionsCount")
  if (rawCounts && typeof rawCounts === "object") {
    for (const [k, v] of Object.entries(rawCounts)) {
      const type = toReactionTypeName(k)
      const n = Number(v)
      if (type && Number.isFinite(n) && n > 0) counts[type] = (counts[type] || 0) + n
    }
  }

  const entries = Object.entries(counts)
  if (entries.length === 0) return null
  return entries.map(([type, count]) => ({ type, count }))
}

export function mapPost(p: any, fallbackAuthor?: any): Record<string, any> | null {
  if (!p || typeof p !== "object") return null
  const id = pick(p, "id", "ID", "post_id", "postId") || String(Math.random()).slice(2)

  // ── Médias : distinguer image et vidéo (l'API met les vidéos dans postFile) ──
  const mediaFile = toUrl(
    pick(p, "postFile", "postFileLink", "file", "postVideoURL", "postYoutube", "postVimeo", "video", "videoLink", "video_url", "videoUrl")
  )
  const hlsPlaylist = toUrl(pick(p, "hls_playlist"))
  const thumb = toUrl(pick(p, "postFileThumb", "fileThumb", "thumbnail_url", "thumb", "thumbnail"))

  const mediaFileName = String(
    pick(p, "postFileName", "post_file_name", "fileName", "filename") || ""
  )
  const explicitAudio = toUrl(
    pick(p, "postAudio", "audioFile", "audio_file", "audio", "audioUrl", "audio_url", "postVoice", "voiceFile")
  )
  const rawFileType = String(pick(p, "file_type", "fileType", "media_type", "mediaType") || "").toLowerCase()
  // Post vocal : l'URL ou le nom de fichier désignent un fichier audio
  // (les .webm ambigus ne sont audio que si le nom évoque un enregistrement vocal).
  const isLikelyAudio =
    isAudioUrl(mediaFile) ||
    isAudioFileName(mediaFileName) ||
    isWebmAudioHint(mediaFile) ||
    rawFileType.startsWith("audio")

  let rawImages = postImages(p)
  let video: string | null = null
  if (isVideoPost(p) && !isLikelyAudio) {
    video = hlsPlaylist || mediaFile || null
    // Ne pas laisser l'URL vidéo s'afficher comme image
    rawImages = rawImages.filter((u) => !isVideoUrl(u) && u !== mediaFile)
  }

  let audio: string | null = null
  if (!video && isLikelyAudio) {
    const audioUrl = mediaFile || explicitAudio
    if (audioUrl) {
      audio = audioUrl
      // Ne pas laisser l'URL audio s'afficher comme image
      rawImages = rawImages.filter(
        (u) => u !== audioUrl && !isAudioUrl(u) && !isWebmAudioHint(u)
      )
    }
  }

  const pageAuthor = p?.page
    ? {
        id: String(p.page.page_id || p.page.id || ""),
        name: p.page.page_name || p.page.page_title || "Page",
        username: p.page.page_title || p.page.username || "",
        avatar: toUrl(p.page.avatar) || "/images/avatar.png",
        isFollowing: false,
      }
    : null
  const author =
    (Number(p?.page_id) > 0 && pageAuthor ? pageAuthor : null) ||
    normalizeUser(p?.user || p?.author || p?.utilisateur) ||
    pageAuthor ||
    (fallbackAuthor ? normalizeUser(fallbackAuthor) : null) || {
      id: String(fallbackAuthor?.id || ""),
      name: String(fallbackAuthor?.name || "Utilisateur"),
      username: String(fallbackAuthor?.username || ""),
      avatar: toUrl(fallbackAuthor?.avatar) || "/images/avatar.png",
      isFollowing: false,
    }

  const rawLikes = pick(p, "likes", "like_count", "likeCount", "nombre_likes", "total_likes", "reaction_count", "count_likes")
  // Si l'API renvoie la liste des réactions (tableau), on compte les éléments
  const likes = Array.isArray(rawLikes) ? rawLikes.length : Number(rawLikes) || 0
  const comments = Number(
    pick(p, "comments", "comment_count", "commentCount", "nombre_comments", "total_comments")
  ) || 0
  const reposts = Number(
    pick(p, "shares", "shares_count", "share_count", "reposts", "reposted", "total_shares", "repost_count")
  ) || 0

  const myReaction = pick(p, "typeLike", "type_like", "user_reaction", "my_reaction") || null
  const isLiked = pick(p, "is_like", "isLike", "liked") === true ||
    pick(p, "is_like", "isLike", "liked") === "1" ||
    pick(p, "is_like", "isLike") === 1

  // Post d'origine d'une republication (repost). L'API Dughu renvoie le post
  // d'origine imbriqué dans `post_base` (ex. postType="repost" + parent_id=X).
  // On gère aussi d'autres noms de champs possibles selon la version.
  const parentRaw = pick(
    p,
    "post_base",
    "postBase",
    "parentPost",
    "parent_post",
    "subPost",
    "sub_post",
    "repost",
    "reposted_post",
    "repostedPost",
    "originalPost",
    "original_post",
    "sharedPost",
    "shared_post",
    "source_post",
    "sourcePost",
    "quoted_post",
    "quotedPost"
  )
  const parentPost =
    parentRaw && typeof parentRaw === "object" ? mapPost(parentRaw) : null

  return {
    id: String(id),
    content: pick(p, "content", "text", "body", "description", "caption", "post_text", "postText", "message") || "",
    image: rawImages[0] ? resolveMediaUrl(rawImages[0]) : (video ? (thumb ? resolveMediaUrl(thumb) : null) : null),
    images: rawImages.map((u) => ({ url: resolveMediaUrl(u) })),
    video: video ? resolveMediaUrl(video) : null,
    thumb: video ? (thumb ? resolveMediaUrl(thumb) : null) : null,
    audio: audio ? resolveMediaUrl(audio) : null,
    // Lien canonique de partage du post fourni par l'API Dughu (ex. /post/{id}).
    // Utilisé pour partager la publication vers les réseaux sociaux.
    shareUrl: (toUrl(pick(p, "shareLink", "share_url", "shareUrl", "post_url", "postUrl", "share_link")) || null),
    createdAt: toDate(pick(p, "createdAt", "created_at", "created", "date", "post_date", "timestamp", "time")),
    author: {
      id: String(author.id),
      name: author.name,
      username: author.username,
      avatar: author.avatar,
      isFollowing: !!author.isFollowing,
    },
    page: pageAuthor
      ? { id: pageAuthor.id, name: pageAuthor.name, username: pageAuthor.username, avatar: pageAuthor.avatar }
      : null,
    color: (() => {
      const direct = pick(p, "color", "background_color", "bg_color", "color_id")
      if (direct) return direct
      // Certaines versions de l'API renvoient les composantes à plat
      const c1 = pick(p, "color_1", "color1")
      const c2 = pick(p, "color_2", "color2")
      const tc = pick(p, "text_color", "textColor")
      if (c1 || c2) {
        return { color_1: c1 || "", color_2: c2 || "", text_color: tc || "#ffffff" }
      }
      return null
    })(),
    reacted: isLiked ? (myReaction || "like") : (myReaction || null),
    isLiked,
    isFollowing: !!author.isFollowing,
    parentPost,
    reactions: extractReactionSummary(p),
    // Confidentialité renvoyée par l'API Dughu (entier 0-3) :
    //   0 = Public, 1 = Followers/Abonnés, 2 = Réseau, 3 = Amis stricts
    postPrivacy: (() => {
      const v = pick(p, "postPrivacy", "post_privacy", "privacy")
      if (v === null || v === undefined || v === "") return 0
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 && n <= 3 ? n : 0
    })(),
    _count: {
      comments,
      likes,
      reposts,
    },
  }
}

export function mapPosts(raw: any, fallbackAuthor?: any): Record<string, any>[] {
  const unwrapped = raw?.result && typeof raw.result === "object" && !Array.isArray(raw.result) ? raw.result : raw
  const arr = Array.isArray(unwrapped) ? unwrapped : unwrapped?.data || unwrapped?.posts || unwrapped?.items || unwrapped?.liste || []
  if (!Array.isArray(arr)) return []
  return arr
    .map((p) => mapPost(p, fallbackAuthor))
    .filter((p): p is Record<string, any> => p !== null)
}

export function mapAlbums(raw: any): Record<string, any>[] {
  const arr = Array.isArray(raw) ? raw : raw?.result || raw?.data || raw?.albums || []
  if (!Array.isArray(arr)) return []
  return arr
    .map((a) => {
      if (!a || typeof a !== "object") return null
      const mediaArr = Array.isArray(a?.media) ? a.media : []
      const media = mediaArr
        .map((m: any) => {
          const url = resolveMediaUrl(toUrl(pick(m, "image", "url", "link", "file", "postFile", "photo")))
          if (!url) return null
          return {
            url,
            type: String(pick(m, "media_type", "mediaType", "type") || "image"),
            postId: String(pick(m, "post_id", "postId") || ""),
          }
        })
        .filter((m: any): m is Record<string, any> => m !== null)
      const album: Record<string, any> = {
        id: String(pick(a, "album_id", "albumId", "id") || ""),
        name: String(pick(a, "album_name", "albumName", "name") || ""),
        type: String(pick(a, "type", "privacy") || "public"),
        userId: String(pick(a, "user_id", "userId") || ""),
        cover: media[0]?.url || "",
        media,
        count: media.length,
      }
      return album
    })
    .filter((a): a is Record<string, any> => a !== null && !!a.id)
}

export function mapComment(c: any, currentUserId?: string): Record<string, any> | null {
  if (!c || typeof c !== "object") return null
  const id = pick(c, "id", "ID", "comment_id", "commentId") || String(Math.random()).slice(2)
  const text = pick(c, "text", "content", "body", "message", "comment", "comment_text", "description") || ""
  const rawUser = normalizeUser(c?.user || c?.author || c?.utilisateur) || {
    id: String(pick(c, "user_id", "userId", "author_id", "authorId") || ""),
    name: pick(c, ["user_name", "userName", "username", "name"], "") || "Utilisateur",
    username: "",
    avatar: "/images/avatar.png",
  }
  const likes = Number(
    pick(c, "likes", "like_count", "likeCount", "total_likes", "reaction_count", "number_likes", "nbr_reactions")
  ) || 0
  const parentId = pick(c, "parent_id", "parentId", "reply_to", "reply_to_id") || null

  let replies: Record<string, any>[] = []
  const rawReplies =
    (Array.isArray(c?.reponses) && c?.reponses) ||
    (Array.isArray(c?.children) && c?.children) ||
    (Array.isArray(c?.answers) && c?.answers) ||
    (Array.isArray(c?.replies) && c?.replies) ||
    (Array.isArray(c?.comments) && c?.comments)
  if (rawReplies) {
    replies = rawReplies
      .map((r: any) => mapComment(r, currentUserId))
      .filter((x: any): x is Record<string, any> => x !== null)
  }

  const liked = !!(pick(c, "comentlike", "comentLike", "is_liked", "isLiked", "liked", "my_like") === true ||
    pick(c, "comentlike", "is_liked", "isLiked", "liked") === "1" ||
    pick(c, "comentlike", "is_liked", "isLiked") === 1)

  const reactionType = pick(c, "reaction", "typeLike", "type_like", "user_reaction", "my_reaction") || null

  // ── Médias du commentaire : image / vidéo / fichier générique ──
  // Selon l'origine du commentaire, l'API Dughu renvoie la pièce jointe :
  //  - via `file_path` + `file_type` (URL S3 absolue, cas des commentaires récents)
  //  - via `image`/`video`/`file` avec un chemin relatif `uploads/...` (anciens commentaires)
  const rawFilePath = pick(c, "file_path", "file", "postFile", "record", "c_file")
  const filePath = rawFilePath ? resolveMediaUrl(toUrl(rawFilePath)) : null
  const rawFileType = String(pick(c, "file_type", "fileType") || "").toLowerCase()

  const explicitImage = toUrl(pick(c, "image", "file_thumbnail", "thumbnail_url"))
  const explicitVideo = toUrl(pick(c, "video", "postVideoURL", "postYoutube", "postVimeo"))

  // Type déduit des champs image/video/file méme quand file_type est absent
  const fileType = rawFileType || detectMediaTypeFromUrl(explicitImage || explicitVideo || filePath || "")
  const isImage = fileType.startsWith("image")
  const isVideo = fileType.startsWith("video")

  const image = (explicitImage ? resolveMediaUrl(explicitImage) : "") || (isImage && filePath ? filePath : null)
  const video = (explicitVideo ? resolveMediaUrl(explicitVideo) : "") || (isVideo && filePath ? filePath : null)
  const file = !isImage && !isVideo && filePath ? filePath : null

  return {
    id: String(id),
    content: String(text),
    userId: String(rawUser.id),
    isMine: currentUserId ? String(rawUser.id) === String(currentUserId) : false,
    parentId: parentId ? String(parentId) : null,
    createdAt: toDate(pick(c, "createdAt", "created_at", "created", "date", "timestamp", "time")),
    liked,
    likesCount: likes,
    reactionType: Array.isArray(reactionType) ? null : reactionType,
    image,
    video,
    file,
    fileType,
    replies,
    user: {
      id: String(rawUser.id),
      name: rawUser.name,
      username: rawUser.username || "",
      avatar: rawUser.avatar,
    },
  }
}

export function mapComments(raw: any, currentUserId?: string): Record<string, any>[] {
  if (!raw || typeof raw !== "object") return []
  const unwrapped = raw?.comments && typeof raw.comments === "object" && !Array.isArray(raw.comments)
    ? raw.comments
    : raw?.result && typeof raw.result === "object" && !Array.isArray(raw.result)
      ? raw.result
      : raw
  const arr = Array.isArray(unwrapped) ? unwrapped : unwrapped?.data || unwrapped?.comments || unwrapped?.items || []
  if (!Array.isArray(arr)) return []
  return arr
    .map((c) => mapComment(c, currentUserId))
    .filter((x): x is Record<string, any> => x !== null)
}

export function getPageInfo(raw: any): { hasMore: boolean; page: number } {
  const unwrapped = raw?.result && typeof raw.result === "object" && !Array.isArray(raw.result) ? raw.result : raw
  const page = Number(pick(unwrapped, "page", "current_page", "currentPage") || 1) || 1
  const totalPages = Number(
    pick(unwrapped, "total_pages", "totalPages", "last_page", "lastPage", "pages", "page_count") || 1
  ) || 1
  const hasMore =
    !!pick(unwrapped, "has_more", "hasMore", "next_page", "nextPage") ||
    !!pick(unwrapped, "next_page_url", "nextPageUrl", "nextPageUrl") ||
    page < totalPages
  return { hasMore, page }
}
