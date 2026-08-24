import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  EMPTY_PROFILE_RELATIONS,
  type ProfileRelations,
  type RelationState,
  type RelationType,
} from "@/lib/profile-relations"

interface RelationMutationArgs {
  type: RelationType
  currentState: RelationState
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

function actionFor(state: RelationState): "request" | "accept" | "decline" | null {
  if (state === "none") return "request"
  if (state === "incoming_pending") return "accept"
  if (state === "accepted") return "decline"
  return null
}

function nextStateFor(state: RelationState): RelationState {
  if (state === "none") return "outgoing_pending"
  if (state === "incoming_pending") return "accepted"
  return "none"
}

async function readResponse(res: Response): Promise<RelationResponse> {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) as RelationResponse : { success: false }
  } catch {
    throw new Error("Réponse serveur invalide")
  }
}

export function useRelation() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ type, currentState, targetId }: RelationMutationArgs) => {
      const action = actionFor(currentState)
      if (!action) throw new Error("Aucune action disponible pour cette demande")
      const res = await fetch("/api/profile/relation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, type, action }),
      })
      const data = await readResponse(res)
      if (!res.ok || !data.success) {
        throw new Error(data.message ?? "Erreur lors de la mise à jour")
      }
      return data
    },

    onMutate: async ({ type, currentState, profileQueryKey }: RelationMutationArgs) => {
      await queryClient.cancelQueries({ queryKey: profileQueryKey })
      const previousData = queryClient.getQueryData(profileQueryKey)
      const nextState = nextStateFor(currentState)

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
      toast.error(error instanceof Error ? error.message : "Erreur relation")
    },

    onSuccess: (data, { type, currentState }) => {
      const message = currentState === "accepted"
        ? type === "friend" ? "Fraternisation annulée" : "Relation de réseautage annulée"
        : data.message ?? "Action effectuée"
      toast.success(message)
    },
  })

  const triggerRelationAction = (args: RelationMutationArgs) => {
    if (!actionFor(args.currentState)) return
    mutation.mutate(args)
  }

  return {
    triggerRelationAction,
    isPending: mutation.isPending,
    pendingType: mutation.isPending ? mutation.variables?.type ?? null : null,
  }
}
