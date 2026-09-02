"use client"

/**
 * Hooks TanStack Query pour la messagerie d'un canal.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchCanalMessages,
  sendCanalMessage,
  updateCanalMessage,
  deleteCanalMessage,
  reactCanalMessage,
} from "@/services/canal/canal.service"
import type { CanalMessagePayload } from "@/types/canal/canal.types"

export const CANAL_MESSAGES_KEY = (canalId?: string, page = 1) =>
  ["canal", "messages", canalId, page] as const

export function useCanalMessages(
  canalId: string | undefined,
  userId: string | undefined,
  page = 1,
  enabled = true
) {
  return useQuery({
    queryKey: CANAL_MESSAGES_KEY(canalId, page),
    queryFn: ({ signal }) => fetchCanalMessages(canalId!, userId || "", page, signal),
    enabled: enabled && !!canalId && !!userId,
    staleTime: 5_000,
  })
}

export function useSendCanalMessage(canalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CanalMessagePayload) => sendCanalMessage(canalId, payload),
    retry: 0,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["canal", "messages", canalId] })
    },
  })
}

export function useUpdateCanalMessage(messageId: string, canalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CanalMessagePayload) => updateCanalMessage(messageId, payload),
    retry: 0,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["canal", "messages", canalId] })
    },
  })
}

export function useDeleteCanalMessage(messageId: string, canalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteCanalMessage(messageId),
    retry: 0,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["canal", "messages", canalId] })
    },
  })
}

export function useReactCanalMessage(canalId: string, messageId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, reaction }: { userId: string; reaction: string }) =>
      reactCanalMessage(canalId, messageId, userId, reaction),
    retry: 0,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["canal", "messages", canalId] })
    },
  })
}
