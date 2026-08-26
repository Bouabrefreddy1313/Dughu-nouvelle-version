import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  EMPTY_PROFILE_RELATIONS,
  type ProfileRelations,
  type RelationAction,
  type RelationState,
  type RelationType,
} from "@/lib/profile-relations"

interface RelationMutationArgs {
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

function actionAllowed(state: RelationState, action: RelationAction): boolean {
  if (state === "none") return action === "request"
  if (state === "outgoing_pending") return action === "decline"
  if (state === "incoming_pending") return action === "accept" || action === "decline"
  return action === "remove"
}

function nextStateFor(action: RelationAction): RelationState {
  if (action === "request") return "outgoing_pending"
  if (action === "accept") return "accepted"
  return "none"
}

async function readResponse(res: Response): Promise<RelationResponse> {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) as RelationResponse : { success: false }
  } catch {
    throw new Error("Une erreur est survenue. Veuillez réessayer.")
  }
}

export function useRelation() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ type, currentState, action, targetId }: RelationMutationArgs) => {
      if (!actionAllowed(currentState, action)) {
        throw new Error("Cette action n'est plus disponible")
      }
      const res = await fetch("/api/profile/relation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, type, action }),
      })
      const data = await readResponse(res)
      if (!res.ok || !data.success) {
        throw new Error(data.message ?? "Impossible de mettre à jour cette relation.")
      }
      return data
    },

    onMutate: async ({ type, action, profileQueryKey }: RelationMutationArgs) => {
      await queryClient.cancelQueries({ queryKey: profileQueryKey })
      const previousData = queryClient.getQueryData(profileQueryKey)
      const nextState = nextStateFor(action)

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
      toast.error(error instanceof Error ? error.message : "Impossible de mettre à jour cette relation.")
    },

    onSuccess: (data) => {
      toast.success(data.message ?? "Action effectuée")
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
