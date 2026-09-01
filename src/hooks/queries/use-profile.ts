// FAÇADE TEMPORAIRE DE COMPATIBILITÉ — voir src/hooks/profile/use-profile.ts
// Transitoire pendant la migration du domaine Profil (lot 3) : réexport
// uniquement, aucune nouvelle logique ne doit être ajoutée ici.
// À supprimer une fois tous les imports migrés vers "@/hooks/profile/use-profile".

export { useProfile, type ProfileParams } from "@/hooks/profile/use-profile"
