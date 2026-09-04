/**
 * Types du domaine Publications / Feed.
 *
 * Les DTO exposés ici restent volontairement souples ([key: string]: unknown)
 * car les contrats de l'API Dughu pour ce domaine sont hétérogènes : la
 * normalisation fine interviendra lot par lot. Aucun `any` permanent : les
 * composants continuent de caster localement comme avant la migration.
 */

/** Auteur d'une publication (contrat consommé par PostCard). */
export interface PostAuthor {
  id: string
  name?: string | null
  username?: string | null
  avatar?: string | null
  [key: string]: unknown
}

/** Publication du fil (contrat consommé par PostCard / home). */
export interface FeedPost {
  id: string
  author?: PostAuthor
  content?: string | null
  image?: string | null
  video?: string | null
  color?: string | null
  createdAt?: string
  [key: string]: unknown
}

/** Personne ayant réagi sur une publication (liste affichée dans le modal des réactions). */
export interface ReactionUserItem {
  id: string
  name: string | null
  username?: string | null
  avatar?: string | null
  reactionType: string // "like", "love", "haha", "wow", "sad", "angry"
}

/** Réponse générique d'une mutation publication/réaction. */
export interface PostMutationResponse {
  success?: boolean
  message?: string
  post?: FeedPost
  count?: number
  saved?: boolean
  following?: boolean
  [key: string]: unknown
}

/** Réponse de GET/POST /api/comments. */
export interface CommentResponse {
  success?: boolean
  message?: string
  comments?: unknown[]
  comment?: unknown
  likesCount?: number
  [key: string]: unknown
}

/** Réponse de GET /api/posts. */
export interface PostsResponse {
  success?: boolean
  message?: string
  posts?: unknown[]
  hasMore?: boolean
  [key: string]: unknown
}

/** Réponse de GET /api/suggestions. */
export interface SuggestionsResponse {
  success?: boolean
  boostedPosts?: unknown[]
  activities?: unknown[]
  groups?: unknown[]
  pages?: unknown[]
  hashtags?: unknown[]
  users?: unknown[]
  [key: string]: unknown
}

/** Réponse de GET /api/pointsToday/:userId. */
export interface PointsTodayResponse {
  success?: boolean
  total?: number
  [key: string]: unknown
}

/** Réponse de GET /api/colors. */
export interface ComposerColorsResponse {
  success?: boolean
  colors?: unknown[]
  [key: string]: unknown
}

/** Réponse de GET /api/hashtags?q=. */
export interface HashtagSearchResponse {
  success?: boolean
  tags?: unknown[]
  [key: string]: unknown
}

/** Payload de POST /api/points/give. */
export interface GivePointsPayload {
  postId: string
  authorId: string
  points: number
  userId: string
  dughuUserId?: string
}
