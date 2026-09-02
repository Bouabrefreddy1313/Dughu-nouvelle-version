"use client"

/**
 * Hooks client « Canal » (TanStack Query).
 *
 * Utilise exclusivement les services frontend canal.service.ts.
 * Aucun fetch natif. Les mutations ne bénéficient d'aucun retry automatique.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchAllCanals,
  fetchCanalsByCategory,
  fetchMyCanals,
  fetchJoinedCanals,
  fetchSuggestCanals,
  fetchCanalDetail,
  fetchPossibleCategories,
  fetchAdherents,
  fetchCanalMedia,
  fetchCanalDocuments,
  joinOrRequestCanal,
  leaveCanal,
  createOrUpdateCanal,
  deleteCanal,
  updateCanalStatus,
  handleJoinRequest,
  handlePrivateCanal,
  reportCanal,
  toggleFavorite,
} from "@/services/canal/canal.service"
import type { Canal, CanalFormValues, CanalReportPayload } from "@/types/canal/canal.types"

export const CANALS_KEYS = {
  all: (params?: Record<string, unknown>) => ["canals", "all", params] as const,
  mine: (userId?: string, params?: Record<string, unknown>) => ["canals", "mine", userId, params] as const,
  joined: (userId?: string, params?: Record<string, unknown>) => ["canals", "joined", userId, params] as const,
  suggestions: (userId?: string, params?: Record<string, unknown>) => ["canals", "suggestions", userId, params] as const,
  byCategory: (catId?: string, params?: Record<string, unknown>) => ["canals", "category", catId, params] as const,
  detail: (canalId?: string) => ["canal", "detail", canalId] as const,
  categories: ["canals", "categories"] as const,
  members: (canalId?: string) => ["canal", "members", canalId] as const,
  media: (canalId?: string) => ["canal", "media", canalId] as const,
  documents: (canalId?: string) => ["canal", "documents", canalId] as const,
}

/* ─────────────────────────────── REQUÊTES ─────────────────────────────── */

export function useCanals(
  userId: string | undefined,
  options: { research?: string; categoryId?: string; page?: number; enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: CANALS_KEYS.all({ userId, ...options }),
    queryFn: ({ signal }) => fetchAllCanals(userId || "", { ...options, signal }),
    enabled: (options.enabled ?? true) && !!userId,
    staleTime: 30_000,
  })
}

export function useCanalDetail(canalId: string | undefined) {
  return useQuery({
    queryKey: CANALS_KEYS.detail(canalId),
    queryFn: ({ signal }) => fetchCanalDetail(canalId!, signal),
    enabled: !!canalId,
    staleTime: 30_000,
  })
}

export function usePossibleCategories() {
  return useQuery({
    queryKey: CANALS_KEYS.categories,
    queryFn: ({ signal }) => fetchPossibleCategories(signal),
    staleTime: 10 * 60_000,
  })
}

export function useCanalsByCategory(
  categoryId: string | undefined,
  userId: string | undefined,
  page = 1,
  enabled = true
) {
  return useQuery({
    queryKey: CANALS_KEYS.byCategory(categoryId, { userId, page }),
    queryFn: ({ signal }) => fetchCanalsByCategory(categoryId!, userId || "", page, signal),
    enabled: enabled && !!categoryId && !!userId,
    staleTime: 30_000,
  })
}

export function useMyCanals(
  userId: string | undefined,
  options: { page?: number; categoryId?: string; q?: string; sortBy?: string; enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: CANALS_KEYS.mine(userId, options),
    queryFn: ({ signal }) => fetchMyCanals(userId!, { ...options, signal }),
    enabled: (options.enabled ?? true) && !!userId,
    staleTime: 30_000,
  })
}

export function useJoinedCanals(
  userId: string | undefined,
  options: { page?: number; categoryId?: string; enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: CANALS_KEYS.joined(userId, options),
    queryFn: ({ signal }) => fetchJoinedCanals(userId!, { ...options, signal }),
    enabled: (options.enabled ?? true) && !!userId,
    staleTime: 30_000,
  })
}

export function useSuggestCanals(
  userId: string | undefined,
  options: { page?: number; categoryId?: string; enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: CANALS_KEYS.suggestions(userId, options),
    queryFn: ({ signal }) => fetchSuggestCanals(userId!, { ...options, signal }),
    enabled: (options.enabled ?? true) && !!userId,
    staleTime: 30_000,
  })
}

