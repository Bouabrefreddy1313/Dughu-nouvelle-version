/**
 * Hooks TanStack Query pour le module Finance de Dughu.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchFinanceList,
  fetchUserFinanceList,
  fetchFinanceDetail,
  submitFinance,
  deleteFinance,
  donateToFinance,
} from "@/services/finance/finance.service"
import type {
  FinanceQueryParams,
  CreateFinanceInput,
  FinanceDonationInput,
} from "@/types/finance/finance.types"

export const FINANCE_KEYS = {
  all: ["finance"] as const,
  lists: () => [...FINANCE_KEYS.all, "list"] as const,
  list: (params: FinanceQueryParams) => [...FINANCE_KEYS.lists(), params] as const,
  userLists: () => [...FINANCE_KEYS.all, "user-list"] as const,
  userList: (userId: string, params: FinanceQueryParams) =>
    [...FINANCE_KEYS.userLists(), userId, params] as const,
  details: () => [...FINANCE_KEYS.all, "detail"] as const,
  detail: (id: string) => [...FINANCE_KEYS.details(), id] as const,
}

/**
 * Hook de récupération des demandes de financement globales (onglet Parcourir).
 */
export function useFinanceList(params: FinanceQueryParams = {}) {
  return useQuery({
    queryKey: FINANCE_KEYS.list(params),
    queryFn: ({ signal }) => fetchFinanceList(params, signal),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook de récupération des demandes de financement de l'utilisateur (onglet Mes demandes).
 */
export function useUserFinanceList(userId: string, params: FinanceQueryParams = {}) {
  return useQuery({
    queryKey: FINANCE_KEYS.userList(userId, params),
    queryFn: ({ signal }) => fetchUserFinanceList(userId, params, signal),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook de récupération des détails d'un financement.
 */
export function useFinanceDetail(id: string) {
  return useQuery({
    queryKey: FINANCE_KEYS.detail(id),
    queryFn: ({ signal }) => fetchFinanceDetail(id, signal),
    enabled: Boolean(id),
    staleTime: 1000 * 30, // 30 secondes
  })
}

/**
 * Mutation pour créer ou modifier une demande de financement.
 */
export function useSubmitFinanceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateFinanceInput) => submitFinance(input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.lists() })
      void queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.userLists() })
      if (variables.financeId) {
        void queryClient.invalidateQueries({
          queryKey: FINANCE_KEYS.detail(variables.financeId),
        })
      }
    },
  })
}

/**
 * Mutation pour supprimer une demande de financement.
 */
export function useDeleteFinanceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteFinance(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.lists() })
      void queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.userLists() })
      void queryClient.removeQueries({ queryKey: FINANCE_KEYS.detail(id) })
    },
  })
}

/**
 * Mutation pour effectuer un don.
 */
export function useDonateFinanceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: FinanceDonationInput) => donateToFinance(input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: FINANCE_KEYS.detail(variables.fundingId),
      })
      void queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.lists() })
      void queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.userLists() })
    },
  })
}
