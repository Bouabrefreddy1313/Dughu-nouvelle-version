/**
 * Service SERVEUR du domaine Pages — utilisé UNIQUEMENT par les Route Handlers
 * /api/pages. Il appelle l'API Dughu avec l'instance Axios serveur (token
 * X-AppApiToken côté serveur uniquement), normalise les réponses via le
 * mappeur et ne retourne que des modèles métier.
 *
 * ⚠️ Sémantique vérifiée sur apitest :
 *  - GET /getPage/{id} IGNORE l'id (résidu Postman) → renvoie le FEED GLOBAL
 *    des pages ?page=N (+ recherche `searchTerm`) : utilisé pour la découverte.
 *  - POST /show/pages est LE détail d'une page (result = objet page + admins).
 *  - "listUserLikeAdmin" (même URL que page/inviteFriend) : incohérence backend.
 *    Ici : POST /invitePageList = liste des invités, POST /page/inviteFriend =
 *    inviter, GET /getPageLikes = liste des likes.
 *  - Deux endpoints de suppression existent ("delete Page" / "destroy Page") :
 *    seul /destroyPage/{id} est utilisé (avec confirmation par mot de passe).
 */

import { dughuServerForm, dughuServerGet, dughuServerMultipart } from "@/lib/api/server/dughu-instance"
import { ApiError } from "@/lib/api/api-error"
import { getPageInfo, mapPosts } from "@/lib/dughu"
import {
  getPaginatorMeta,
  mapInvitableUsers,
  mapOffer,
  mapOffersList,
  mapPage,
  mapPageCategories,
  mapPageImages,
  mapPageLikes,
  mapPagePosts,
  mapPagesList,
} from "./pages.mapper"
import type {
  BoostPrice,
  DughuPage,
  InvitableUser,
  PageCategory,
  PageFormValues,
  PageImage,
  PageLike,
  PageMutationResponse,
  PageOffer,
  PagePost,
  PageSocialLinks,
  PagesListResponse,
  PageStatistics,
} from "@/types/pages/pages.types"

/* eslint-disable @typescript-eslint/no-explicit-any */

function failure(message: string): PagesListResponse {
  return { success: false, message, pages: [], hasMore: false, page: 1 }
}

async function requestGet<T = unknown>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  try {
    return await dughuServerGet<T>(path, params, { retry: true })
  } catch (error) {
    throw new ApiError("Impossible de contacter l'API Dughu.", { cause: error, status: 500 })
  }
}

async function requestForm<T = unknown>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  try {
    return await dughuServerForm<T>(path, params)
  } catch (error) {
    // Les erreurs 4xx de l'API Dughu (ex. 401 mot de passe incorrect sur
    // destroyPage) sont propagées avec leur statut pour un message utilisateur
    // précis ; seules les erreurs réseau/5xx sont wrappées en générique.
    if (error instanceof ApiError && error.status !== undefined && error.status >= 400 && error.status < 500) {
      throw error
    }
    throw new ApiError("Impossible de contacter l'API Dughu.", { cause: error, status: 500 })
  }
}

export type PagesScope = "feed" | "mine" | "liked" | "suggestions" | "administered"

/**
 * Liste des pages selon la portée :
 *  - feed          → GET /getPage/{0}?page=&searchTerm (découverte globale)
 *  - mine          → POST /userPages { auth_user_id, user_id }
 *  - liked         → POST /userLikedPages?page= { user_id }
 *  - suggestions   → POST /suggestPages?page= { user_id }
 *  - administered  → POST /pageAdminsUser { user_id }
 */
