/**
 * Mappeur du domaine Pages — normalisation défensive des réponses brutes de
 * l'API Dughu vers les modèles métier (src/types/pages/pages.types.ts).
 *
 * ⚠️ Seuls les champs affichables sont conservés : e-mails, tokens et réglages
 * privés présents dans les objets `user` imbriqués ne sortent jamais du serveur.
 */

import type {
  DughuPage,
  InvitableUser,
  PageAdmin,
  PageAdminPrivileges,
  PageCategory,
  PageImage,
  PageLike,
  PageOffer,
  PagePost,
} from "@/types/pages/pages.types"
import { resolveMediaUrl } from "@/lib/dughu"

/* eslint-disable @typescript-eslint/no-explicit-any */

function pick(source: any, keys: string[]): any {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null && value !== "") return value
  }
  return undefined
}

function bool(value: any, defaultValue = false): boolean {
  return value === true || value === 1 || value === "1" || value === "true" ? true : value === undefined ? defaultValue : false
}

function num(value: any): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function str(value: any, fallback = ""): string {
  return value === undefined || value === null ? fallback : String(value)
}

function toIso(value: any): string {
  if (typeof value !== "string" || !value) return ""
  const iso = value.includes("T") ? value : value.replace(" ", "T")
  const date = new Date(iso.endsWith("Z") ? iso : `${iso}Z`)
  if (!Number.isNaN(date.getTime())) return date.toISOString()
  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? "" : fallback.toISOString()
}

function media(value: any, fallback = "/images/avatar.png"): string {
  const s = str(value)
  return s || fallback
}

/** Normalise la liste d'admins d'une page (privilèges en champs plats). */
export function mapPageAdmins(raw: any): PageAdmin[] {
  const list = Array.isArray(raw) ? raw : []
  return list
    .filter((admin): admin is Record<string, any> => !!admin && typeof admin === "object")
    .map((admin) => {
      const privileges: PageAdminPrivileges = {
        general: bool(admin.general),
        info: bool(admin.info),
        social: bool(admin.social),
        avatar: bool(admin.avatar),
        design: bool(admin.design),
        admins: bool(admin.admins),
        analytics: bool(admin.analytics),
        deletePage: bool(admin.delete_page || admin.deletePage),
      }
      return {
        id: str(admin.id),
        userId: str(pick(admin, ["user_id", "userId"])),
        pageId: str(pick(admin, ["page_id", "pageId"])),
        name: "",
        username: "",
        avatar: "/images/avatar.png",
        privileges,
      }
    })
    .filter((admin) => admin.id || admin.userId)
}

/** Normalise une page brute (formes : userPages / getPage / show/pages / userLikedPages…). */
export function mapPage(raw: any): DughuPage | null {
  if (!raw || typeof raw !== "object") return null
  const pageId = str(pick(raw, ["page_id", "pageId", "id"]))
  if (!pageId) return null

  const instagram = str(pick(raw, ["instgram", "instagram"]))

  return {
    pageId,
    userId: str(pick(raw, ["user_id", "userId"])),
    pageName: str(pick(raw, ["page_name", "pageName", "name"])),
    pageTitle: str(pick(raw, ["page_title", "pageTitle", "title"])),
    pageDescription: str(pick(raw, ["page_description", "pageDescription", "description"])),
    avatar: media(pick(raw, ["avatar"])),
    cover: media(pick(raw, ["cover", "cover_image"])),
    usersPost: bool(pick(raw, ["users_post", "usersPost"]), false),
    pageCategory: str(pick(raw, ["page_category", "pageCategory"])),
    subCategory: str(pick(raw, ["sub_category", "subCategory"])),
    website: str(pick(raw, ["website"])),
    facebook: str(pick(raw, ["facebook"])),
    instagram,
    twitter: str(pick(raw, ["twitter"])),
    linkedin: str(pick(raw, ["linkedin"])),
    youtube: str(pick(raw, ["youtube"])),
    vk: str(pick(raw, ["vk"])),
    google: str(pick(raw, ["google"])),
    company: str(pick(raw, ["company"])),
    phone: str(pick(raw, ["phone"])),
    address: str(pick(raw, ["address"])),
    pointsRecipient: str(pick(raw, ["points_recipient", "pointsRecipient"])),
    verified: bool(pick(raw, ["verified"]), false),
    verificationStatus: str(pick(raw, ["verification_status", "verificationStatus"]), "none"),
    boosted: bool(pick(raw, ["boosted"]), false),
    active: bool(pick(raw, ["active"]), true),
    nbrPost: num(pick(raw, ["nbrPost", "nb_post", "post_count"])),
    likeCount: num(pick(raw, ["like_count", "count_like", "likes_count", "likes"])),
    isLiked: bool(pick(raw, ["is_like", "is_like_user_auth", "isLiked"]), false),
    isAdmin: bool(pick(raw, ["is_admin", "isAdmin"]), false),
    categoryName: str(pick(raw, ["categoryName", "category_name"])),
    registered: str(pick(raw, ["registered"])),
    createdAt: toIso(pick(raw, ["created_at", "createdAt"])),
    admins: mapPageAdmins(raw?.admins),
  }
}

