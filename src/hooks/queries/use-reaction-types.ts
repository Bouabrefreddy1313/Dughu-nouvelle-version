"use client"

// Hook du domaine Publications — liste des types de réactions disponibles avec
// leurs icônes (wowonder_icon) récupérées depuis GET /api/reaction-types.
// Les appels passent par le service frontend reaction-types.service.ts
// (instance Axios cliente). Aucun fetch ici.
//
// Les réactions sont mises en cache longtemps (staleTime 1h) car elles changent
// rarement. Un fallback vers les émojis locaux est prévu en cas d'erreur.

import { useQuery } from "@tanstack/react-query"
import { fetchReactionTypes } from "@/services/posts/reaction-types.service"
import type { ReactionType } from "@/services/posts/reaction-types.service"

/** Réaction de secours utilisée si l'API échoue. */
const FALLBACK_REACTIONS: ReactionType[] = [
  { id: 1, name: "J'aime", wowonder_icon: "", sunshine_icon: null, status: 1 },
  { id: 2, name: "J'adore", wowonder_icon: "", sunshine_icon: null, status: 1 },
  { id: 5, name: "Triste", wowonder_icon: "", sunshine_icon: null, status: 1 },
  { id: 6, name: "Colère", wowonder_icon: "", sunshine_icon: null, status: 1 },
  { id: 11, name: "Haha", wowonder_icon: "", sunshine_icon: null, status: 1 },
  { id: 12, name: "Silence", wowonder_icon: "", sunshine_icon: null, status: 1 },
  { id: 13, name: "Réflexion", wowonder_icon: "", sunshine_icon: null, status: 1 },
  { id: 14, name: "Fade", wowonder_icon: "", sunshine_icon: null, status: 1 },
  { id: 15, name: "Étonné", wowonder_icon: "", sunshine_icon: null, status: 1 },
]

/**
 * Charge la liste des types de réactions depuis GET /api/reaction-types.
 * Mis en cache 1h, utilisé par ReactionPicker pour afficher les icônes de l'API.
 */
export function useReactionTypes(): {
  reactions: ReactionType[]
  isLoading: boolean
  isError: boolean
} {
  const query = useQuery({
    queryKey: ["reaction-types"],
    queryFn: () => fetchReactionTypes(),
    staleTime: 60 * 60 * 1000, // 1h — les réactions changent très rarement
    gcTime: 2 * 60 * 60 * 1000, // 2h en cache mémoire
    placeholderData: FALLBACK_REACTIONS,
    retry: 2,
  })

  return {
    reactions: query.data ?? FALLBACK_REACTIONS,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
