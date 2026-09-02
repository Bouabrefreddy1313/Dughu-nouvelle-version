/**
 * Types du domaine « Retrouvailles ».
 *
 * Module servant à retrouver d'anciens contacts : suggestions, import de
 * contacts et recherche d'anciens. On distingue :
 *  - RetrouvaillesApiDTO      : réponse brute reçue de l'API Dughu (instable,
 *                               champs d'affinité en plus du profil utilisateur) ;
 *  - RetrouvaillePerson       : modèle métier consommé par l'interface ;
 *  - RetrouvaillesTab         : onglets du module.
 */

export type RetrouvaillesTab = "suggestions" | "contacts" | "anciens"

export type RetrouvailleAffinity = {
  label: string
  reasons: string[]
  score: number
  mutualFriendsCount: number
}

/** Personne proposée par le module Retrouvailles (uniformisée 3 onglets). */
export interface RetrouvaillePerson {
  id: string
  name: string
  username: string | null
  avatar: string | null
  cover: string | null
  school: string | null
  city: string | null
  createdAt?: string | null
  affinity: RetrouvailleAffinity | null
}

/** Bloc d'affinité de l'onglet Suggestions (groupe de personnes partageant un trait). */
export interface RetrouvaillesSuggestionGroup {
  label: string
  persons: RetrouvaillePerson[]
}

/** Réponse normalisée de la route interne /api/retrouvailles. */
export interface RetrouvaillesResponse {
  success: boolean
  message?: string
  tab: RetrouvaillesTab
  /** Onglet Suggestions. */
  groups?: RetrouvaillesSuggestionGroup[]
  /** Onglet Contacts / Anciens. */
  persons?: RetrouvaillePerson[]
}