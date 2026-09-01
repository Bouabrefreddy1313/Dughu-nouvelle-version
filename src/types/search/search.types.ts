/**
 * Types du domaine Recherche.
 *
 * - GlobalSearchResult : modèle métier consommé par l'interface ;
 * - SearchApiResponse : réponse de la route interne GET /api/search.
 *
 * Le DTO brut de l'API Dughu est volontairement `unknown` : le contrat
 * externe de searchAll est instable, la normalisation défensive vit dans le
 * mapper (services/search/search.mapper.ts).
 */

export type GlobalSearchResultType = "user" | "post" | "page" | "group" | "hashtag"

export interface GlobalSearchResult {
  id: string
  type: GlobalSearchResultType
  title: string
  subtitle: string
  image: string | null
  href: string | null
}

/** Payload envoyé à la route interne /api/search. */
export interface SearchPayload {
  query: string
}

/** Réponse de la route interne GET /api/search. */
export interface SearchApiResponse {
  success: boolean
  message?: string
  results?: GlobalSearchResult[]
}
