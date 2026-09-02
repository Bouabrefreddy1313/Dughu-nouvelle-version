/**
 * Hook d'orchestration de la page « Demandes de relations ».
 * Chargement (useQuery) + mutations accepter/refuser (useMutation) via
 * le service frontend relations.service.ts. Aucun fetch/Axios direct ici.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { IncomingRelationRequest, RelationRequestsResponse } from "@/types/relations/relation.types"

import { fetchRelationRequests, fetchOutgoingRequestUserIds, sendRelationAction } from "@/services/relations/relations.service"
import { userMessage } from "@/lib/api/api-error"

export interface RelationActionResult {
  request: IncomingRelationRequest
  action: "accept" | "decline"
}

export function useRelationRequests(enabled: boolean) {
  const queryClient = useQueryClient()

  const requestsQuery = useQuery({
    queryKey: ["profile", "relation-requests"],
    queryFn: ({ signal }) => fetchRelationRequests(signal ?? undefined),
    enabled,
    retry: 1,
    staleTime: 15_000,
  })

  const mutation = useMutation({
    mutationFn: async ({ request, action }: RelationActionResult) => {
      const result = await sendRelationAction({ targetId: request.userId, type: request.type, action })
      return { ...result, request, action }
    },
    onSuccess: ({ message, request, action }) => {
      queryClient.setQueryData<RelationRequestsResponse>(["profile", "relation-requests"], (current) =>
        current ? { ...current, requests: current.requests.filter((item) => !(item.userId === request.userId && item.type === request.type)) } : current
      )
      toast.success(message || (action === "accept" ? "Demande acceptée." : "Demande refusée."))
    },
    onError: (error) => {
      toast.error(userMessage(error, "Impossible de traiter cette demande."))
    },
  })

  return {
    requestsQuery,
    mutation,
  }
}

/**
 * IDs des destinataires des demandes de relations SORTANTES de l'utilisateur
 * connecté (TanStack Query, clé partagée → un seul appel réseau, cache 15 s).
 * Consommé par les onglets Retrouvailles pour pré-remplir l'état
 * « Demande envoyée » du bouton Fraterniser après un rechargement.
 */
export function useOutgoingRequestUserIds(enabled: boolean) {
  return useQuery({
    queryKey: ["profile", "relation-outgoing"],
    queryFn: ({ signal }) => fetchOutgoingRequestUserIds(signal ?? undefined),
    enabled,
    retry: 1,
    staleTime: 15_000,
  })
}