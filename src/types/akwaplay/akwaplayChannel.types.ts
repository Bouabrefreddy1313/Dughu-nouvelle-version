/**
 * Types TypeScript pour les Chaînes Akwaplay.
 */

import type { AkwaAuthor, AkwaVideo, AkwaBaseApiResponse } from "./akwaplay.types"
export type { AkwaAuthor, AkwaVideo, AkwaBaseApiResponse }

export interface AkwaChannel {
  id: string | number
  name: string
  slug: string
  identifiant: string
  avatar: string
  banner?: string | null
  description?: string | null
  userId: string | number
  author?: AkwaAuthor | null
  subscribersCount: number
  videosCount: number
  isFollowing?: boolean
  createdAt?: string
  videos?: AkwaVideo[]
}

export interface AkwaStoreChannelPayload {
  channelId?: string | number // Présent lors d'une modification ou identifiant textuel
  name: string
  identifiant?: string
  description?: string | null
  avatarFile?: File | Blob | null
  bannerFile?: File | Blob | null
  userId: string | number
}

export interface AkwaShowChannelPayload {
  channelId?: string | number
  slug?: string
  userId: string | number
}

export interface AkwaToggleFollowChannelPayload {
  channelId: string | number
  userId: string | number
}

export interface AkwaChannelDetailResponse extends AkwaBaseApiResponse {
  channel: AkwaChannel
  isFollowing?: boolean
  subscribersCount?: number
  videos?: AkwaVideo[]
}

export interface AkwaFollowToggleResponse extends AkwaBaseApiResponse {
  isFollowing: boolean
  subscribersCount?: number
}
