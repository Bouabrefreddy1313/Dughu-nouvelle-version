import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchPrivacySettings,
  updatePrivacySettings,
} from "@/services/profile/profile.service"
import type { PrivacySettings } from "@/types/profile/profile.types"

export const PRIVACY_SETTINGS_QUERY_KEY = ["profile", "privacy"] as const

export function usePrivacySettings() {
  return useQuery({
    queryKey: PRIVACY_SETTINGS_QUERY_KEY,
    queryFn: ({ signal }) => fetchPrivacySettings(signal),
    staleTime: 60_000,
  })
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: PrivacySettings) => updatePrivacySettings(settings),
    onSuccess: (response) => {
      queryClient.setQueryData(PRIVACY_SETTINGS_QUERY_KEY, response)
    },
  })
}
