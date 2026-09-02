export interface UserGroup {
  id: string
  ownerId: string
  slug: string
  name: string
  avatar: string | null
  cover: string | null
  description: string
  categoryId: string
  category: string
  membersCount: number
  privacy: "public" | "private"
  joinPrivacy: string
  isMember: boolean
}

export interface UserGroupsPagination {
  currentPage: number
  perPage: number
  total: number
  lastPage: number
  hasMore: boolean
}

export interface UserGroupsResponse {
  success: boolean
  message?: string
  groups: UserGroup[]
  pagination: UserGroupsPagination
}