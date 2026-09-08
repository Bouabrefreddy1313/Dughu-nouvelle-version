/**
 * Types du domaine Événements de Dughu.
 */

export interface EventOrganizer {
  id: string
  name: string
  avatar: string
  username?: string
}

export interface DughuEvent {
  id: string
  name: string
  location: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  posterId: string
  cover: string
  coverPath: string
  createdAt: string
  updatedAt: string
  isPassed: boolean
  isInterested: boolean
  isGoing: boolean
  organizer: EventOrganizer
  shareLink?: string
  shareFacebook?: string
  shareTwitter?: string
  shareLinkedin?: string
  shareWhatsapp?: string
  interestedCount?: number
  goingCount?: number
}

export interface EventsQueryParams {
  category?: string
  q?: string
  page?: number
}

export interface CreateEventInput {
  name: string
  location: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  cover?: File | null
  userId?: string
  eventId?: string
}

export interface EventInviteInput {
  eventId: string
  userId: string // Inviter (current logged in user)
  userInviteId: string // Friend to invite
}

export interface InvitedUser {
  id: string
  name: string
  avatar: string
  username?: string
}

export interface EventsListResponse {
  success: boolean
  events: DughuEvent[]
  total?: number
  currentPage?: number
  lastPage?: number
  message?: string
}

export interface EventDetailResponse {
  success: boolean
  event: DughuEvent | null
  message?: string
}

export interface EventToggleResponse {
  success: boolean
  message: string
  isActionActive?: boolean
  isGoing?: boolean
  isInterested?: boolean
}

export interface EventMutationResponse {
  success: boolean
  message: string
  eventId?: string
}

export interface EventInvitedListResponse {
  success: boolean
  invitedUsers: InvitedUser[]
  message?: string
}
