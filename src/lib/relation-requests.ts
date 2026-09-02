// FAÇADE TEMPORAIRE DE COMPATIBILITÉ — voir src/types/relations/relation.types.ts et src/services/relations/relation.mapper.ts
// Ne recevoir aucune nouvelle logique。 Sera supprimée dès que tous les importeurs sont migrés.
export { type IncomingRelationRequest } from "@/types/relations/relation.types"
export { normalizeIncomingRelationRequests } from "@/services/relations/relation.mapper"
