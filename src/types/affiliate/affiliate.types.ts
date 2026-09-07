export interface AffiliateUser {
  id: string
  name: string
  username: string | null
  avatar: string | null
  registeredDate: string | null
  rawDate: string | null
}

export interface AffiliatePagination {
  currentPage: number
  lastPage: number
  total: number
  perPage: number
}

export interface AffiliateDetails {
  shareLink: string
  userId: string
  name: string
  username: string | null
  avatar: string | null
}

export interface AffiliateInfoResponse {
  success: boolean
  message?: string
  details: AffiliateDetails
}

export interface AffiliateUsersResponse {
  success: boolean
  message?: string
  users: AffiliateUser[]
  pagination: AffiliatePagination
}