export function useCanalMembers(canalId: string | undefined) {
  return useQuery({
    queryKey: CANALS_KEYS.members(canalId),
    queryFn: ({ signal }) => fetchAdherents(canalId!, signal),
    enabled: !!canalId,
    staleTime: 30_000,
  })
}

export function useCanalMedia(canalId: string | undefined) {
  return useQuery({
    queryKey: CANALS_KEYS.media(canalId),
    queryFn: ({ signal }) => fetchCanalMedia(canalId!, signal),
    enabled: !!canalId,
    staleTime: 30_000,
  })
}

export function useCanalDocuments(canalId: string | undefined) {
  return useQuery({
    queryKey: CANALS_KEYS.documents(canalId),
    queryFn: ({ signal }) => fetchCanalDocuments(canalId!, signal),
    enabled: !!canalId,
    staleTime: 30_000,
  })
}

/* ─────────────────────────────── MUTATIONS ─────────────────────────────── */

function invalidateCanals(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["canals"] })
  void queryClient.invalidateQueries({ queryKey: ["canal"] })
}

/**
 * Toggle favori d'un canal avec mise à jour OPTIMISTE du cache.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, canalId, action }: { userId: string; canalId: string; action: "add" | "remove" }) =>
      toggleFavorite(userId, canalId, action),
    retry: 0,
    onMutate: async ({ canalId, action }) => {
      await queryClient.cancelQueries({ queryKey: CANALS_KEYS.detail(canalId) })
      const previous = queryClient.getQueryData<{ canal?: Canal }>(CANALS_KEYS.detail(canalId))
      if (previous?.canal) {
        queryClient.setQueryData<{ canal?: Canal }>(CANALS_KEYS.detail(canalId), {
          canal: { ...previous.canal, isFavorite: action === "add" },
        })
      }
      return { previous }
    },
    onError: (_err, { canalId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CANALS_KEYS.detail(canalId), context.previous)
      }
    },
    onSettled: (_data, _err, { canalId }) => {
      void queryClient.invalidateQueries({ queryKey: CANALS_KEYS.detail(canalId) })
      void queryClient.invalidateQueries({ queryKey: ["canals"] })
    },
  })
}

export function useJoinOrRequestCanal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, canalId, type }: { userId: string; canalId: string; type: "direct" | "request" }) =>
      joinOrRequestCanal(userId, canalId, type),
    retry: 0,
    onSettled: () => invalidateCanals(queryClient),
  })
}

export function useLeaveCanal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, canalId }: { userId: string; canalId: string }) => leaveCanal(userId, canalId),
    retry: 0,
    onSettled: () => invalidateCanals(queryClient),
  })
}

export function useCreateOrUpdateCanal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, values }: { userId: string; values: CanalFormValues }) =>
      createOrUpdateCanal(userId, values),
    retry: 0,
    onSettled: () => invalidateCanals(queryClient),
  })
}

export function useDeleteCanal(canalId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      deleteCanal(canalId, userId, password),
    retry: 0,
    onSettled: () => {
      invalidateCanals(queryClient)
      void queryClient.removeQueries({ queryKey: CANALS_KEYS.detail(canalId) })
    },
  })
}

export function useUpdateCanalStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, canalId, isActive }: { userId: string; canalId: string; isActive: boolean }) =>
      updateCanalStatus(userId, canalId, isActive),
    retry: 0,
    onSettled: () => invalidateCanals(queryClient),
  })
}

export function useHandleJoinRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, userId, accept }: { requestId: string; userId: string; accept: boolean }) =>
      handleJoinRequest(requestId, userId, accept),
    retry: 0,
    onSettled: () => invalidateCanals(queryClient),
  })
}

export function useHandlePrivateCanal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, inviteCode }: { userId: string; inviteCode: string }) =>
      handlePrivateCanal(userId, inviteCode),
    retry: 0,
    onSettled: () => invalidateCanals(queryClient),
  })
}

export function useReportCanal() {
  return useMutation({
    mutationFn: (payload: CanalReportPayload) => reportCanal(payload),
    retry: 0,
  })
}
