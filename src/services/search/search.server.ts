/**
 * Service SERVEUR du domaine Recherche — utilisé UNIQUEMENT par le Route
 * Handler /api/search. Appelle l'API externe Dughu via dughuApi et
 * normalise la réponse brute via le mapper. Ne connaît pas React, ne
 * retourne jamais de secret.
 */

import { dughu, dughuApi } from "@/lib/dughu"
import { normalizeGlobalSearch } from "./search.mapper"
import type { GlobalSearchResult } from "@/types/search/search.types"

/** Indique si le domaine de recherche est activé côté serveur. */
export function isSearchEnabled(): boolean {
  return dughu.enabled
}

/**
 * Effectue une recherche globale côté API Dughu et retourne les résultats
 * normalisés. Lève une erreur technique si l'appel externe échoue (la
 * conversion en réponse HTTP reste à la charge du Route Handler).
 */
export async function searchAll(query: string, userId: string): Promise<GlobalSearchResult[]> {
  const raw = await dughuApi.searchAll({ query, user_id: userId, page: 1 })
  return normalizeGlobalSearch(raw)
}
