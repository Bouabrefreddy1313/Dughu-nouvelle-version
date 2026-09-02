import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { GroupFeedResponse } from "@/types/groups/group-feed.types"
import type { UserGroupsResponse } from "@/types/groups/user-groups.types"

interface FetchGroupFeedParams {
  page: number
  searchTerm?: string
  signal?: AbortSignal
}

export async function fetchPublicGroupFeed({
  page,
  searchTerm = "",
  signal,
}: FetchGroupFeedParams): Promise<GroupFeedResponse> {
  const searchParams = new URLSearchParams({ page: String(Math.max(1, page)) })
  if (searchTerm.trim()) searchParams.set("searchTerm", searchTerm.trim())

  try {
    const response = await apiClient.get<GroupFeedResponse>(
      `/groups/feed?${searchParams.toString()}`,
      { signal }
    )
    return response.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de charger les actualités des groupes.", { cause: error })
  }
}

export async function fetchUserGroups({
  page,
  searchTerm = "",
  signal,
}: FetchGroupFeedParams): Promise<UserGroupsResponse> {
  const searchParams = new URLSearchParams({ page: String(Math.max(1, page)) })
  if (searchTerm.trim()) searchParams.set("searchTerm", searchTerm.trim())

  try {
    const response = await apiClient.get<UserGroupsResponse>(
      `/groups/mine?${searchParams.toString()}`,
      { signal }
    )
    return response.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de charger vos groupes.", { cause: error })
  }
}