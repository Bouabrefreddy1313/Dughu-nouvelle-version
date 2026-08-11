/* eslint-disable @typescript-eslint/no-explicit-any */
const BASE_URL = (process.env.DUGHU_API_BASE_URL || "https://apitest.dughu.com/api").replace(/\/+$/, "")
const API_TOKEN = process.env.DUGHU_API_KEY || ""
const TIMEOUT_MS = (Number(process.env.DUGHU_API_TIMEOUT) || 15) * 1000
const RETRY_TIMES = Number(process.env.DUGHU_API_RETRY_TIMES) || 2
const RETRY_SLEEP_MS = Number(process.env.DUGHU_API_RETRY_SLEEP) || 200

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

async function dughuFetch(path: string, init: RequestInit = {}, retries = RETRY_TIMES): Promise<any> {
  if (!API_TOKEN) {
    throw new DughuApiError("DUGHU_API_KEY manquant dans .env", 500)
  }
  const url = `${BASE_URL}/${path.replace(/^\/+/, "")}`

  let attempt = 0
  while (true) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const headers = new Headers(init.headers)
      headers.set("X-AppApiToken", API_TOKEN)
      headers.set("Accept", "application/json")
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

  login: (login: string, password: string) => dughu.form("login", { login, password }),

  createPost: (formData: FormData) => dughu.multipart("post", formData),

  addComment: (formData: FormData) => dughu.multipart("add_comment", formData),

  replyComment: (formData: FormData) => dughu.multipart("replyComment", formData),

  toggleLikePost: (formData: FormData) => dughu.multipart("toggleLikePost", formData),

  getUser: (identifier: string | number, viewer: string | number) =>
    dughu.get(`getSpecificUser/${encodeURIComponent(String(identifier))}/${encodeURIComponent(String(viewer))}`),

  getUserPosts: (userId: string | number, authUserId: string | number, page: number) =>
    dughu.form("userPost", { user_id: String(userId), auth_user_id: String(authUserId), page: String(page) }),

  getPostPageUser: (userId: string | number, page: number) =>
    dughu.get(`getPostPageUser/${encodeURIComponent(String(userId))}`, { page }),

  getComments: (postId: string | number, userId: string | number) =>
    dughu.get(`getComments/${encodeURIComponent(String(postId))}/${encodeURIComponent(String(userId))}`),

  getUserPhotos: (username: string, page: number) =>
    dughu.get(`profile/${encodeURIComponent(username)}/photos`, { page }),

  getUserActivities: (username: string, page: number) =>
    dughu.get(`profile/${encodeURIComponent(username)}/activites`, { page }),

  getUserFriends: (userId: string | number) => dughu.get(`userFriends/${encodeURIComponent(String(userId))}`),

  getFollowers: (userId: string | number, authUserId: string | number) =>
    dughu.get(`listFollowers/${encodeURIComponent(String(userId))}/${encodeURIComponent(String(authUserId))}`),

  getFollowing: (userId: string | number, authUserId: string | number) =>
    dughu.get(`listFollowing/${encodeURIComponent(String(userId))}/${encodeURIComponent(String(authUserId))}`),

  follow: (authUserId: string | number, userId: string | number) =>
    dughu.form("follow", { auth_user_id: String(authUserId), user_id: String(userId) }),

  unfollow: (authUserId: string | number, userId: string | number) =>
    dughu.form("unfollow", { auth_user_id: String(authUserId), user_id: String(userId) }),

  updateProfile: (formData: FormData) => dughu.multipart("updateProfile", formData),

  getLikedPosts: (userId: string | number) => dughu.get(`postLikeToUser/${encodeURIComponent(String(userId))}`),

  getReferrals: (userId: string | number) => dughu.get(`getUserReferer/${encodeURIComponent(String(userId))}`),
}

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

function normalizeBirthday(v: any): string {
  if (typeof v !== "string") return ""
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return v
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
  return {
    id: String(id),
    firstName: String(firstName),
    lastName: String(lastName),
    name: String(name),
    username: pick(u, ["username", "user_name", "userName", "slug"], ""),
    slug: pick(u, ["slug", "username", "user_name"], ""),
    email: pick(u, ["email", "mail"], ""),
    avatar: toUrl(pick(u, ["avatar", "profileImage", "profile_image", "profile_image_url", "profile_picture", "profilePicture", "photo", "image"], "")) || "/images/avatar.png",
    cover: toUrl(
      pick(u, ["cover", "cover_image", "coverImage", "background", "banner", "coverImageUrl"], "")
    ) || "/images/group/default-cover.jpg",
    bio: pick(u, ["bio", "about", "description", "about_me"], ""),
    gender: pick(u, ["gender", "sexe", "sex"], ""),
    phone: pick(u, ["phone", "phone_number", "phoneNumber", "telephone"], ""),
    birthdate: normalizeBirthday(pick(u, ["birthdate", "birthday", "dateNaissance", "dob"], "")) || null,
    isFollowing: !!(pick(u, ["is_following", "isFollowing", "follow_status", "followStatus", "following"], false) === true ||
      pick(u, ["is_following", "isFollowing", "follow_status"], "0") === "1"),
  }
}

