import { useQuery } from "@tanstack/react-query"
import {
  fetchAffiliateInfo,
  fetchAffiliateUsers,
} from "@/services/affiliate/affiliate.service"
import type {
  AffiliateInfoResponse,
  AffiliateUsersResponse,
} from "@/types/affiliate/affiliate.types"

/**
 * Hook pour récupérer les infos d'affiliation et le lien de promotion.
 */
export function useAffiliateInfo(params: { userId?: string; enabled?: boolean } = {}) {
  const userId = params.userId
  const enabled = params.enabled !== false && !!userId

  return useQuery<AffiliateInfoResponse>({
    queryKey: ["affiliateInfo", userId ?? ""],
    queryFn: ({ signal }) => fetchAffiliateInfo({ userId }, signal),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook pour récupérer les utilisateurs inscrits via le lien d'affiliation avec pagination.
 */
export function useAffiliateUsers(params: {
  userId?: string
  page?: number
  enabled?: boolean
} = {}) {
  const userId = params.userId
  const page = params.page || 1
  const enabled = params.enabled !== false && !!userId

  return useQuery<AffiliateUsersResponse>({
    queryKey: ["affiliateUsers", userId ?? "", page],
    queryFn: ({ signal }) => fetchAffiliateUsers({ userId, page }, signal),
    enabled,
    staleTime: 60 * 1000,
  })
}