export async function fetchPages(scope: PagesScope, userId: string, page = 1, search = ""): Promise<PagesListResponse> {
  if (!userId) return failure("Identifiant utilisateur requis.")
  const searchTerm = search.trim() || undefined

  try {
    if (scope === "mine") {
      const raw = await requestForm<any>("userPages", { auth_user_id: userId, user_id: userId })
      if (raw?.success === false) return failure("Impossible de charger vos espaces.")
      return { success: true, pages: mapPagesList(raw), hasMore: false, page: 1 }
    }
    if (scope === "liked") {
      const raw = await requestForm<any>(`userLikedPages?page=${page}`, { user_id: userId, searchTerm })
      if (raw?.success === false) return failure("Impossible de charger vos espaces aimés.")
      const meta = getPaginatorMeta(raw)
      return { success: true, pages: mapPagesList(raw), hasMore: meta.hasMore, page: meta.page }
    }
    if (scope === "suggestions") {
      const raw = await requestForm<any>(`suggestPages?page=${page}`, { user_id: userId, page, searchTerm })
      if (raw?.success === false) return failure("Impossible de charger les suggestions.")
      const meta = getPaginatorMeta(raw)
      return { success: true, pages: mapPagesList(raw), hasMore: meta.hasMore, page: meta.page }
    }
    if (scope === "administered") {
      const raw = await requestForm<any>("pageAdminsUser", { user_id: userId, searchTerm })
      if (raw?.success === false) return failure("Impossible de charger vos espaces administrés.")
      return { success: true, pages: mapPagesList(raw), hasMore: false, page: 1 }
    }

    // scope === "feed" → GET /getPage/{id} : l'id est IGNORÉ par l'API
    // (constat sur apitest), l'endpoint sert de découverte globale paginée.
    const raw = await requestGet<any>("getPage/0", { page, searchTerm })
    if (raw?.success === false) return failure("Impossible de charger les espaces.")
    const meta = getPaginatorMeta(raw)
    return { success: true, pages: mapPagesList(raw), hasMore: meta.hasMore, page: meta.page }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de charger les espaces.", { cause: error, status: 500 })
  }
}
/* ─────────────────────────────── LECTURES ─────────────────────────────── */

/** Détail complet d'une page (POST /show/pages). */
export async function fetchPageDetail(userId: string, pageId: string): Promise<{ success: boolean; message?: string; page?: DughuPage }> {
  if (!userId || !pageId) return { success: false, message: "Paramètres requis." }
  const raw = await requestForm<any>("show/pages", { user_id: userId, page_id: pageId })
  if (raw?.success === false) return { success: false, message: "Page introuvable." }
  const page = mapPage(raw?.result ?? raw)
  return page ? { success: true, page } : { success: false, message: "Page introuvable." }
}

/** Catégories de pages (GET /getPageCategories). */
export async function fetchPageCategories(): Promise<PageCategory[]> {
  const raw = await requestGet<any>("getPageCategories")
  if (raw?.success === false) return []
  return mapPageCategories(raw)
}

/**
 * Publications d'une page spécifique (POST /show/pages + getPostPageUser/{userId}).
 *
 * L'API Dughu ne fournit pas d'endpoint direct par pageId : on charge les posts
 * du propriétaire de la page (getPostPageUser/{userId}) puis on filtre côté serveur
 * pour ne garder que les posts publiés dans cette page spécifique (page_id == pageId).
 *
 * Retourne des posts au format PostCard complet (mapPosts), directement consommables.
 */
export async function fetchPagePosts(pageId: string, page = 1): Promise<{ success: boolean; posts: Record<string, any>[]; hasMore: boolean; page?: number }> {
  // 1. Récupérer les infos de la page pour construire le fallbackAuthor et obtenir le userId
  let pageInfo: { id: string; name: string; avatar: string; userId: string } | null = null
  try {
    const detail = await requestForm<any>("show/pages", { page_id: pageId })
    const p = detail?.result ?? detail
    if (p) {
      pageInfo = {
        id: String(p.page_id || p.id || pageId),
        name: String(p.page_name || p.page_title || p.name || "Page"),
        avatar: String(p.avatar || "/images/avatar.png"),
        userId: String(p.user_id || p.userId || ""),
      }
    }
  } catch {}

  // 2. Charger les posts via le userId de la page
  const targetId = pageInfo?.userId || pageId
  const raw = await requestGet<any>(`getPostPageUser/${encodeURIComponent(targetId)}`, { page })
  if (raw?.success === false) return { success: false, posts: [], hasMore: false }

  // 3. Extraire la liste brute et filtrer uniquement les posts de cet espace (page_id == pageId)
  const unwrapped = raw?.result && typeof raw.result === "object" ? raw.result : raw
  const list: any[] = Array.isArray(unwrapped) ? unwrapped : Array.isArray(unwrapped?.data) ? unwrapped.data : []
  const filtered = list.filter((p: any) => {
    const postPageId = String(p?.page_id || p?.page?.page_id || p?.page?.id || "")
    return postPageId === String(pageId)
  })

  // 4. Mapper avec mapPosts (format PostCard complet) + fallbackAuthor = la page
  const fallback = pageInfo
    ? { id: pageInfo.id, name: pageInfo.name, avatar: pageInfo.avatar, username: pageInfo.name, pageId: pageInfo.id }
    : undefined

  // Reconstruire un objet compatible avec mapPosts (qui attend la structure complète)
  const rawForMapper = { ...raw, result: filtered, data: filtered }
  const posts = mapPosts(rawForMapper, fallback) as Record<string, any>[]

  return { success: true, posts, hasMore: false, page }
}