/** Normalise une liste de pages ({ result: {data: [...] } } ou tableau brut). */
export function mapPagesList(raw: any): DughuPage[] {
  const unwrapped = raw?.result && typeof raw.result === "object" ? raw.result : raw
  const list = Array.isArray(unwrapped) ? unwrapped : Array.isArray(unwrapped?.data) ? unwrapped.data : []
  return list
    .map((item: any) => mapPage(item))
    .filter((page: DughuPage | null): page is DughuPage => page !== null)
}

/** Extraction d'un paginateur Laravel ({ current_page, last_page, per_page, total, data }). */
export function getPaginatorMeta(raw: any): { hasMore: boolean; page: number; total: number } {
  const unwrapped = raw?.result && typeof raw.result === "object" ? raw.result : raw
  const page = num(unwrapped?.current_page) || 1
  const lastPage = num(unwrapped?.last_page) || page
  const total = num(unwrapped?.total)
  return { hasMore: page < lastPage, page, total }
}

/** Normalise les catégories (GET /getPageCategories → result: [...]). */
export function mapPageCategories(raw: any): PageCategory[] {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.result) ? raw.result : []
  return list
    .filter((c: any) => !!c && typeof c === "object")
    .map((c: any) => ({
      id: str(pick(c, ["id", "category_id"])),
      name: str(pick(c, ["name", "lang_name"])),
      langKey: str(pick(c, ["lang_key", "langKey"])),
    }))
    .filter((c: PageCategory) => c.id && c.name)
}

/** Normalise la liste des likes d'une page ({ likes: { data: [{ user }] } }). */
export function mapPageLikes(raw: any): PageLike[] {
  const likes = raw?.likes ?? raw?.result ?? raw
  const list = Array.isArray(likes) ? likes : Array.isArray(likes?.data) ? likes.data : []
  const mapped: PageLike[] = []
  for (const item of list) {
    const user = item?.user ?? item
    const id = str(pick(user, ["user_id", "userId", "id"]))
    if (!id) continue
    mapped.push({
      id: str(item?.id || id),
      userId: id,
      name: str(user?.first_name) ? `${str(user?.first_name)} ${str(user?.last_name || "")}`.trim() : str(pick(user, ["name", "username"]), "Utilisateur"),
      username: str(pick(user, ["username"])),
      avatar: media(pick(user, ["avatar"])),
    })
  }
  return mapped
}

