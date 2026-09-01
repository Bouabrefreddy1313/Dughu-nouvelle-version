// FAÇADE TEMPORAIRE DE COMPATIBILITÉ — voir src/services/search/search.mapper.ts
// et src/types/search/search.types.ts (lot 6 — Recherche). Transitoire
// pendant la migration : réexport uniquement, aucune nouvelle logique.
// À supprimer une fois tous les imports migrés.

export type { GlobalSearchResult, GlobalSearchResultType } from "@/types/search/search.types"
export { normalizeGlobalSearch } from "@/services/search/search.mapper"