/**
 * Fil d'actualité des publications des espaces (GET /getPostPageUser/{user_id}?page=N).
 *
 * Même mapper que le fil principal (`mapPosts`) : les posts renvoyés sont
 * directement consommables par la carte `PostCard` (auteur = page, réactions,
 * compteurs likes/commentaires/repartages, lien de partage).
 *
 * L'endpoint répond parfois `success: false` (« Utilisateur non trouvé ») de
 * façon intermittente alors que l'utilisateur existe : un seul nouvel essai est
 * effectué (lecture idempotente — retry autorisé), puis l'échec est retourné
 * tel quel pour affichage d'un état d'erreur propre.
 */
export async function fetchPagesPostsFeed(
  userId: string,
  page = 1
): Promise<{ success: boolean; message?: string; posts: Record<string, any>[]; hasMore: boolean; page: number }> {
  const request = () => requestGet<any>(`getPostPageUser/${encodeURIComponent(userId)}`, { page })
  let raw = await request()
  if (raw?.success === false) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    raw = await request()
  }
  if (raw?.success === false) {
    return { success: false, message: raw?.message, posts: [], hasMore: false, page }
  }
  const posts = mapPosts(raw) as Record<string, any>[]
  const info = getPageInfo(raw)
  // Fallback pagination : si le paginateur n'expose pas de page suivante, on
  // considère qu'il y a une suite tant qu'une page pleine est reçue (5 posts).
  return { success: true, posts, hasMore: info.hasMore || posts.length >= 5, page: info.page || page }
}

/** Galerie d'images de la page (GET /imagePage/{id}?page=N). */
export async function fetchPageImages(pageId: string, page = 1): Promise<{ success: boolean; images: PageImage[]; hasMore: boolean }> {
  const raw = await requestGet<any>(`imagePage/${encodeURIComponent(pageId)}`, { page })
  if (raw?.success === false) return { success: false, images: [], hasMore: false }
  return { success: true, images: mapPageImages(raw), hasMore: getPaginatorMeta(raw?.posts || raw).hasMore }
}

/** Likes d'une page (GET /getPageLikes/{id}). */
export async function fetchPageLikes(pageId: string): Promise<{ success: boolean; likes: PageLike[] }> {
  const raw = await requestGet<any>(`getPageLikes/${encodeURIComponent(pageId)}`)
  if (raw?.success === false) return { success: false, likes: [] }
  return { success: true, likes: mapPageLikes(raw) }
}

/** Amis invitables (POST /invitePageList { per_page, user_id, page_id }). */
export async function fetchInvitableFriends(userId: string, pageId: string, perPage = 100): Promise<InvitableUser[]> {
  const raw = await requestForm<any>("invitePageList", { per_page: perPage, user_id: userId, page_id: pageId })
  if (raw?.success === false) return []
  return mapInvitableUsers(raw)
}

/** Statistiques d'une page (GET /page/{id}/statistic/{user_id}?filter=all|day|week|month). */
export async function fetchPageStats(pageId: string, userId: string, filter = "all"): Promise<PageStatistics> {
  let raw: any
  try {
    // Appel direct (sans requestGet) : l'API renvoie HTTP 403 si l'utilisateur
    // n'est pas admin de la page — ce statut doit être propagé à la route.
    raw = await dughuServerGet<any>(
      `page/${encodeURIComponent(pageId)}/statistic/${encodeURIComponent(userId)}`,
      { filter },
      { retry: true }
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      throw new ApiError("Accès refusé : statistiques réservées aux administrateurs de l'espace.", { status: 403 })
    }
    throw new ApiError("Impossible de charger les statistiques.", { cause: error, status: 500 })
  }
  if (raw?.success === false) throw new ApiError("Accès refusé : statistiques réservées aux administrateurs de l'espace.", { status: 403 })
  return (raw?.result ?? raw) as PageStatistics
}
/* ─────────────────────────────── MUTATIONS ─────────────────────────────── */