export function parseCounts(details: string | any): Record<string, number> {
  let raw: any = details
  if (typeof details === "string") {
    try {
      raw = JSON.parse(details)
    } catch {
      return {}
    }
  }
  if (!raw || typeof raw !== "object") return {}
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
  const url = toUrl(pick(p, ["postFileLink", "file", "fileLink", "image", "photo", "url", "link"], ""))
  if (!url) return null
  return {
    id: String(id),
    url,
    createdAt: pick(p, ["createdAt", "created_at", "date", "uploaded_at"], "") || "",
  }
}

export function mapPhotos(raw: any): Record<string, any>[] {
  const arr = Array.isArray(raw) ? raw : raw?.data || raw?.photos || raw?.items || []
  if (!Array.isArray(arr)) return []
  return arr.map(normalizePhoto).filter((x): x is Record<string, any> => x !== null)
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

function toDate(v: any): string {
  if (!v) return new Date().toISOString()
  if (typeof v === "number") return new Date(v * 1000).toISOString()
  const s = String(v)
  if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000).toISOString()
  if (/^\d{13}$/.test(s)) return new Date(Number(s)).toISOString()
  return s
}

function postImages(p: any): string[] {
  const urls: string[] = []
  const image = pick(p, "postFile", "postPhoto", "postFileThumb", "thumbnail_url", "image", "photo", "photoUrl", "photo_url", "postFileLink", "file", "thumb", "thumbnail")
  if (image) {
    if (Array.isArray(image)) {
      for (const u of image) {
        const url = toUrl(typeof u === "object" ? pick(u, "url", "link", "file", "postFileLink", "thumb", "thumbnail") : u)
        if (url) urls.push(url)
      }
    } else {
      const url = toUrl(image)
      if (url) urls.push(url)
    }
  }
  const frames = pick(p, "images", "photos", "files", "media", "attachments", "multi_image_post")
  if (Array.isArray(frames)) {
    for (const f of frames) {
      if (typeof f === "string") {
        const u = toUrl(f)
        if (u) urls.push(u)
      } else if (f && typeof f === "object") {
        const u = toUrl(pick(f, "postFileLink", "file", "fileLink", "image", "photo", "url", "link", "thumb", "thumbnail"))
        if (u) urls.push(u)
      }
    }
  }
  return urls
}

export function mapPost(p: any, fallbackAuthor?: any): Record<string, any> | null {
  if (!p || typeof p !== "object") return null
  const id = pick(p, "id", "ID", "post_id", "postId") || String(Math.random()).slice(2)
  const images = postImages(p)

  const pageAuthor = p?.page
    ? {
        id: String(p.page.page_id || p.page.id || ""),
        name: p.page.page_name || p.page.page_title || "Page",
        username: p.page.page_title || p.page.username || "",
        avatar: toUrl(p.page.avatar) || "/images/avatar.png",
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
    }

  const likes = Number(
    pick(p, "likes", "like_count", "likeCount", "nombre_likes", "total_likes", "reaction_count", "count_likes")
  ) || 0
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

  return {
    id: String(id),
    content: pick(p, "content", "text", "body", "description", "caption", "post_text", "postText", "message") || "",
    image: images[0] || null,
    images: images.map((u) => ({ url: u })),
    video: toUrl(
      pick(p, "video", "videoLink", "video_link", "videoUrl", "video_url", "postVideoURL", "postYoutube", "postVimeo", "hls_playlist")
    ) || null,
    createdAt: toDate(pick(p, "createdAt", "created_at", "created", "date", "post_date", "timestamp", "time")),
    author: {
      id: String(author.id),
      name: author.name,
      username: author.username,
      avatar: author.avatar,
    },
    page: pageAuthor
      ? { id: pageAuthor.id, name: pageAuthor.name, username: pageAuthor.username, avatar: pageAuthor.avatar }
      : null,
    color: pick(p, "color", "background_color") || null,
    reacted: isLiked ? (myReaction || "like") : (myReaction || null),
    isLiked,
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

  return {
    id: String(id),
    content: String(text),
    userId: String(rawUser.id),
    parentId: parentId ? String(parentId) : null,
    createdAt: toDate(pick(c, "createdAt", "created_at", "created", "date", "timestamp", "time")),
    liked,
    likesCount: likes,
    reactionType: Array.isArray(reactionType) ? null : reactionType,
    image: toUrl(pick(c, "image", "file", "file_thumbnail", "file_path", "thumbnail_url")) || null,
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