/**
 * Types du domaine Album — contrat consommé par l'interface après normalisation
 * côté route interne /api/album (jamais la réponse brute de l'API Dughu).
 */

/** Un média (photo ou vidéo) d'un album. */
export interface AlbumMedia {
  /** Identifiant du média (utilisé par DELETE /destroyOneImage/{image_id}). */
  id: string
  url: string
  type: string
  postId: string
}

/** Un album de l'utilisateur. */
export interface AlbumItem {
  id: string
  name: string
  /** Visibilité : « public » ou « private ». */
  type: string
  userId: string
  /** Première image de l'album, ou chaîne vide si l'album est vide. */
  cover: string
  media: AlbumMedia[]
  count: number
}

/** Réponse normalisée de GET /api/album. */
export interface AlbumListResponse {
  success: boolean
  albums: AlbumItem[]
  page?: number
  hasMore?: boolean
  message?: string
}

/** Visibilité disponible à la création d'un album. */
/**
 * Visibilité d'un album. Contrat API Dughu (vérifié en réel) : « public » ou
 * « prive » (sans accent). « private » reste accepté en entrée et normalisé
 * vers « prive » par la route POST /api/album.
 */
export type AlbumVisibility = "public" | "private"