/**
 * Crée ou met à jour une page (POST /page). Si `pageId` est fourni → édition.
 * Body : user_id, page_id?, page_name, page_title, page_description,
 * page_category, website, phone, address, users_post.
 */
export async function createOrUpdatePage(userId: string, values: PageFormValues & { pageId?: string }): Promise<PageMutationResponse> {
  const raw = await requestForm<any>("page", {
    user_id: userId,
    page_id: values.pageId || undefined,
    page_name: values.pageName,
    page_title: values.pageTitle,
    page_description: values.pageDescription,
    page_category: values.pageCategory,
    website: values.website,
    phone: values.phone,
    address: values.address,
    users_post: values.usersPost ? "1" : "0",
  })
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}

/** Like / unlike d'une page (POST /likePage) → is_like. */
export async function likePage(pageId: string, userId: string): Promise<{ success: boolean; message?: string; isLike?: boolean }> {
  const raw = await requestForm<any>("likePage", { page_id: pageId, user_id: userId })
  const isLike = raw?.is_like === true || raw?.is_like === 1 || raw?.is_like === "1"
  return { success: raw?.success !== false, message: raw?.message, isLike: raw?.success === false ? undefined : isLike }
}

/** Prix d'un boost (POST /boostPrice { days }) → { points, fcfa }. */
export async function fetchBoostPrice(days: number): Promise<BoostPrice> {
  const raw = await requestForm<any>("boostPrice", { days })
  if (raw?.success === false) throw new ApiError("Impossible de calculer le prix du boost.", { status: 502 })
  return { points: Number(raw?.points) || 0, fcfa: Number(raw?.fcfa) || 0 }
}

/** Booster une page (POST /boostPage { days, page_id, user_id }). */
export async function boostPage(pageId: string, userId: string, days: number): Promise<PageMutationResponse> {
  const raw = await requestForm<any>("boostPage", { days, page_id: pageId, user_id: userId })
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}

/** Supprime une page — CONFIRMATION PAR MOT DE PASSE (POST /destroyPage/{id}). */
export async function destroyPage(pageId: string, password: string): Promise<PageMutationResponse> {
  let raw: any
  try {
    raw = await requestForm<any>(`destroyPage/${encodeURIComponent(pageId)}`, { password })
  } catch (error) {
    // L'API répond 401 { message: "Mot de passe incorrect." } → message sûr.
    if (error instanceof ApiError && error.status === 401) {
      return { success: false, message: "Mot de passe incorrect." }
    }
    return { success: false, message: "Impossible de supprimer l'espace." }
  }
  if (raw?.success === false) {
    return { success: false, message: raw?.message ? String(raw.message) : "Impossible de supprimer l'espace." }
  }
  return { success: true, message: raw?.message, result: raw?.result }
}

/** Offres d'une page (GET /getPageOffers/{page_id}/{user_id}?page=). */
export async function fetchPageOffers(pageId: string, userId: string, page = 1): Promise<{ success: boolean; offers: PageOffer[]; hasMore: boolean }> {
  const raw = await requestGet<any>(`getPageOffers/${encodeURIComponent(pageId)}/${encodeURIComponent(userId)}`, { page })
  if (raw?.success === false) return { success: false, offers: [], hasMore: false }
  return { success: true, offers: mapOffersList(raw), hasMore: getPaginatorMeta(raw?.offers || raw).hasMore }
}

/** Détail d'une offre (GET /offers/show/{id}). */
export async function fetchOfferDetail(offerId: string): Promise<PageOffer | null> {
  const raw = await requestGet<any>(`offers/show/${encodeURIComponent(offerId)}`)
  if (raw?.success === false) return null
  return mapOffer(raw?.result ?? raw)
}

/** Crée une offre (POST /offers). */
export async function createOffer(payload: { userId: string; pageId: string; description: string; discountType: string; discountPercent: number; expireDate: string; expireTime: string }): Promise<PageMutationResponse> {
  const raw = await requestForm<any>("offers", {
    user_id: payload.userId,
    page_id: payload.pageId,
    description: payload.description,
    discount_type: payload.discountType,
    discount_percent: payload.discountPercent,
    expire_date: payload.expireDate,
    expire_time: payload.expireTime,
  })
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}
/* ─────────────────────────── ADMINS & VÉRIFICATION ─────────────────────────── */

