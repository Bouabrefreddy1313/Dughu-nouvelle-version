// FAÇADE TEMPORAIRE DE COMPATIBILITÉ — voir src/types/relations/relation.types.ts et src/services/relations/relation.mapper.ts
// Ne recevoir aucune nouvelle logique. Sera supprimée dès que tous les importeurs sont migrés.
export {
  EMPTY_PROFILE_RELATIONS,
  type ProfileRelations,
  type RelationAction,
  type RelationState,
  type RelationType,
} from "@/types/relations/relation.types"
export { normalizeProfileRelations } from "@/services/relations/relation.mapper"
