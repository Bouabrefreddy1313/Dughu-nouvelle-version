/**
 * Types du domaine Profil.
 *
 * Contrat de la route interne /api/profile et payloads des routes
 * /api/profile/update, /api/profile/infos, /api/profile/avatar,
 * /api/profile/cover, /api/profile/password, /api/profile/follow,
 * /api/countries, /api/submitVerification et /api/getVerificationRequests.
 *
 * Le payload utilisateur Dughu est hétérogène : les champs consommés par
 * l'interface sont typés explicitement, le reste reste accessible via
 * l'index signature (incertitude limitée aux types, jamais d'`any`).
 */

import type { ProfileRelations } from "@/types/relations/relation.types"

/** Utilisateur profilé renvoyé par /api/profile (spread du user Dughu normalisé). */
export interface ProfileUser {
  id: string
  name?: string
  firstName?: string
  lastName?: string
  username?: string
  email?: string
  phone?: string
  avatar?: string
  image?: string
  cover?: string
  bio?: string
  gender?: string
  birthdate?: string
  countryId?: string | number
  city?: string
  postcode?: string
  signature?: string
  verified?: boolean
  online?: boolean
  facebook?: string
  instagram?: string
  twitter?: string
  linkedin?: string
  youtube?: string
  google?: string
  website?: string
  discord?: string
  wechat?: string
  villeOrigine?: string
  etablissementFrequente?: string
  domaineActivite?: string
  profession?: string
  entrepriseActuelle?: string
  entreprisePassee?: string[]
  centresInteret?: string[]
  competences?: string[]
  lieuxFrequentes?: string[]
  dughu?: { userId: string; username?: string; token?: string }
  [key: string]: unknown
}

/** Compteurs normalisés par la route /api/profile. */
export interface ProfileStats {
  posts: number
  followers: number
  following: number
  friends: number
}

export interface ProfileInfo {
  email?: string
  phone?: string
  phoneNumber?: string
  country?: string | null
  gender?: string
  birthdate?: string
  countryId?: string | number
  city?: string
  postcode?: string
  signature?: string
  joined?: string
  registered?: string
  [key: string]: unknown
}

/** Réponse de la route interne GET /api/profile. */
export interface ProfileApiResponse {
  success: boolean
  message?: string
  user?: ProfileUser
  info?: ProfileInfo
  stats?: ProfileStats
  friends?: unknown[]
  photos?: unknown[]
  videos?: unknown[]
  isFollowing?: boolean
  relations?: ProfileRelations
  [key: string]: unknown
}

/** Paramètres de la requête GET /api/profile. */
export interface ProfileParams {
  userId?: string
  slug?: string
  currentUserId?: string
  dughuUserId?: string
  viewerDughuUserId?: string
}

/** Réponse des routes /api/profile/update et /api/profile/infos. */
export interface ProfileUpdateResponse {
  success: boolean
  message?: string
  user?: ProfileUser
  [key: string]: unknown
}

/** Réponse des routes /api/profile/avatar et /api/profile/cover. */
export interface ProfileImageResponse {
  success?: boolean
  message?: string
  avatar?: string
  cover?: string
  image?: string
  [key: string]: unknown
}

/** Réponse de la route /api/profile/password. */
export interface ChangePasswordResponse {
  success: boolean
  message?: string
}

/** Réponse de la route /api/countries. */
export interface CountriesResponse {
  success?: boolean
  countries?: unknown[]
  [key: string]: unknown
}

/** Réponse des routes /api/submitVerification et /api/getVerificationRequests/:id. */
export interface VerificationResponse {
  success?: boolean
  message?: string
  user?: ProfileUser
  [key: string]: unknown
}

/** Payload de la route /api/profile/follow. */
export interface FollowPayload {
  userId?: string
  targetId?: string
}

export type PrivacyAudience = "0" | "1" | "2"
export type FollowPrivacy = "0" | "1"
export type PostPrivacy = "everyone" | "ifollow" | "nobody"
export type ConfirmFollowers = "0" | "1"

/** Les six préférences de confidentialité actuellement prises en charge. */
export interface PrivacySettings {
  followPrivacy: FollowPrivacy
  messagePrivacy: PrivacyAudience
  friendPrivacy: PrivacyAudience
  postPrivacy: PostPrivacy
  birthPrivacy: PrivacyAudience
  confirmFollowers: ConfirmFollowers
}

export interface PrivacySettingsResponse {
  success: boolean
  message?: string
  data?: PrivacySettings
}
