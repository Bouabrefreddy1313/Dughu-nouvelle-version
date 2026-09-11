/**
 * Types du domaine Canal (messagerie/communautés Dughu).
 *
 * Modèles métier normalisés côté serveur (canal.mapper.ts / canal.server.ts).
 * Les champs sensibles de la réponse brute (tokens, réglages privés) ne
 * sortent jamais du serveur.
 */

/* ─────────────────────────────── Génériques ────────────────────────────── */

/** Réponse générique succès/erreur. */
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

/** Réponse paginée générique. */
export interface PaginatedResponse<T> {
  success: boolean
  message?: string
  items: T[]
  hasMore: boolean
  page: number
}

/** Réponse de mutation générique sur un canal. */
export interface CanalMutationResponse {
  success: boolean
  message?: string
  result?: {
    canal_id?: string | number
    [key: string]: unknown
  }
  [key: string]: unknown
}

/* ─────────────────────────────── Catégories ────────────────────────────── */

/** Catégorie de canal (GET /getPossibleCategories). */
export interface CanalCategory {
  id: string
  name: string
  langKey?: string
}

/* ─────────────────────────────── Canal ─────────────────────────────────── */

/** Type de visibilité d'un canal. */
export type CanalType = "public" | "private"

/** Canal normalisé. */
export interface Canal {
  id: string
  name: string
  description: string
  /** URL du logo/avatar du canal. */
  logo: string
  /** URL de l'image de couverture. */
  cover: string
  type: CanalType
  isActive: boolean
  categoryId: string
  categoryName: string
  memberCount: number
  /** Vrai si l'utilisateur courant est administrateur. */
  isAdmin: boolean
  /** Vrai si l'utilisateur courant a rejoint le canal. */
  isJoined: boolean
  /** Vrai si l'utilisateur courant a mis ce canal en favori. */
  isFavorite: boolean
  /** Code d'invitation (canaux privés). */
  inviteCode?: string
  /** Lien d'invitation complet (canaux privés). */
  inviteLink?: string
  /** Token public pour accès direct (canaux publics). */
  publicToken?: string
  createdAt: string
  userId: string
}

/** Réponse de liste de canaux. */
export interface CanalsListResponse {
  success: boolean
  message?: string
  canals: Canal[]
  hasMore: boolean
  page: number
}

/** Réponse du détail d'un canal. */
export interface CanalDetailResponse {
  success: boolean
  message?: string
  canal?: Canal
}

/* ─────────────────────────────── Membres ───────────────────────────────── */

/** Membre d'un canal (GET /adherents/:canal_id). */
export interface CanalMember {
  id: string
  userId: string
  canalId: string
  name: string
  username: string
  avatar: string
  isAdmin: boolean
  joinedAt: string
}

/** Demande d'adhésion (POST /handleJoinRequest). */
export interface CanalJoinRequest {
  id: string
  userId: string
  canalId: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
}

/* ─────────────────────────────── Messages ──────────────────────────────── */

/** Réaction sur un message. */
export interface CanalReaction {
  reaction: string
  count: number
  /** Vrai si l'utilisateur courant a posé cette réaction. */
  isOwn: boolean
}

/** Message d'un canal (POST /showCanalMessages). */
export interface CanalMessage {
  id: string
  canalId: string
  userId: string
  authorName: string
  authorAvatar: string
  text: string
  /** URL du média attaché (image, vidéo…). */
  mediaUrl?: string
  mediaType?: string
  reactions: CanalReaction[]
  createdAt: string
  updatedAt?: string
  /** Vrai si l'utilisateur courant est l'auteur. */
  isOwn: boolean
}

/** Réponse de liste de messages. */
export interface CanalMessagesResponse {
  success: boolean
  message?: string
  messages: CanalMessage[]
  hasMore: boolean
  page: number
}

/* ─────────────────────────────── Sondages ──────────────────────────────── */

/** Option d'un sondage. */
export interface CanalPollOption {
  id: string
  pollId: string
  text: string
  voteCount: number
  /** Vrai si l'utilisateur courant a voté pour cette option. */
  isVoted: boolean
}

/** Sondage dans un canal (POST /canals/:id/polls). */
export interface CanalPoll {
  id: string
  canalId: string
  userId: string
  question: string
  options: CanalPollOption[]
  allowMultiple: boolean
  closesAt?: string
  isClosed: boolean
  createdAt: string
}

/* ─────────────────────────────── Médias & Docs ─────────────────────────── */

/** Média d'un canal (GET /getMedia/:canal_id). */
export interface CanalMedia {
  id: string
  canalId: string
  url: string
  type: string
  createdAt: string
}

/** Document d'un canal (GET /getDocuments/:canal_id). */
export interface CanalDocument {
  id: string
  canalId: string
  name: string
  url: string
  size?: number
  createdAt: string
}

/* ─────────────────────────────── Notifications ─────────────────────────── */

/** Notification de canal (GET /receivedNotifications, /processedNotifications). */
export interface CanalNotification {
  id: string
  userId: string
  canalId: string
  type: string
  content: string
  /** Statut de traitement : null = en attente, "Acceptée" | "Rejetée" = traitée. */
  status: string | null
  createdAt: string
  senderName?: string
  senderAvatar?: string
  requestId?: string
  targetUserId?: string
}

export interface CanalNotificationsResponse {
  success: boolean
  message?: string
  notifications: CanalNotification[]
  hasMore: boolean
  page: number
}

/* ─────────────────────────────── Formulaires ───────────────────────────── */

/** Valeurs du formulaire de création / édition d'un canal. */
export interface CanalFormValues {
  /** Omis lors de la création. */
  canalId?: string
  name: string
  description: string
  categoryId: string
  type: CanalType
  isActive: boolean
  logo?: File | null
  cover?: File | null
}

/** Payload pour envoyer / modifier un message. */
export interface CanalMessagePayload {
  userId: string
  text?: string
  media?: File | null
}

/** Payload pour créer un sondage. */
export interface CanalPollPayload {
  question: string
  options: string[]
  allowMultiple: boolean
  closesAt?: string
  userId: string
}

/** Payload pour voter sur un sondage. */
export interface CanalVotePayload {
  optionId: string
  pollId: string
  userId: string
  canalId: string
}

/** Payload pour signaler un canal. */
export interface CanalReportPayload {
  canalId: string
  reason: string
  reasonId: string
  text?: string
  userId: string
}
