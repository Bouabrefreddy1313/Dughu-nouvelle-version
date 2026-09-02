"use client"

/**
 * Hooks client du domaine Pokes (TanStack Query).
 *
 * Les appels HTTP passent par le service frontend pokes.service.ts (instance
 * Axios cliente). Aucun fetch ici. Les mutations (envoi / poke-back) ne
 * bénéficient d'AUCUN retry automatique (non idempotentes : un second envoi
 * créerait un doublon).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchPokes, pokeBack, sendPoke } from "@/services/pokes/pokes.service"
import type { Poke } from "@/types/pokes/pokes.types"

export type PokesBox = "received" | "sent"

const pokesKey = (box: PokesBox, dughuUserId: string | undefined) => ["pokes", box, dughuUserId]

/**
 * Liste des pokes reçus ou envoyés de l'utilisateur connecté
 * (GET /api/pokes?box=received|sent).
 */
export function usePokes(box: PokesBox, dughuUserId: string | undefined) {
  return useQuery({
    queryKey: pokesKey(box, dughuUserId),
    queryFn: async () => {
      const data = await fetchPokes(box)
      if (!data.success) {
        throw new Error(data.message || "Impossible de charger les pokes.")
      }
      return data.pokes
    },
    enabled: !!dughuUserId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

/**
 * Envoie un poke vers `receivedUserId`. Invalide les deux listes après coup
 * (le poke apparaît dans « envoyés » du sender et « reçus » du destinataire).
 */
export function useSendPoke(dughuUserId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (receivedUserId: string) => sendPoke(receivedUserId),
    retry: 0,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["pokes"] })
    },
  })
}

/**
 * Répond à un poke reçu (poke-back). Mise à jour optimiste : le poke répondu
 * est retiré immédiatement de la liste « reçus », réinséré en cas d'échec.
 */
export function usePokeBack(dughuUserId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ pokeId, receivedUserId }: { pokeId: string; receivedUserId: string }) =>
      pokeBack(pokeId, receivedUserId),
    retry: 0,
    onMutate: async ({ pokeId }) => {
      await queryClient.cancelQueries({ queryKey: pokesKey("received", dughuUserId) })
      const previous = queryClient.getQueryData<Poke[]>(pokesKey("received", dughuUserId))
      queryClient.setQueryData<Poke[]>(
        pokesKey("received", dughuUserId),
        (old) => (old ?? []).filter((poke) => poke.id !== pokeId)
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(pokesKey("received", dughuUserId), context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["pokes"] })
    },
  })
}
