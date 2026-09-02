/**
 * Types du domaine Pages / Espaces (équivalent pages pro/communauté Dughu).
 *
 * Modèles métier normalisés côté serveur (pokes.mapper.ts / pages.server.ts).
 * Les champs sensibles de la réponse brute (e-mails, tokens, réglages privés)
 * ne sortent jamais du serveur.
 */

/** Catégorie de page (GET /getPageCategories). */
export interface PageCategory {
  id: string
  name: string
  langKey?: string
}

/** Privilèges détaillés d'un admin (POST /updatePageAdminPrivileges/{id}). */
export interface PageAdminPrivileges {
  general: boolean
  info: boolean
  social: boolean
  avatar: boolean
  design: boolean
  admins: boolean
  analytics: boolean
  deletePage: boolean
}

/** Admin d'une page (fourni par POST /show/pages → `admins`). */
export interface PageAdmin {
  id: string
  userId: string
  pageId: string
  name?: string
  username?: string
  avatar?: string
  privileges: PageAdminPrivileges
}

/** Page / espace normalisé. */
export interface DughuPage {
  pageId: string
  userId: string
  pageName: string
  pageTitle: string
  pageDescription: string
  avatar: string
  cover: string
  usersPost: boolean
  pageCategory: string
  subCategory: string
  website: string
  facebook: string
  instagram: string
  twitter: string
  linkedin: string
  youtube: string
  vk: string
  google: string
  company: string
  phone: string
  address: string
  pointsRecipient: string
  verified: boolean
  verificationStatus: string
  boosted: boolean
  active: boolean
  nbrPost: number
  likeCount: number
  isLiked: boolean
  isAdmin: boolean
  categoryName: string
  registered: string
  createdAt: string
  admins: PageAdmin[]
}

/** Personne ayant liké une page (GET /getPageLikes/{id}). */
export interface PageLike {
  id: string
  userId: string
  name: string
  username: string
  avatar: string
}

/** Offre promotionnelle d'une page (GET /getPageOffers, /offers/show). */
export interface PageOffer {
  id: string
  pageId: string
  userId: string
  discountType: string
  discountPercent: number
  discountAmount: number
  discountedItems: string
  buy: number
  getPrice: number
  spend: number
  amountOff: number
  description: string
  createdAt: string
  [key: string]: unknown
}

/** Statistiques d'une page (GET /page/{id}/statistic/{user_id}). Forme souple. */
export interface PageStatistics {
  [key: string]: unknown
}

/** Publication d'une page (GET /getPostPageUser/{id}). Champs normalisés. */
export interface PagePost {
  id: string
  content: string
  image?: string
  video?: string
  createdAt: string
}

/** Image de la galerie d'une page (GET /imagePage/{id}). */
export interface PageImage {
  id: string
  url: string
}

/** Ami invitables à une page (POST /invitePageList). */
export interface InvitableUser {
  id: string
  name: string
  username: string
  avatar: string
}

/** Réponse de liste de pages (feed, mes pages, likes, suggestions…). */
export interface PagesListResponse {
  success: boolean
  message?: string
  pages: DughuPage[]
  hasMore: boolean
  page: number
}

/** Réponse du détail d'une page. */
export interface PageDetailResponse {
  success: boolean
  message?: string
  page?: DughuPage
}

/** Réponse de mutation générique sur une page. */
export interface PageMutationResponse {
  success: boolean
  message?: string
  result?: {
    page_id?: string | number
    [key: string]: unknown
  }
  [key: string]: unknown
}

/** Prix d'un boost (POST /boostPrice). */
export interface BoostPrice {
  points: number
  fcfa: number
}

/** Valeurs du formulaire création / édition (POST /page). */
export interface PageFormValues {
  pageName: string
  pageTitle: string
  pageDescription: string
  pageCategory: string
  website: string
  phone: string
  address: string
  usersPost: boolean
  /** Photo de couverture sélectionnée (étape création, upload après création). */
  coverImage?: File | null
  /** Photo de profil/avatar sélectionnée (étape création, upload après création). */
  profileImage?: File | null
}

/** Valeurs des liens sociaux (POST /socialLinksUpdat — clé `instgram` = typo backend conservée). */
export interface PageSocialLinks {
  facebook: string
  instagram: string
  twitter: string
  linkedin: string
  youtube: string
  vk: string
}