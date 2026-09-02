"use client"

/**
 * Hooks TanStack Query pour les sondages de canal.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createPoll, votePoll } from "@/services/canal/canal.service"
import type { CanalPollPayload, CanalVotePayload } from "@/types/canal/canal.types"

export function useCreatePoll(canalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CanalPollPayload) => createPoll(canalId, payload),
    retry: 0,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["canal", "messages", canalId] })
      void queryClient.invalidateQueries({ queryKey: ["canal", "polls", canalId] })
    },
  })
}

export function useVotePoll(canalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CanalVotePayload) => votePoll(payload),
    retry: 0,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["canal", "messages", canalId] })
      void queryClient.invalidateQueries({ queryKey: ["canal", "polls", canalId] })
    },
  })
}