/** Normalise les publications d'une page (GET /getPostPageUser/{id}). */
export function mapPagePosts(raw: any): PagePost[] {
  const unwrapped = raw?.result && typeof raw.result === "object" ? raw.result : raw
  const list = Array.isArray(unwrapped) ? unwrapped : Array.isArray(unwrapped?.data) ? unwrapped.data : []
  return list
    .filter((p: any) => !!p && typeof p === "object")
    .map((p: any) => ({
      id: str(pick(p, ["id", "post_id", "postId"])),
      content: str(pick(p, ["postText", "post_text", "text", "content", "description"])),
      image: media(pick(p, ["postFile", "postPhoto", "postFileThumb", "postLinkImage", "image"]), "") || undefined,
      video: str(pick(p, ["postVideoURL", "postVimeo", "video", "hls_playlist"])),
      createdAt: toIso(pick(p, ["created_at", "createdAt", "time"])),
    }))
    .filter((p: PagePost) => p.id)
}

/** Normalise la galerie d'images (GET /imagePage/{id} → posts.data). */
export function mapPageImages(raw: any): PageImage[] {
  const unwrapped = raw?.posts && typeof raw.posts === "object" ? raw.posts : raw?.result && typeof raw.result === "object" ? raw.result : raw
  const list = Array.isArray(unwrapped) ? unwrapped : Array.isArray(unwrapped?.data) ? unwrapped.data : []
  const urls: PageImage[] = []
  const seen = new Set<string>()
  for (const item of list) {
    const url = media(
      pick(item, ["postFile", "postPhoto", "postFileThumb", "thumbnail", "image", "photo", "url", "file"]),
      ""
    )
    if (!url || seen.has(url)) continue
    seen.add(url)
    urls.push({ id: str(pick(item, ["id"])) || url, url })
  }
  return urls
}

/** Normalise une offre (GET /offers/show/{id} ou élément de getPageOffers). */
export function mapOffer(raw: any): PageOffer | null {
  if (!raw || typeof raw !== "object") return null
  const id = str(pick(raw, ["id", "offer_id"]))
  if (!id) return null
  return {
    id,
    pageId: str(pick(raw, ["page_id", "pageId"])),
    userId: str(pick(raw, ["user_id", "userId"])),
    discountType: str(pick(raw, ["discount_type", "discountType"]), "discount_percent"),
    discountPercent: num(pick(raw, ["discount_percent", "discountPercent"])),
    discountAmount: num(pick(raw, ["discount_amount", "discountAmount"])),
    discountedItems: str(pick(raw, ["discounted_items", "discountedItems"])),
    buy: num(pick(raw, ["buy"])),
    getPrice: num(pick(raw, ["get_price", "getPrice"])),
    spend: num(pick(raw, ["spend"])),
    amountOff: num(pick(raw, ["amount_off", "amountOff"])),
    description: str(pick(raw, ["description"])),
    createdAt: toIso(pick(raw, ["created_at", "createdAt"])),
  }
}

/** Normalise une liste d'offres (GET /getPageOffers → page + offers/result). */
export function mapOffersList(raw: any): PageOffer[] {
  const offers = raw?.offers ?? raw?.result ?? raw
  const list = Array.isArray(offers) ? offers : Array.isArray(offers?.data) ? offers.data : []
  return list
    .map((item: any) => mapOffer(item))
    .filter((offer: PageOffer | null): offer is PageOffer => offer !== null)
}

/** Normalise la liste d'amis invitables (POST /invitePageList → result.data). */
export function mapInvitableUsers(raw: any): InvitableUser[] {
  const unwrapped = raw?.result && typeof raw.result === "object" ? raw.result : raw
  const list = Array.isArray(unwrapped) ? unwrapped : Array.isArray(unwrapped?.data) ? unwrapped.data : []
  return list
    .filter((u: any) => !!u && typeof u === "object")
    .map((u: any) => ({
      id: str(pick(u, ["user_id", "userId", "id"])),
      name: str(u?.first_name) ? `${str(u.first_name)} ${str(u.last_name || "")}`.trim() : str(pick(u, ["name", "username"]), "Utilisateur"),
      username: str(pick(u, ["username"])),
      avatar: media(pick(u, ["avatar"])),
    }))
    .filter((u: InvitableUser) => u.id)
}