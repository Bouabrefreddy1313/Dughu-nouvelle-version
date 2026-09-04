import { ApiError } from "@/lib/api/api-error"
import { dughuServerMultipart } from "@/lib/api/server/dughu-instance"
import { normalizeGroupFeed } from "@/services/groups/group-feed.mapper"
import { normalizeUserGroups } from "@/services/groups/user-groups.mapper"
import {
  buildCreateGroupFormData,
  buildGroupImageFormData,
  normalizeCreateGroup,
  normalizeGroupCategories,
  normalizeGroupImageUpload,
} from "@/services/groups/create-group.mapper"
import { dughuServerGet } from "@/lib/api/server/dughu-instance"
import type { GroupFeedResponse } from "@/types/groups/group-feed.types"
import type { UserGroupsResponse } from "@/types/groups/user-groups.types"
import type { CreateGroupFields, GroupImageElement } from "@/types/groups/create-group.types"

interface FetchGroupFeedParams {
  userId: string
  page: number
  searchTerm?: string
}

export async function fetchPublicGroupFeed({
  userId,
  page,
  searchTerm = "",
}: FetchGroupFeedParams): Promise<GroupFeedResponse> {
  const formData = new FormData()
  formData.set("user_id", userId)
  formData.set("searchTerm", searchTerm.trim())

  try {
    const raw = await dughuServerMultipart<unknown>(
      `actualitePostsGroup?page=${Math.max(1, page)}`,
      formData,
      { retry: true }
    )
    const result = normalizeGroupFeed(raw)
    if (!result.success) {
      throw new ApiError("Impossible de charger les actualités des groupes.", { status: 502 })
    }
    return result
  } catch (error) {
    if (error instanceof ApiError && error.message === "Impossible de charger les actualités des groupes.") {
      throw error
    }
    throw new ApiError("Impossible de charger les actualités des groupes.", { cause: error })
  }
}

export async function fetchUserGroups({
  userId,
  page,
  searchTerm = "",
}: FetchGroupFeedParams): Promise<UserGroupsResponse> {
  const formData = new FormData()
  formData.set("user_id", userId)
  formData.set("searchTerm", searchTerm.trim())

  try {
    const raw = await dughuServerMultipart<unknown>(
      `usergroupes?page=${Math.max(1, page)}`,
      formData,
      { retry: true }
    )
    const result = normalizeUserGroups(raw)
    if (!result.success) {
      throw new ApiError("Impossible de charger vos groupes.", { status: 502 })
    }
    return result
  } catch (error) {
    if (error instanceof ApiError && error.message === "Impossible de charger vos groupes.") {
      throw error
    }
    throw new ApiError("Impossible de charger vos groupes.", { cause: error })
  }
}

export async function fetchGroupCategories() {
  try {
    const raw = await dughuServerGet<unknown>("getGroupCategories", undefined, { retry: true })
    const categories = normalizeGroupCategories(raw)
    if (categories.length === 0) throw new ApiError("Impossible de charger les catégories de groupes.", { status: 502 })
    return categories
  } catch (error) {
    if (error instanceof ApiError && error.message === "Impossible de charger les catégories de groupes.") throw error
    throw new ApiError("Impossible de charger les catégories de groupes.", { cause: error })
  }
}

export async function createGroup(userId: string, fields: CreateGroupFields) {
  try {
    const result = normalizeCreateGroup(await dughuServerMultipart<unknown>("group", buildCreateGroupFormData(userId, fields)))
    if (!result.success) throw new ApiError("Impossible de créer le groupe.", { status: 502 })
    return result
  } catch (error) {
    if (error instanceof ApiError && error.message === "Impossible de créer le groupe.") throw error
    throw new ApiError("Impossible de créer le groupe.", { cause: error })
  }
}

export async function uploadGroupImage(groupId: string, image: File, element: GroupImageElement) {
  try {
    const result = normalizeGroupImageUpload(
      await dughuServerMultipart<unknown>("page/uploadImage", buildGroupImageFormData(groupId, image, element))
    )
    if (!result.success) throw new ApiError(`Impossible d’envoyer ${element === "avatar" ? "l’avatar" : "la couverture"}.`, { status: 502 })
    return result
  } catch (error) {
    if (error instanceof ApiError && error.message.startsWith("Impossible d’envoyer")) throw error
    throw new ApiError(`Impossible d’envoyer ${element === "avatar" ? "l’avatar" : "la couverture"}.`, { cause: error })
  }
}