/** Ajoute un admin (POST /addAdminPage { page_id, user_id }). */
export async function addAdmin(pageId: string, memberUserId: string): Promise<PageMutationResponse> {
  const raw = await requestForm<any>("addAdminPage", { page_id: pageId, user_id: memberUserId })
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}

/** Retire un admin (POST /addRemovePageAdmin { page_id, member_id }). */
export async function removeAdmin(pageId: string, memberUserId: string): Promise<PageMutationResponse> {
  const raw = await requestForm<any>("addRemovePageAdmin", { page_id: pageId, member_id: memberUserId })
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}

/** Privilèges détaillés d'un admin (POST /updatePageAdminPrivileges/{adminId}). */
export async function updateAdminPrivileges(adminId: string, privileges: boolean[]): Promise<PageMutationResponse> {
  const [general, info, social, avatar, design, admins, analytics, delete_page] = privileges
  const raw = await requestForm<any>(`updatePageAdminPrivileges/${encodeURIComponent(adminId)}`, {
    general: general ? "1" : "0",
    info: info ? "1" : "0",
    social: social ? "1" : "0",
    avatar: avatar ? "1" : "0",
    design: design ? "1" : "0",
    admins: admins ? "1" : "0",
    analytics: analytics ? "1" : "0",
    delete_page: delete_page ? "1" : "0",
  })
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}

/** Demande de vérification (POST /page/requestVerification/{id}). */
export async function requestVerification(pageId: string): Promise<PageMutationResponse> {
  const raw = await requestForm<any>(`page/requestVerification/${encodeURIComponent(pageId)}`, {})
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}

/** Retrait de vérification (POST /page/removeVerification/{id}). */
export async function removeVerification(pageId: string): Promise<PageMutationResponse> {
  const raw = await requestForm<any>(`page/removeVerification/${encodeURIComponent(pageId)}`, {})
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}

/** Bascule de vérification — modération/admin (POST /toggleVerificationPage). */
export async function toggleVerification(userId: string, pageId: string): Promise<PageMutationResponse> {
  const raw = await requestForm<any>("toggleVerificationPage", { user_id: userId, page_id: pageId })
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}

/* ─────────────────────────── INVITATION & UPLOAD ─────────────────────────── */

/** Invite un ami à aimer la page (POST /page/inviteFriend). */
export async function inviteFriend(userId: string, pageId: string, friendId: string): Promise<PageMutationResponse> {
  const raw = await requestForm<any>("page/inviteFriend", { user_id: userId, page_id: pageId, friend_id: friendId })
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}

/** Upload avatar/cover (POST /page/uploadImage, multipart : page_id, image, element). */
export async function uploadPageImage(pageId: string, file: File | Blob, element: "avatar" | "cover"): Promise<PageMutationResponse> {
  const formData = new FormData()
  formData.append("page_id", pageId)
  formData.append("image", file)
  formData.append("element", element)
  try {
    const raw = await dughuServerMultipart<any>("page/uploadImage", formData)
    return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible d'envoyer l'image.", { cause: error, status: 500 })
  }
}

/* ─────────────────────────── DIVERS ─────────────────────────── */

/** Points-recipient (POST /page/{page_id}/points-recipient). */
export async function updatePointsRecipient(pageId: string, recipient: "subscriber" | "owner" | "none"): Promise<PageMutationResponse> {
  const raw = await requestForm<any>(`page/${encodeURIComponent(pageId)}/points-recipient`, { points_recipient: recipient })
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}

/** Liens sociaux d'une page (POST /socialLinksUpdat — clé `instgram` = typo backend conservée). */
export async function updateSocialLinks(pageId: string, links: PageSocialLinks): Promise<PageMutationResponse> {
  const raw = await requestForm<any>("socialLinksUpdat", {
    facebook: links.facebook,
    twitter: links.twitter,
    instgram: links.instagram,
    linkedin: links.linkedin,
    youtube: links.youtube,
    vk: links.vk,
    page_id: pageId,
  })
  return { success: raw?.success !== false, message: raw?.message, result: raw?.result }
}
