/**
 * Hook d'orchestration des mutations de relation (profil d'un autre
 * utilisateur). Il utilise TanStack Query, appelle le service frontend
 * relations.service.ts et gère queryKey, loading, cache optimiste et
 * invalidation. Il ne doit JAMAIS importer Axios ni faire d'appel HTTP direct.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  EMPTY_PROFILE_RELATIONS,
  type ProfileRelations,
  type RelationAction,
  type RelationState,
  type RelationType,
} from "@/types/relations/relation.types"
import { actionAllowed, nextStateFor } from "@/services/relations/relation.mapper"
import { sendRelationAction } from "@/services/relations/relations.service"
import { userMessage } from "@/lib/api/api-error"

export interface RelationMutationArgs {
  type: RelationType
  currentState: RelationState
  action: RelationAction
  profileQueryKey: readonly unknown[]
  targetId: string
}

interface ProfileCacheData extends Record<string, unknown> {
  relations?: ProfileRelations
}

interface RelationResponse {
  success: boolean
  message?: string
}

export function useRelation() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ type, currentState, action, targetId }: RelationMutationArgs) => {
      if (!actionAllowed(currentState, action)) {
        throw new Error("Aucune action disponible pour cette demande")
      }
      return sendRelationAction({ targetId, type, action })
    },

    onMutate: async ({ type, currentState, action, profileQueryKey }: RelationMutationArgs) => {
      // Prévient les clics concurrents pendant la mutation (double toggle)
      await queryClient.cancelQueries({ queryKey: profileQueryKey })

      const previousData = queryClient.getQueryData(profileQueryKey)
      const nextState = nextStateFor(currentState, action)

      queryClient.setQueryData<ProfileCacheData>(profileQueryKey, (old) => old ? {
        ...old,
        relations: {
          ...(old.relations ?? EMPTY_PROFILE_RELATIONS),
          [type]: nextState,
        },
      } : old)

      return { previousData }
    },

    onError: (error, { profileQueryKey }, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(profileQueryKey, context.previousData)
      }
      toast.error(userMessage(error, "Erreur relation"))
    },

    onSuccess: (data: RelationResponse, { type, currentState, profileQueryKey }) => {
      // Invalide les queries profil concernées pour resynchroniser l'état backend.

      void queryClient.invalidateQueries({ queryKey: profileQueryKey })

      const message = currentState === "accepted"
        ? type === "friend" ? "Fraternisation annulée" : "Relation de réseautage annulée"
        : data.message ?? "Action effectuée"
      toast.success(message)
    },
  })

  const triggerRelationAction = (args: RelationMutationArgs) => {
    if (!actionAllowed(args.currentState, args.action)) return
    mutation.mutate(args)
  }

  return {
    triggerRelationAction,
    isPending: mutation.isPending,
    pendingType: mutation.isPending ? mutation.variables?.type ?? null : null,
  }
}