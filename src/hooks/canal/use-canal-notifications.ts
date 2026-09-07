"use client"

/**
 * Hooks TanStack Query pour les notifications de canal.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchReceivedNotifications,
  fetchProcessedNotifications,
  deleteNotification,
} from "@/services/canal/canal.service"

export function useReceivedNotifications(
  userId: string | undefined,
  canalId: string | undefined,
  page = 1
) {
  return useQuery({
    queryKey: ["canal", "notifications", "received", userId, canalId, page],
    queryFn: ({ signal }) => fetchReceivedNotifications(userId!, canalId!, page, signal),
    enabled: !!userId && !!canalId,
    staleTime: 15_000,
  })
}

export function useProcessedNotifications(
  userId: string | undefined,
  canalId: string | undefined,
  page = 1
) {
  return useQuery({
    queryKey: ["canal", "notifications", "processed", userId, canalId, page],
    queryFn: ({ signal }) => fetchProcessedNotifications(userId!, canalId!, page, signal),
    enabled: !!userId && !!canalId,
    staleTime: 15_000,
  })
}

export function useDeleteNotification(canalId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ notificationId, userId }: { notificationId: string; userId?: string }) =>
      deleteNotification(notificationId, { userId, canalId }),
    retry: 0,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["canal", "notifications"] })
    },
  })
}
