export interface GroupFeedAuthor {
  id: string
  name: string
  username: string
  avatar: string | null
  verified: boolean
  isFollowing: boolean
  interactionsCount: number
}

export interface GroupFeedGroup {
  id: string
  slug: string
  name: string
  avatar: string | null
  cover: string | null
  privacy: string
  isMember: boolean
}

export interface GroupFeedColor {
  background: string
  backgroundSecondary: string
  text: string
}

export interface GroupFeedMedia {
  id: string
  url: string
  type: "image" | "video" | "audio"
  thumbnail?: string | null
}

export interface GroupFeedReactionSummary {
  type: string
  count: number
}

export interface GroupFeedPost {
  id: string
  content: string
  createdAt: string
  privacy: string
  shareUrl: string | null
  media: GroupFeedMedia[]
  color: GroupFeedColor | null
  author: GroupFeedAuthor
  group: GroupFeedGroup
  likesCount: number
  commentsCount: number
  sharesCount: number
  repostsCount: number
  viewsCount: number
  interactionsCount: number
  reactions: GroupFeedReactionSummary[]
  isLiked: boolean
  reactionType: string | null
  isSaved: boolean
  isPinned: boolean
}

export interface GroupFeedPagination {
  currentPage: number
  perPage: number
  total: number
  lastPage: number
  hasMore: boolean
}

export interface GroupFeedResponse {
  success: boolean
  message?: string
  posts: GroupFeedPost[]
  pagination: GroupFeedPagination
}