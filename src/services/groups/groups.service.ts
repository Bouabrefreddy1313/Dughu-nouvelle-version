import { apiClient } from "@/lib/api/client/axios-instance"
import { ApiError } from "@/lib/api/api-error"
import type { GroupFeedResponse } from "@/types/groups/group-feed.types"
import type { UserGroupsResponse } from "@/types/groups/user-groups.types"
import type {
  CreateGroupFields,
  CreateGroupResponse,
  GroupCategory,
  GroupImageElement,
  UploadGroupImageResponse,
} from "@/types/groups/create-group.types"

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

export async function fetchGroupCategories(signal?: AbortSignal): Promise<GroupCategory[]> {
  try {
    const response = await apiClient.get<{ success: boolean; categories: GroupCategory[] }>("/groups/categories", { signal })
    return response.data.categories
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de charger les catégories de groupes.", { cause: error })
  }
}

export async function createGroup(fields: CreateGroupFields, signal?: AbortSignal): Promise<CreateGroupResponse> {
  try {
    const response = await apiClient.post<CreateGroupResponse>("/groups", fields, { signal })
    return response.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Impossible de créer le groupe.", { cause: error })
  }
}

export async function uploadGroupImage(
  groupId: string,
  image: File,
  element: GroupImageElement,
  signal?: AbortSignal
): Promise<UploadGroupImageResponse> {
  const formData = new FormData()
  formData.set("page_id", groupId)
  formData.set("image", image)
  formData.set("element", element)
  try {
    const response = await apiClient.post<UploadGroupImageResponse>("/groups/images", formData, { signal })
    return response.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(`Impossible d’envoyer ${element === "avatar" ? "l’avatar" : "la couverture"}.`, { cause: error })
  }
}
